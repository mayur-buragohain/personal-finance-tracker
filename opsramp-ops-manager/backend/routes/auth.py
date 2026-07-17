import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

_sessions: dict[str, str] = {}


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    username: str


def get_current_user(authorization: Annotated[str | None, Header()] = None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.removeprefix("Bearer ").strip()
    username = _sessions.get(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return username


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest) -> LoginResponse:
    if body.username != settings.app_admin_username or body.password != settings.app_admin_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = secrets.token_urlsafe(32)
    _sessions[token] = body.username
    return LoginResponse(token=token, username=body.username)


@router.post("/logout")
def logout(
    authorization: Annotated[str | None, Header()] = None,
) -> dict[str, str]:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        _sessions.pop(token, None)
    return {"status": "ok"}


@router.get("/me")
def me(user: Annotated[str, Depends(get_current_user)]) -> dict[str, str]:
    return {"username": user}
