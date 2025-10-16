import json
import os
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional

DB_PATH = os.getenv("SELECTA_DB_PATH", os.path.abspath("selecta.db"))
_DB_LOCK = threading.Lock()


def _ensure_parent_dir() -> None:
    parent = os.path.dirname(DB_PATH)
    if parent and not os.path.exists(parent):
        os.makedirs(parent, exist_ok=True)


def _get_connection() -> sqlite3.Connection:
    return sqlite3.connect(DB_PATH, check_same_thread=False)


@contextmanager
def _conn_context():
    conn = _get_connection()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    _ensure_parent_dir()
    with _DB_LOCK, _conn_context() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS query_results (
                result_id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                user_id TEXT,
                sql_query TEXT NOT NULL,
                row_count INTEGER NOT NULL,
                columns_json TEXT NOT NULL,
                rows_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )
            """
        )


def _iso_now() -> str:
    return datetime.utcnow().isoformat(timespec="seconds")


def ensure_session(session_id: str, user_id: Optional[str] = None) -> None:
    with _DB_LOCK, _conn_context() as conn:
        conn.execute(
            """
            INSERT INTO sessions (id, user_id, created_at)
            VALUES (?, ?, COALESCE(
                (SELECT created_at FROM sessions WHERE id = ?),
                ?
            ))
            ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id
            """,
            (session_id, user_id, session_id, _iso_now()),
        )


def append_message(session_id: str, role: str, content: str) -> None:
    with _DB_LOCK, _conn_context() as conn:
        conn.execute(
            """
            INSERT INTO messages (session_id, role, content, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (session_id, role, content, _iso_now()),
        )


def store_query_result(
    *,
    session_id: str,
    user_id: Optional[str],
    sql_query: str,
    rows: List[Dict[str, Any]],
) -> str:
    columns = list(rows[0].keys()) if rows else []
    result_id = uuid.uuid4().hex
    payload_columns = json.dumps(columns, ensure_ascii=False)
    payload_rows = json.dumps(rows, ensure_ascii=False)

    with _DB_LOCK, _conn_context() as conn:
        conn.execute(
            """
            INSERT INTO query_results (
                result_id,
                session_id,
                user_id,
                sql_query,
                row_count,
                columns_json,
                rows_json,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                result_id,
                session_id,
                user_id,
                sql_query,
                len(rows),
                payload_columns,
                payload_rows,
                _iso_now(),
            ),
        )

    return result_id


def list_sessions(limit: int = 50) -> List[Dict[str, Any]]:
    with _DB_LOCK, _conn_context() as conn:
        rows = conn.execute(
            """
            SELECT id, user_id, created_at
            FROM sessions
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [
        {"sessionId": row[0], "userId": row[1], "createdAt": row[2]}
        for row in rows
    ]


def get_session_messages(session_id: str) -> List[Dict[str, Any]]:
    with _DB_LOCK, _conn_context() as conn:
        rows = conn.execute(
            """
            SELECT role, content, created_at
            FROM messages
            WHERE session_id = ?
            ORDER BY created_at ASC, id ASC
            """,
            (session_id,),
        ).fetchall()
    return [
        {"role": row[0], "content": row[1], "createdAt": row[2]}
        for row in rows
    ]


def get_session_results(session_id: str) -> List[Dict[str, Any]]:
    with _DB_LOCK, _conn_context() as conn:
        rows = conn.execute(
            """
            SELECT result_id, sql_query, row_count, columns_json, rows_json, created_at
            FROM query_results
            WHERE session_id = ?
            ORDER BY created_at DESC
            """,
            (session_id,),
        ).fetchall()
    results = []
    for row in rows:
        results.append(
            {
                "resultId": row[0],
                "sql": row[1],
                "rowCount": row[2],
                "columns": json.loads(row[3]),
                "rows": json.loads(row[4]),
                "createdAt": row[5],
            }
        )
    return results


def get_result(result_id: str) -> Optional[Dict[str, Any]]:
    with _DB_LOCK, _conn_context() as conn:
        row = conn.execute(
            """
            SELECT result_id, session_id, sql_query, row_count, columns_json, rows_json, created_at
            FROM query_results
            WHERE result_id = ?
            """,
            (result_id,),
        ).fetchone()
    if not row:
        return None
    return {
        "resultId": row[0],
        "sessionId": row[1],
        "sql": row[2],
        "rowCount": row[3],
        "columns": json.loads(row[4]),
        "rows": json.loads(row[5]),
        "createdAt": row[6],
    }
