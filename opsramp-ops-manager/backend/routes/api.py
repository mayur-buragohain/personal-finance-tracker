from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

import audit
from opsramp import devices, users
from routes.auth import get_current_user

router = APIRouter(prefix="/api", tags=["ops"])


class CreateUserRequest(BaseModel):
    loginName: str = Field(min_length=1)
    email: str
    firstName: str = ""
    lastName: str = ""
    roles: list[str] = []
    userGroups: list[str] = []


class UpdateUserRequest(BaseModel):
    roles: list[str] | None = None
    userGroups: list[str] | None = None


class SetAttributeRequest(BaseModel):
    resourceId: str
    attributeName: str
    attributeValue: str


def _handle_opsramp_error(exc: Exception, operator: str, operation: str, target: str) -> None:
    audit.log_operation(operator, operation, target, "failed", {"error": str(exc)})
    if isinstance(exc, httpx.HTTPStatusError):
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/config")
def app_config(user: Annotated[str, Depends(get_current_user)]) -> dict:
    from config import settings

    return {
        "mockMode": settings.opsramp_mock,
        "tenantConfigured": bool(settings.opsramp_tenant_id),
    }


@router.get("/roles")
def list_roles(user: Annotated[str, Depends(get_current_user)]) -> list:
    try:
        return users.list_roles()
    except Exception as exc:
        _handle_opsramp_error(exc, user, "list_roles", "catalog")


@router.get("/user-groups")
def list_user_groups(user: Annotated[str, Depends(get_current_user)]) -> list:
    try:
        return users.list_user_groups()
    except Exception as exc:
        _handle_opsramp_error(exc, user, "list_user_groups", "catalog")


@router.get("/users/search")
def search_users(
    q: str,
    user: Annotated[str, Depends(get_current_user)],
) -> list:
    if len(q.strip()) < 2:
        return []
    try:
        return users.search_users(q.strip())
    except Exception as exc:
        _handle_opsramp_error(exc, user, "search_users", q)


@router.get("/users/{user_id}")
def get_user(
    user_id: str,
    user: Annotated[str, Depends(get_current_user)],
) -> dict:
    try:
        return users.get_user(user_id)
    except Exception as exc:
        _handle_opsramp_error(exc, user, "get_user", user_id)


@router.post("/users")
def create_user(
    body: CreateUserRequest,
    user: Annotated[str, Depends(get_current_user)],
) -> dict:
    try:
        result = users.create_user(body.model_dump())
        audit.log_operation(
            user,
            "create_user",
            body.loginName,
            "success",
            {"email": body.email, "roles": body.roles, "userGroups": body.userGroups},
        )
        return result
    except Exception as exc:
        _handle_opsramp_error(exc, user, "create_user", body.loginName)


@router.put("/users/{user_id}")
def update_user(
    user_id: str,
    body: UpdateUserRequest,
    user: Annotated[str, Depends(get_current_user)],
) -> dict:
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        result = users.update_user(user_id, payload)
        audit.log_operation(user, "update_user", user_id, "success", payload)
        return result
    except Exception as exc:
        _handle_opsramp_error(exc, user, "update_user", user_id)


@router.get("/tags")
def list_tags(user: Annotated[str, Depends(get_current_user)]) -> list:
    try:
        return devices.list_tags()
    except Exception as exc:
        _handle_opsramp_error(exc, user, "list_tags", "catalog")


@router.get("/tags/{tag_id}/values")
def tag_values(
    tag_id: str,
    user: Annotated[str, Depends(get_current_user)],
) -> list:
    try:
        return devices.get_tag_values(tag_id)
    except Exception as exc:
        _handle_opsramp_error(exc, user, "list_tag_values", tag_id)


@router.get("/devices/search")
def search_devices(
    q: str,
    user: Annotated[str, Depends(get_current_user)],
) -> list:
    if len(q.strip()) < 2:
        return []
    try:
        return devices.search_devices(q.strip())
    except Exception as exc:
        _handle_opsramp_error(exc, user, "search_devices", q)


@router.post("/devices/attribute")
def set_device_attribute(
    body: SetAttributeRequest,
    user: Annotated[str, Depends(get_current_user)],
) -> dict:
    try:
        result = devices.set_device_attribute(
            body.resourceId,
            body.attributeName,
            body.attributeValue,
        )
        audit.log_operation(
            user,
            "set_device_attribute",
            body.resourceId,
            "success",
            result,
        )
        return result
    except Exception as exc:
        _handle_opsramp_error(exc, user, "set_device_attribute", body.resourceId)


@router.get("/audit")
def get_audit(user: Annotated[str, Depends(get_current_user)]) -> list:
    return audit.get_audit_log()
