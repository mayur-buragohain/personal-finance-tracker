import time
from typing import Any

import httpx

from config import settings


class OpsRampAuth:
    def __init__(self) -> None:
        self._token: str | None = None
        self._expires_at: float = 0

    def get_token(self) -> str:
        if self._token and time.time() < self._expires_at - 60:
            return self._token

        endpoint = settings.opsramp_api_endpoint.rstrip("/")
        url = f"{endpoint}/tenancy/oauth/token"
        response = httpx.post(
            url,
            data={
                "grant_type": "client_credentials",
                "client_id": settings.opsramp_key,
                "client_secret": settings.opsramp_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
        self._token = payload["access_token"]
        self._expires_at = time.time() + int(payload.get("expires_in", 3600))
        return self._token


auth = OpsRampAuth()
