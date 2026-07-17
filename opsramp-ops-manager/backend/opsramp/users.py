from typing import Any

from config import settings
from opsramp.client import MOCK_GROUPS, MOCK_ROLES, MOCK_USERS, client


def list_roles() -> list[dict[str, Any]]:
    if settings.opsramp_mock:
        return MOCK_ROLES

    data = client.request(
        "GET",
        f"/api/v2/tenants/{client.tenant_id}/roles/search",
        params={"pageSize": 200},
    )
    return data.get("results", data) if isinstance(data, dict) else data


def list_user_groups() -> list[dict[str, Any]]:
    if settings.opsramp_mock:
        return MOCK_GROUPS

    data = client.request(
        "GET",
        f"/api/v2/tenants/{client.tenant_id}/userGroups",
        params={"pageSize": 200},
    )
    return data.get("results", [])


def search_users(query: str) -> list[dict[str, Any]]:
    if settings.opsramp_mock:
        q = query.lower()
        return [
            u
            for u in MOCK_USERS
            if q in u["loginName"].lower()
            or q in u["email"].lower()
            or q in u["firstName"].lower()
            or q in u["lastName"].lower()
        ]

    data = client.request(
        "GET",
        f"/api/v2/tenants/{client.tenant_id}/users/search",
        params={"query": query, "pageSize": 50},
    )
    return data.get("results", [])


def get_user(user_id: str) -> dict[str, Any]:
    if settings.opsramp_mock:
        for u in MOCK_USERS:
            if u["uniqueId"] == user_id:
                return u
        raise ValueError("User not found")

    return client.request(
        "GET",
        f"/api/v2/tenants/{client.tenant_id}/users/{user_id}",
    )


def create_user(payload: dict[str, Any]) -> dict[str, Any]:
    if settings.opsramp_mock:
        new_user = {
            "uniqueId": f"usr-{len(MOCK_USERS) + 1}",
            **payload,
            "roles": [{"name": r} for r in payload.get("roles", [])],
            "userGroups": [{"name": g} for g in payload.get("userGroups", [])],
        }
        MOCK_USERS.append(new_user)
        return new_user

    body = {
        "loginName": payload["loginName"],
        "email": payload["email"],
        "firstName": payload.get("firstName", ""),
        "lastName": payload.get("lastName", ""),
        "roles": [{"name": r} for r in payload.get("roles", [])],
        "userGroups": [{"name": g} for g in payload.get("userGroups", [])],
    }
    if payload.get("userGroupType"):
        body["userGroupType"] = payload["userGroupType"]

    return client.request(
        "POST",
        f"/api/v2/tenants/{client.tenant_id}/users",
        json=body,
    )


def update_user(user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    if settings.opsramp_mock:
        user = get_user(user_id)
        if "roles" in payload:
            user["roles"] = [{"name": r} for r in payload["roles"]]
        if "userGroups" in payload:
            user["userGroups"] = [{"name": g} for g in payload["userGroups"]]
        return user

    body: dict[str, Any] = {}
    if "roles" in payload:
        body["roles"] = [{"name": r} for r in payload["roles"]]
    if "userGroups" in payload:
        body["userGroups"] = [{"name": g} for g in payload["userGroups"]]

    return client.request(
        "PUT",
        f"/api/v2/tenants/{client.tenant_id}/users/{user_id}",
        json=body,
    )
