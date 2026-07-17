import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from config import settings


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.audit_db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_audit_db() -> None:
    Path(settings.audit_db_path).parent.mkdir(parents=True, exist_ok=True)
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                operator TEXT NOT NULL,
                operation TEXT NOT NULL,
                target TEXT NOT NULL,
                status TEXT NOT NULL,
                details TEXT
            )
            """
        )
        conn.commit()


def log_operation(
    operator: str,
    operation: str,
    target: str,
    status: str,
    details: dict[str, Any] | None = None,
) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO audit_log (timestamp, operator, operation, target, status, details)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.now(timezone.utc).isoformat(),
                operator,
                operation,
                target,
                status,
                json.dumps(details or {}),
            ),
        )
        conn.commit()


def get_audit_log(limit: int = 100) -> list[dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT id, timestamp, operator, operation, target, status, details
            FROM audit_log
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [
        {
            **dict(row),
            "details": json.loads(row["details"]) if row["details"] else {},
        }
        for row in rows
    ]
