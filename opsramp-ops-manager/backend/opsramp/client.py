from typing import Any

import httpx

from config import settings
from opsramp.auth import auth

MOCK_ROLES = [
    {"uniqueId": "role-1", "name": "Operator"},
    {"uniqueId": "role-2", "name": "Admin"},
    {"uniqueId": "role-3", "name": "Viewer"},
]

MOCK_GROUPS = [
    {"uniqueId": "grp-1", "name": "NOC Team"},
    {"uniqueId": "grp-2", "name": "Platform Admins"},
    {"uniqueId": "grp-3", "name": "Read Only"},
]

MOCK_USERS = [
    {
        "uniqueId": "usr-1",
        "loginName": "jdoe",
        "email": "jdoe@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "roles": [{"name": "Operator"}],
        "userGroups": [{"name": "NOC Team"}],
    },
    {
        "uniqueId": "usr-2",
        "loginName": "asmith",
        "email": "asmith@example.com",
        "firstName": "Alice",
        "lastName": "Smith",
        "roles": [{"name": "Admin"}],
        "userGroups": [{"name": "Platform Admins"}],
    },
]

MOCK_DEVICES = [
    {
        "id": "dev-1",
        "name": "srv-prod-01",
        "hostName": "srv-prod-01",
        "ipAddress": "10.1.2.3",
        "resourceType": "Linux",
        "tags": [{"name": "Asset Tag", "value": "AT-001"}],
    },
    {
        "id": "dev-2",
        "name": "srv-prod-02",
        "hostName": "srv-prod-02",
        "ipAddress": "10.1.2.4",
        "resourceType": "Windows",
        "tags": [{"name": "Environment", "value": "Production"}],
    },
]

MOCK_TAGS = [
    {"uniqueId": "tag-1", "name": "Asset Tag"},
    {"uniqueId": "tag-2", "name": "Environment"},
    {"uniqueId": "tag-3", "name": "Owner"},
]


class OpsRampClient:
    def __init__(self) -> None:
        self.tenant_id = settings.opsramp_tenant_id
        self.base = settings.opsramp_api_endpoint.rstrip("/")

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {auth.get_token()}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def _url(self, path: str) -> str:
        return f"{self.base}{path}"

    def request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
    ) -> Any:
        if settings.opsramp_mock:
            raise RuntimeError("Mock mode: use service methods directly")

        response = httpx.request(
            method,
            self._url(path),
            headers=self._headers(),
            params=params,
            json=json,
            timeout=60,
        )
        if response.status_code == 204:
            return None
        if response.status_code >= 400:
            detail = response.text
            try:
                detail = response.json()
            except Exception:
                pass
            raise httpx.HTTPStatusError(
                f"OpsRamp API error {response.status_code}: {detail}",
                request=response.request,
                response=response,
            )
        if not response.content:
            return None
        return response.json()


client = OpsRampClient()
