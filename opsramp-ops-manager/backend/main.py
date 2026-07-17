from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import audit
from routes.api import router as api_router
from routes.auth import router as auth_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    audit.init_audit_db()
    yield


app = FastAPI(title="OpsRamp Ops Manager", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(api_router)
