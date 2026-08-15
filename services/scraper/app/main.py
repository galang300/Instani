from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.jobs.sync_prices import sync_all_sources
from app.sources.bapanas import fetch_bapanas_prices
from app.sources.pihps import (
    fetch_pihps_references,
    get_cached_pihps_prices,
    get_pihps_cache,
    start_pihps_auto_refresh,
    stop_pihps_auto_refresh,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    start_pihps_auto_refresh()
    yield
    await stop_pihps_auto_refresh()


app = FastAPI(title="PanganTerkini Scraper", version="0.1.0", lifespan=lifespan)


@app.get("/health")
def health():
    return {"ok": True, "pihpsCache": get_pihps_cache()}


@app.get("/scrape/bapanas")
async def scrape_bapanas():
    return await fetch_bapanas_prices()


@app.get("/scrape/pihps")
async def scrape_pihps(force: bool = False):
    return await get_cached_pihps_prices(force=force)


@app.get("/scrape/pihps/references")
async def scrape_pihps_references():
    return await fetch_pihps_references()


@app.post("/sync")
async def sync_prices():
    return await sync_all_sources()
