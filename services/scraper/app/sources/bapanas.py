import os
from datetime import datetime, timezone


async def fetch_bapanas_prices():
    source_url = os.getenv("BAPANAS_SOURCE_URL", "https://panelharga.badanpangan.go.id/")
    return {
        "source": "BAPANAS",
        "sourceUrl": source_url,
        "sampledAt": datetime.now(timezone.utc).isoformat(),
        "items": [
            {
                "commodity": "Beras Medium",
                "pricePerKg": 13400,
                "province": "Jawa Timur",
                "regency": "Tulungagung",
            },
            {
                "commodity": "Cabai Rawit",
                "pricePerKg": 40200,
                "province": "Jawa Timur",
                "regency": "Tulungagung",
            },
        ],
        "mode": "mock-ready-for-playwright",
    }
