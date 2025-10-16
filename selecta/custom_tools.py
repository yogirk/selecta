# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import logging
import time
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from google.cloud import bigquery

from . import storage
from .config_loader import get_bigquery_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def _normalize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="ignore")
    if isinstance(value, list):
        return [_normalize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _normalize_value(val) for key, val in value.items()}
    return value


def _normalize_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [{key: _normalize_value(value) for key, value in row.items()} for row in rows]


def execute_bigquery_query(sql_query: str, tool_context: Optional[Any] = None) -> List[Dict[str, Any]]:
    """Execute SQL against BigQuery using the configured billing project."""
    settings = get_bigquery_settings()
    start_time = time.time()

    try:
        client = bigquery.Client(project=settings.billing_project_id)
        logger.info("Submitting query to BigQuery (billing project: %s)", settings.billing_project_id)
        query_job = client.query(sql_query)
        rows = query_job.result()
        data = [dict(row.items()) for row in rows]
        normalized = _normalize_rows(data)
        logger.info("Query returned %d rows in %.2f seconds", len(data), time.time() - start_time)

        if tool_context is not None:
            invocation_context = getattr(tool_context, "_invocation_context", None)
            session_obj = getattr(invocation_context, "session", None) if invocation_context else None
            session_id = getattr(session_obj, "id", None)
            user_id = getattr(invocation_context, "user_id", None) if invocation_context else None
            if session_id:
                storage.ensure_session(session_id, user_id)
                result_id = storage.store_query_result(
                    session_id=session_id,
                    user_id=user_id,
                    sql_query=sql_query,
                    rows=normalized,
                )
                tool_context.state["latest_query_result_id"] = result_id

        return normalized
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("BigQuery query failed: %s", exc, exc_info=True)
        return []
