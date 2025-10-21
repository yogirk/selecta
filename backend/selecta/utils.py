import logging
import time
from typing import Any, Dict, List, Optional

from google.cloud import bigquery, dataplex_v1
from google.cloud.bigquery.table import TableReference
from proto.marshal.collections.maps import MapComposite
from proto.marshal.collections.repeated import RepeatedComposite
from google.auth import exceptions as auth_exceptions

from .config_loader import get_bigquery_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def _get_bq_clients() -> tuple[Optional[bigquery.Client], Optional[bigquery.Client]]:
    settings = get_bigquery_settings()
    try:
        billing_client = bigquery.Client(project=settings.billing_project_id)
    except auth_exceptions.DefaultCredentialsError as exc:
        logger.warning(
            "BigQuery credentials unavailable; analytics features disabled (%s).", exc
        )
        return None, None
    data_client: Optional[bigquery.Client]
    if settings.billing_project_id == settings.data_project_id:
        data_client = billing_client
    else:
        try:
            data_client = bigquery.Client(project=settings.data_project_id)
        except auth_exceptions.DefaultCredentialsError as exc:
            logger.warning(
                "BigQuery data client credentials unavailable; using billing client if possible (%s).",
                exc,
            )
            data_client = None
    return billing_client, data_client


def fetch_bigquery_data_profiles() -> List[Dict[str, Any]]:
    settings = get_bigquery_settings()
    profiles_table_id = settings.data_profiles_table
    if not profiles_table_id:
        logger.info("No data profile table configured; skipping profile retrieval.")
        return []

    billing_client, _ = _get_bq_clients()
    if billing_client is None:
        logger.info("Skipping data profile retrieval; BigQuery client unavailable.")
        return []
    start_time = time.time()

    query = """
        SELECT
            CONCAT(data_source.table_project_id, '.', data_source.dataset_id, '.', data_source.table_id)
                AS source_table_id,
            column_name,
            percent_null,
            percent_unique,
            min_string_length,
            max_string_length,
            min_value,
            max_value,
            top_n
        FROM `{profiles_table}`
        WHERE data_source.dataset_id = @dataset_id
    """

    tables = settings.tables
    params = [
        bigquery.ScalarQueryParameter("dataset_id", "STRING", settings.dataset),
    ]
    if tables:
        query += " AND data_source.table_id IN UNNEST(@table_ids)"
        params.append(bigquery.ArrayQueryParameter("table_ids", "STRING", tables))

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        query_job = billing_client.query(
            query.format(profiles_table=profiles_table_id), job_config=job_config
        )
        rows = [dict(row.items()) for row in query_job.result()]

        filtered_rows: List[Dict[str, Any]] = []
        for profile in rows:
            percent_null_value = profile.get("percent_null")
            if isinstance(percent_null_value, (float, int)) and percent_null_value > 90:
                continue
            filtered_rows.append(profile)

        logger.info(
            "Fetched %d column profiles for dataset %s.%s",
            len(filtered_rows),
            settings.data_project_id,
            settings.dataset,
        )
        return filtered_rows
    except Exception as exc:  # pragma: no cover - defensive logging
        duration = time.time() - start_time
        logger.error(
            "Failed to fetch data profiles after %.2f seconds", duration, exc_info=True
        )
        return []


def fetch_sample_data_for_tables(num_rows: int = 3) -> List[Dict[str, Any]]:
    settings = get_bigquery_settings()
    billing_client, data_client = _get_bq_clients()
    if billing_client is None or data_client is None:
        logger.info("Skipping sample data retrieval; BigQuery client unavailable.")
        return []

    tables = settings.tables
    dataset_ref = data_client.dataset(settings.dataset, project=settings.data_project_id)

    if not tables:
        logger.info(
            "No tables specified. Enumerating all base tables in %s.%s",
            settings.data_project_id,
            settings.dataset,
        )
        try:
            tables = [
                table.table_id
                for table in data_client.list_tables(dataset_ref)
                if table.table_type == "TABLE"
            ]
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.error("Failed to list tables: %s", exc, exc_info=True)
            return []

    results: List[Dict[str, Any]] = []
    for table_id in tables:
        full_table_name = f"{settings.data_project_id}.{settings.dataset}.{table_id}"
        try:
            table_reference = TableReference.from_string(
                full_table_name, default_project=settings.data_project_id
            )
            rows_iterator = billing_client.list_rows(table_reference, max_results=num_rows)
            sample_rows = [dict(row.items()) for row in rows_iterator]
            if sample_rows:
                results.append({"table_name": full_table_name, "sample_rows": sample_rows})
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.error(
                "Failed to fetch sample data for table %s: %s",
                full_table_name,
                exc,
                exc_info=True,
            )
            continue
    return results


def convert_proto_to_dict(obj: Any) -> Any:
    if isinstance(obj, MapComposite):
        return {k: convert_proto_to_dict(v) for k, v in obj.items()}
    if isinstance(obj, RepeatedComposite):
        return [convert_proto_to_dict(elem) for elem in obj]
    return obj


def fetch_table_entry_metadata() -> List[Dict[str, Any]]:
    settings = get_bigquery_settings()
    client = dataplex_v1.CatalogServiceClient()
    start_time = time.time()

    entry_group_name = (
        f"projects/{settings.data_project_id}/locations/{settings.location}/entryGroups/@bigquery"
    )

    target_entry_names: List[str] = []
    if settings.tables:
        for table in settings.tables:
            entry_id = (
                f"bigquery.googleapis.com/projects/{settings.data_project_id}"
                f"/datasets/{settings.dataset}/tables/{table}"
            )
            target_entry_names.append(f"{entry_group_name}/entries/{entry_id}")
    else:
        search_request = dataplex_v1.SearchEntriesRequest(
            page_size=100,
            name=f"projects/{settings.data_project_id}/locations/global",
            scope=f"projects/{settings.data_project_id}",
            query=f"name:projects/{settings.data_project_id}/datasets/{settings.dataset}/tables/",
        )
        try:
            for entry in client.search_entries(request=search_request):
                target_entry_names.append(entry.dataplex_entry.name)
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.error("Failed to search Dataplex entries: %s", exc, exc_info=True)

    metadata: List[Dict[str, Any]] = []
    for entry_name in target_entry_names:
        try:
            entry = client.get_entry(
                request=dataplex_v1.GetEntryRequest(
                    name=entry_name,
                    view=dataplex_v1.EntryView.ALL,
                )
            )
            aspects_data: Dict[str, Any] = {}
            if entry.aspects:
                for aspect_key, aspect in entry.aspects.items():
                    aspect_dict: Dict[str, Any] = {}
                    if getattr(aspect, "data", None):
                        for key, value in aspect.data.items():
                            aspect_dict[key] = convert_proto_to_dict(value)
                    if aspect_dict:
                        aspects_data[aspect_key] = aspect_dict

            metadata.append(
                {
                    "table_name": entry_name.split("/")[-1],
                    "aspects": aspects_data,
                }
            )
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.error(
                "Failed to fetch metadata for entry %s: %s",
                entry_name,
                exc,
                exc_info=True,
            )

    logger.info(
        "Fetched %d Dataplex entries in %.2f seconds",
        len(metadata),
        time.time() - start_time,
    )
    return metadata


def get_table_ddl_strings() -> List[Dict[str, Any]]:
    settings = get_bigquery_settings()
    billing_client, _ = _get_bq_clients()
    if billing_client is None:
        logger.info("Skipping DDL fetch; BigQuery client unavailable.")
        return []
    start_time = time.time()

    base_query = f"""
        SELECT
            table_name,
            ddl
        FROM `{settings.data_project_id}.{settings.dataset}.INFORMATION_SCHEMA.TABLES`
        WHERE table_type = 'BASE TABLE'
    """
    if settings.tables:
        formatted_names = ", ".join(f"'{table}'" for table in settings.tables)
        base_query += f" AND table_name IN ({formatted_names})"
    base_query += " ORDER BY table_name"

    try:
        rows = billing_client.query(base_query).result()
        ddls = [
            {"table_name": row.table_name, "ddl": row.ddl}
            for row in rows
            if getattr(row, "ddl", None)
        ]
        logger.info(
            "Fetched DDL for %d tables in %s.%s",
            len(ddls),
            settings.data_project_id,
            settings.dataset,
        )
        return ddls
    except Exception as exc:  # pragma: no cover - defensive logging
        duration = time.time() - start_time
        logger.error(
            "Failed to fetch table DDL after %.2f seconds", duration, exc_info=True
        )
        return []
