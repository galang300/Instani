from app.sources.bapanas import fetch_bapanas_prices
from app.sources.pihps import refresh_pihps_cache


async def sync_all_sources():
    bapanas = await fetch_bapanas_prices()
    pihps = await refresh_pihps_cache()
    return {
        "synced": True,
        "totalItems": len(bapanas["items"]) + len(pihps["items"]),
        "sources": [bapanas, pihps],
    }
