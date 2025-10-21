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
import re
import time
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from google.api_core import exceptions as google_exceptions
from google.cloud import bigquery
from google.auth import exceptions as auth_exceptions

from .config_loader import get_bigquery_settings
from .visualization import build_chart_bundle, build_chart_spec

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


_TEMPORAL_WINDOW_FUNCTIONS = (
    "TIMESTAMP_ADD",
    "TIMESTAMP_SUB",
    "TIMESTAMP_DIFF",
    "DATETIME_ADD",
    "DATETIME_SUB",
    "DATETIME_DIFF",
)

_UNSUPPORTED_INTERVAL_UNITS = {"MONTH", "MONTHS", "QUARTER", "QUARTERS", "YEAR", "YEARS"}
_INTERVAL_PATTERN = re.compile(r"INTERVAL\s+.+?\s+(?P<unit>[A-Z]+)", re.IGNORECASE | re.DOTALL)


def _ensure_supported_temporal_intervals(sql_query: str) -> None:
    upper_sql = sql_query.upper()

    for function_name in _TEMPORAL_WINDOW_FUNCTIONS:
        search_start = 0
        while True:
            match_index = upper_sql.find(function_name, search_start)
            if match_index == -1:
                break

            paren_index = upper_sql.find("(", match_index + len(function_name))
            if paren_index == -1:
                break

            depth = 0
            position = paren_index
            while position < len(upper_sql):
                char = upper_sql[position]
                if char == "(":
                    depth += 1
                elif char == ")":
                    depth -= 1
                    if depth == 0:
                        segment = upper_sql[paren_index + 1 : position]
                        for interval_match in _INTERVAL_PATTERN.finditer(segment):
                            raw_unit = interval_match.group("unit")
                            unit = re.sub(r"[^A-Z]", "", raw_unit.upper())
                            if unit in _UNSUPPORTED_INTERVAL_UNITS:
                                raise ValueError(
                                    (
                                        f"{function_name} cannot use INTERVAL ... {unit}. "
                                        "BigQuery only permits MICROSECOND through WEEK for TIMESTAMP/DATETIME windows. "
                                        "Use DATE_ADD/DATE_SUB (and CAST back with TIMESTAMP()) when working with months or years."
                                    )
                                )
                        break
                position += 1

            search_start = match_index + len(function_name)


def _record_query_error(tool_context: Optional[Any], sql_query: str, error: Exception, job_id: Optional[str]) -> None:
    if tool_context is None or not hasattr(tool_context, "state"):
        return

    state = getattr(tool_context, "state", None)
    if state is None:
        return

    timestamp_ms = int(time.time() * 1000)
    error_payload: Dict[str, Any] = {
        "message": str(error),
        "sql": sql_query,
        "timestamp": timestamp_ms,
        "type": error.__class__.__name__,
    }

    if job_id:
        error_payload["jobId"] = job_id

    if isinstance(error, google_exceptions.GoogleAPICallError):
        error_payload["errorCode"] = getattr(error, "code", None)

    bigquery_errors = getattr(error, "errors", None)
    if isinstance(bigquery_errors, list) and bigquery_errors:
        formatted_errors: List[Dict[str, Any]] = []
        for entry in bigquery_errors:
            if not isinstance(entry, dict):
                continue
            formatted_errors.append(
                {
                    key: value
                    for key, value in entry.items()
                    if key in {"message", "reason", "location", "debugInfo"}
                }
            )
        if formatted_errors:
            error_payload["details"] = formatted_errors

    state["latest_error"] = error_payload
    history: List[Dict[str, Any]] = list(state.get("errors_history", []))
    history.append(error_payload.copy())
    state["errors_history"] = history


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
    query_job: Optional[bigquery.job.QueryJob] = None

    try:
        _ensure_supported_temporal_intervals(sql_query)
        try:
            client = bigquery.Client(project=settings.billing_project_id)
        except auth_exceptions.DefaultCredentialsError as exc:
            logger.error("BigQuery credentials were not found: %s", exc)
            raise RuntimeError(
                "BigQuery credentials are missing. Provide GOOGLE_APPLICATION_CREDENTIALS or configure workload identity."
            ) from exc
        logger.info("Submitting query to BigQuery (billing project: %s)", settings.billing_project_id)
        query_job = client.query(sql_query)
        rows = query_job.result()
        data = [dict(row.items()) for row in rows]
        normalized = _normalize_rows(data)
        elapsed_seconds = time.time() - start_time
        logger.info("Query returned %d rows in %.2f seconds", len(data), elapsed_seconds)
        chart_bundle = build_chart_bundle(normalized)
        chart_spec = chart_bundle["charts"][0]["spec"] if chart_bundle else None
        chart_options = chart_bundle["charts"] if chart_bundle else None
        default_chart_id = chart_bundle["defaultChartId"] if chart_bundle else None

        if tool_context is not None:
            try:
                tool_context.state.pop("latest_error", None)
            except AttributeError:
                pass
            columns = list(normalized[0].keys()) if normalized else []
            result_id = str(uuid.uuid4())
            created_at_ms = int(time.time() * 1000)
            job_id = getattr(query_job, "job_id", None)
            result_payload = {
                "id": result_id,
                "sql": sql_query,
                "rows": normalized,
                "columns": columns,
                "rowCount": len(normalized),
                "chart": chart_spec,
                "chartOptions": chart_options,
                "defaultChartId": default_chart_id,
                "createdAt": created_at_ms,
                "executionMs": int(elapsed_seconds * 1000),
                "jobId": job_id,
                "dataset": {
                    "id": settings.dataset,
                    "projectId": settings.data_project_id,
                    "billingProjectId": settings.billing_project_id,
                    "location": settings.location,
                    "tables": settings.tables,
                },
            }
            tool_context.state["latest_result"] = result_payload
            history: List[Dict[str, Any]] = list(tool_context.state.get("results_history", []))
            history.append(result_payload.copy())
            tool_context.state["results_history"] = history

        return normalized
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("BigQuery query failed: %s", exc, exc_info=True)
        job_id = getattr(query_job, "job_id", None) if query_job is not None else None
        _record_query_error(tool_context, sql_query, exc, job_id)
        raise RuntimeError(f"BigQuery query failed: {exc}") from exc
