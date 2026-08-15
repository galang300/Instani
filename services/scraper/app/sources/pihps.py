import asyncio
import hashlib
import json
import os
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any
from urllib.parse import urljoin, urlparse
from zoneinfo import ZoneInfo

import httpx

DATE_COLUMN_RE = re.compile(r"^\d{2}/\d{2}/\d{4}$")

_CACHE_LOCK = asyncio.Lock()
_CACHE: dict[str, Any] = {
    "payload": None,
    "signature": None,
    "updatedAt": None,
    "lastChangedAt": None,
    "lastError": None,
}
_REFRESH_TASK: asyncio.Task | None = None


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def _source_url() -> str:
    return os.getenv("PIHPS_SOURCE_URL", "https://www.bi.go.id/hargapangan").rstrip("/")


def _endpoint_url(path: str) -> str:
    parsed = urlparse(_source_url())
    base_path = parsed.path.rstrip("/") or "/hargapangan"
    origin = f"{parsed.scheme}://{parsed.netloc}"
    return urljoin(origin, f"{base_path}{path}")


def _jakarta_today() -> date:
    timezone_name = os.getenv("PIHPS_TIMEZONE", "Asia/Jakarta")
    return datetime.now(ZoneInfo(timezone_name)).date()


def _default_date_range() -> tuple[str, str]:
    end_date = _jakarta_today()
    start_date = end_date - timedelta(days=_env_int("PIHPS_LOOKBACK_DAYS", 8))
    return start_date.isoformat(), end_date.isoformat()


def _parse_price(raw_value: Any) -> int | None:
    if raw_value in (None, "", "-"):
        return None

    value = str(raw_value).strip()
    if not value:
        return None

    digits = re.sub(r"[^\d]", "", value)
    if not digits:
        return None

    return int(digits)


def _parse_date_column(raw_date: str) -> str:
    return datetime.strptime(raw_date, "%d/%m/%Y").date().isoformat()


def _payload_signature(items: list[dict[str, Any]]) -> str:
    serialized = json.dumps(items, ensure_ascii=True, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _normalize_grid_rows(
    rows: list[dict[str, Any]],
    *,
    province: str,
    regency: str,
    sampled_at: str,
    include_category_rows: bool,
) -> tuple[list[dict[str, Any]], str | None]:
    items: list[dict[str, Any]] = []
    latest_available_date: str | None = None
    current_category: str | None = None

    for row in rows:
        level = int(row.get("level") or 0)
        commodity = str(row.get("name") or "").strip()
        if not commodity:
            continue

        if level == 1:
            current_category = commodity
            if not include_category_rows:
                continue

        history = []
        for key, raw_value in row.items():
            if not DATE_COLUMN_RE.match(str(key)):
                continue
            price = _parse_price(raw_value)
            if price is None:
                continue
            iso_date = _parse_date_column(str(key))
            history.append({"date": iso_date, "pricePerKg": price})

        if not history:
            continue

        latest = max(history, key=lambda item: item["date"])
        if latest_available_date is None or latest["date"] > latest_available_date:
            latest_available_date = latest["date"]

        items.append(
            {
                "commodity": commodity,
                "pricePerKg": latest["pricePerKg"],
                "province": province,
                "regency": regency,
                "sampledAt": latest["date"],
                "scrapedAt": sampled_at,
                "source": "PIHPS",
                "denomination": "kg",
                "level": level,
                "category": commodity if level == 1 else current_category,
                "history": history,
            }
        )

    return items, latest_available_date


async def _get_json(client: httpx.AsyncClient, path: str, params: dict[str, Any] | None = None):
    response = await client.get(_endpoint_url(path), params=params)
    response.raise_for_status()
    return response.json()


async def fetch_pihps_prices(
    *,
    start_date: str | None = None,
    end_date: str | None = None,
    province_id: str | None = None,
    province_name: str | None = None,
    regency_id: str | None = None,
    regency_name: str | None = None,
    comcat_id: str | None = None,
    include_category_rows: bool | None = None,
):
    default_start_date, default_end_date = _default_date_range()
    start_date = start_date or default_start_date
    end_date = end_date or default_end_date
    province_id = province_id if province_id is not None else os.getenv("PIHPS_PROVINCE_ID", "16")
    province_name = province_name or os.getenv("PIHPS_PROVINCE_NAME", "Jawa Timur")
    regency_id = regency_id if regency_id is not None else os.getenv("PIHPS_REGENCY_ID", "")
    regency_name = regency_name or os.getenv("PIHPS_REGENCY_NAME", "Semua Kabupaten/Kota")
    comcat_id = comcat_id if comcat_id is not None else os.getenv("PIHPS_COMCAT_ID", "")
    include_category_rows = (
        _env_bool("PIHPS_INCLUDE_CATEGORY_ROWS", True)
        if include_category_rows is None
        else include_category_rows
    )

    params = {
        "price_type_id": os.getenv("PIHPS_PRICE_TYPE_ID", "1"),
        "comcat_id": comcat_id,
        "province_id": province_id,
        "regency_id": regency_id,
        "market_id": os.getenv("PIHPS_MARKET_ID", ""),
        "tipe_laporan": os.getenv("PIHPS_REPORT_TYPE_ID", "1"),
        "start_date": start_date,
        "end_date": end_date,
    }
    sampled_at = datetime.now(timezone.utc).isoformat()

    timeout_seconds = _env_int("PIHPS_TIMEOUT_SECONDS", 20)
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Referer": _endpoint_url("/TabelHarga/PasarTradisionalDaerah"),
        "User-Agent": "PanganTerkini/0.1 (+https://www.bi.go.id/hargapangan)",
    }

    async with httpx.AsyncClient(timeout=timeout_seconds, headers=headers) as client:
        grid_payload = await _get_json(client, "/WebSite/TabelHarga/GetGridDataDaerah", params)

    rows = grid_payload.get("data", [])
    if not isinstance(rows, list):
        rows = []

    items, latest_available_date = _normalize_grid_rows(
        rows,
        province=province_name,
        regency=regency_name,
        sampled_at=sampled_at,
        include_category_rows=include_category_rows,
    )

    return {
        "source": "PIHPS",
        "sourceUrl": _source_url(),
        "endpointUrl": _endpoint_url("/WebSite/TabelHarga/GetGridDataDaerah"),
        "sampledAt": sampled_at,
        "latestAvailableDate": latest_available_date,
        "dateRange": {"start": start_date, "end": end_date},
        "filters": {
            "priceTypeId": params["price_type_id"],
            "commodityOrCategoryId": comcat_id,
            "provinceId": province_id,
            "province": province_name,
            "regencyId": regency_id,
            "regency": regency_name,
            "marketId": params["market_id"],
            "reportTypeId": params["tipe_laporan"],
            "includeCategoryRows": include_category_rows,
        },
        "itemCount": len(items),
        "items": items,
        "mode": "live-json-scraper",
    }


async def fetch_pihps_references():
    timeout_seconds = _env_int("PIHPS_TIMEOUT_SECONDS", 20)
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Referer": _source_url(),
        "User-Agent": "PanganTerkini/0.1 (+https://www.bi.go.id/hargapangan)",
    }

    async with httpx.AsyncClient(timeout=timeout_seconds, headers=headers) as client:
        provinces, commodities = await asyncio.gather(
            _get_json(client, "/WebSite/TabelHarga/GetRefProvince"),
            _get_json(client, "/WebSite/TabelHarga/GetRefCommodityAndCategory"),
        )

    return {
        "source": "PIHPS",
        "sourceUrl": _source_url(),
        "sampledAt": datetime.now(timezone.utc).isoformat(),
        "provinces": provinces.get("data", []),
        "commodities": commodities.get("data", []),
        "mode": "live-json-scraper",
    }


def get_pihps_cache():
    payload = _CACHE.get("payload")
    return {
        "ready": payload is not None,
        "updatedAt": _CACHE.get("updatedAt"),
        "lastChangedAt": _CACHE.get("lastChangedAt"),
        "lastError": _CACHE.get("lastError"),
        "signature": _CACHE.get("signature"),
        "itemCount": len(payload.get("items", [])) if payload else 0,
    }


async def refresh_pihps_cache():
    async with _CACHE_LOCK:
        payload = await fetch_pihps_prices()
        signature = _payload_signature(payload["items"])
        now = datetime.now(timezone.utc).isoformat()
        changed = signature != _CACHE.get("signature")

        _CACHE.update(
            {
                "payload": {
                    **payload,
                    "cache": {
                        "hit": False,
                        "updatedAt": now,
                        "changed": changed,
                    },
                },
                "signature": signature,
                "updatedAt": now,
                "lastChangedAt": now if changed else _CACHE.get("lastChangedAt"),
                "lastError": None,
            }
        )
        return _CACHE["payload"]


async def get_cached_pihps_prices(*, force: bool = False):
    if force or _CACHE.get("payload") is None:
        return await refresh_pihps_cache()

    cached_payload = _CACHE["payload"]
    return {
        **cached_payload,
        "cache": {
            **cached_payload.get("cache", {}),
            "hit": True,
            "updatedAt": _CACHE.get("updatedAt"),
            "lastChangedAt": _CACHE.get("lastChangedAt"),
        },
    }


async def _auto_refresh_loop():
    while True:
        try:
            await refresh_pihps_cache()
        except Exception as exc:  # pragma: no cover - defensive background task
            _CACHE["lastError"] = str(exc)

        await asyncio.sleep(max(_env_int("PIHPS_SYNC_INTERVAL_SECONDS", 900), 60))


def start_pihps_auto_refresh():
    global _REFRESH_TASK
    if not _env_bool("PIHPS_AUTO_SYNC", True):
        return None
    if _REFRESH_TASK is None or _REFRESH_TASK.done():
        _REFRESH_TASK = asyncio.create_task(_auto_refresh_loop())
    return _REFRESH_TASK


async def stop_pihps_auto_refresh():
    global _REFRESH_TASK
    if _REFRESH_TASK is None:
        return

    _REFRESH_TASK.cancel()
    try:
        await _REFRESH_TASK
    except asyncio.CancelledError:
        pass
    finally:
        _REFRESH_TASK = None
