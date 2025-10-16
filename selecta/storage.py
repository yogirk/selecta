import json
import os
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

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
                created_at TEXT NOT NULL,
                last_question TEXT,
                last_message_preview TEXT,
                message_count INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
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
                chart_json TEXT,
                summary_text TEXT,
                results_markdown TEXT,
                business_insights TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )
            """
        )

        # Ensure sessions table includes metadata columns for older databases
        existing_session_columns = {
            row[1] for row in conn.execute("PRAGMA table_info(sessions)").fetchall()
        }
        if "last_question" not in existing_session_columns:
            conn.execute("ALTER TABLE sessions ADD COLUMN last_question TEXT")
        if "last_message_preview" not in existing_session_columns:
            conn.execute("ALTER TABLE sessions ADD COLUMN last_message_preview TEXT")
        if "message_count" not in existing_session_columns:
            conn.execute(
                "ALTER TABLE sessions ADD COLUMN message_count INTEGER NOT NULL DEFAULT 0"
            )
        if "updated_at" not in existing_session_columns:
            conn.execute(
                "ALTER TABLE sessions ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''"
            )
        conn.execute(
            """
            UPDATE sessions
            SET
                message_count = COALESCE(message_count, 0),
                updated_at = CASE
                    WHEN updated_at IS NULL OR updated_at = '' THEN created_at
                    ELSE updated_at
                END
            """
        )
        conn.execute(
            """
            UPDATE sessions
            SET message_count = (
                SELECT COUNT(*)
                FROM messages
                WHERE messages.session_id = sessions.id
            )
            """
        )
        conn.execute(
            """
            UPDATE sessions
            SET updated_at = COALESCE(
                (
                    SELECT created_at
                    FROM messages
                    WHERE session_id = sessions.id
                    ORDER BY created_at DESC, id DESC
                    LIMIT 1
                ),
                updated_at
            )
            """
        )

        user_messages = conn.execute(
            """
            SELECT session_id, content
            FROM messages
            WHERE role = 'user'
            ORDER BY created_at DESC, id DESC
            """
        ).fetchall()
        seen_user_sessions = set()
        for session_id, message_content in user_messages:
            if session_id in seen_user_sessions or message_content is None:
                continue
            conn.execute(
                """
                UPDATE sessions
                SET last_question = ?
                WHERE id = ?
                """,
                (_truncate_content(message_content), session_id),
            )
            seen_user_sessions.add(session_id)

        assistant_messages = conn.execute(
            """
            SELECT session_id, content
            FROM messages
            WHERE role = 'assistant'
            ORDER BY created_at DESC, id DESC
            """
        ).fetchall()
        seen_assistant_sessions = set()
        for session_id, message_content in assistant_messages:
            if session_id in seen_assistant_sessions or message_content is None:
                continue
            conn.execute(
                """
                UPDATE sessions
                SET last_message_preview = ?
                WHERE id = ?
                """,
                (_truncate_content(message_content), session_id),
            )
            seen_assistant_sessions.add(session_id)

        # Ensure chart_json column exists for older databases
        existing_columns = {
            row[1] for row in conn.execute("PRAGMA table_info(query_results)").fetchall()
        }
        if "chart_json" not in existing_columns:
            conn.execute("ALTER TABLE query_results ADD COLUMN chart_json TEXT")
        if "summary_text" not in existing_columns:
            conn.execute("ALTER TABLE query_results ADD COLUMN summary_text TEXT")
        if "results_markdown" not in existing_columns:
            conn.execute("ALTER TABLE query_results ADD COLUMN results_markdown TEXT")
        if "business_insights" not in existing_columns:
            conn.execute("ALTER TABLE query_results ADD COLUMN business_insights TEXT")


def _iso_now() -> str:
    return datetime.utcnow().isoformat(timespec="seconds")


def _truncate_content(value: str, limit: int = 500) -> str:
    stripped = value.strip()
    if len(stripped) <= limit:
        return stripped
    ellipsis = "..." if limit >= 3 else ""
    slice_length = max(limit - len(ellipsis), 0)
    return f"{stripped[:slice_length]}{ellipsis}"


def ensure_session(session_id: str, user_id: Optional[str] = None) -> None:
    now = _iso_now()
    with _DB_LOCK, _conn_context() as conn:
        conn.execute(
            """
            INSERT INTO sessions (
                id,
                user_id,
                created_at,
                last_question,
                last_message_preview,
                message_count,
                updated_at
            )
            VALUES (
                ?,
                ?,
                COALESCE((SELECT created_at FROM sessions WHERE id = ?), ?),
                (SELECT last_question FROM sessions WHERE id = ?),
                (SELECT last_message_preview FROM sessions WHERE id = ?),
                COALESCE((SELECT message_count FROM sessions WHERE id = ?), 0),
                COALESCE((SELECT updated_at FROM sessions WHERE id = ?), ?)
            )
            ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id
            """,
            (
                session_id,
                user_id,
                session_id,
                now,
                session_id,
                session_id,
                session_id,
                session_id,
                now,
            ),
        )


def append_message(session_id: str, role: str, content: str) -> None:
    timestamp = _iso_now()
    truncated_content = _truncate_content(content)

    with _DB_LOCK, _conn_context() as conn:
        conn.execute(
            """
            INSERT INTO messages (session_id, role, content, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (session_id, role, content, timestamp),
        )
        conn.execute(
            """
            UPDATE sessions
            SET
                message_count = COALESCE(message_count, 0) + 1,
                updated_at = ?
            WHERE id = ?
            """,
            (timestamp, session_id),
        )
        if role == "user":
            conn.execute(
                """
                UPDATE sessions
                SET last_question = ?
                WHERE id = ?
                """,
                (truncated_content, session_id),
            )
        elif role == "assistant":
            conn.execute(
                """
                UPDATE sessions
                SET last_message_preview = ?
                WHERE id = ?
                """,
                (truncated_content, session_id),
            )


def store_query_result(
    *,
    session_id: str,
    user_id: Optional[str],
    sql_query: str,
    rows: List[Dict[str, Any]],
    chart: Optional[Dict[str, Any]] = None,
    summary: Optional[str] = None,
    results_markdown: Optional[str] = None,
    business_insights: Optional[str] = None,
) -> str:
    columns = list(rows[0].keys()) if rows else []
    result_id = uuid.uuid4().hex
    payload_columns = json.dumps(columns, ensure_ascii=False)
    payload_rows = json.dumps(rows, ensure_ascii=False)
    payload_chart = json.dumps(chart, ensure_ascii=False) if chart else None

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
                chart_json,
                summary_text,
                results_markdown,
                business_insights,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                result_id,
                session_id,
                user_id,
                sql_query,
                len(rows),
                payload_columns,
                payload_rows,
                payload_chart,
                summary,
                results_markdown,
                business_insights,
                _iso_now(),
            ),
        )

    return result_id


def apply_structured_sections_to_latest_result(
    session_id: str,
    summary: Optional[str],
    results_markdown: Optional[str],
    business_insights: Optional[str],
) -> None:
    def _value_or_none(value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        stripped = value.strip()
        return stripped if stripped else None

    with _DB_LOCK, _conn_context() as conn:
        row = conn.execute(
            """
            SELECT result_id
            FROM query_results
            WHERE session_id = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (session_id,),
        ).fetchone()
        if not row:
            return
        conn.execute(
            """
            UPDATE query_results
            SET
                summary_text = ?,
                results_markdown = ?,
                business_insights = ?
            WHERE result_id = ?
            """,
            (
                _value_or_none(summary),
                _value_or_none(results_markdown),
                _value_or_none(business_insights),
                row[0],
            ),
        )


def list_sessions(limit: int = 50) -> List[Dict[str, Any]]:
    with _DB_LOCK, _conn_context() as conn:
        rows = conn.execute(
            """
            SELECT
                id,
                user_id,
                created_at,
                last_question,
                last_message_preview,
                message_count,
                updated_at
            FROM sessions
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [
        {
            "sessionId": row[0],
            "userId": row[1],
            "createdAt": row[2],
            "lastQuestion": row[3],
            "lastMessagePreview": row[4],
            "messageCount": row[5] if row[5] is not None else 0,
            "updatedAt": row[6],
        }
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
            SELECT
                result_id,
                sql_query,
                row_count,
                columns_json,
                rows_json,
                chart_json,
                summary_text,
                results_markdown,
                business_insights,
                created_at
            FROM query_results
            WHERE session_id = ?
            ORDER BY created_at DESC
            """,
            (session_id,),
        ).fetchall()
    results = []
    for row in rows:
        chart_payload = json.loads(row[5]) if row[5] else None
        results.append(
            {
                "resultId": row[0],
                "sql": row[1],
                "rowCount": row[2],
                "columns": json.loads(row[3]),
                "rows": json.loads(row[4]),
                "chart": chart_payload,
                "summary": row[6],
                "resultsMarkdown": row[7],
                "businessInsights": row[8],
                "suggestions": [],
                "createdAt": row[9],
            }
        )
    return results


def get_result(result_id: str) -> Optional[Dict[str, Any]]:
    with _DB_LOCK, _conn_context() as conn:
        row = conn.execute(
            """
            SELECT
                result_id,
                session_id,
                sql_query,
                row_count,
                columns_json,
                rows_json,
                chart_json,
                summary_text,
                results_markdown,
                business_insights,
                created_at
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
        "chart": json.loads(row[6]) if row[6] else None,
        "summary": row[7],
        "resultsMarkdown": row[8],
        "businessInsights": row[9],
        "suggestions": [],
        "createdAt": row[10],
    }
