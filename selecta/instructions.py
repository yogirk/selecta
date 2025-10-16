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

import datetime
import json
import logging
import yaml
from functools import lru_cache

from .config_loader import (
    get_bigquery_settings,
    get_dataset_config,
    get_prompt_settings,
)
from .utils import (
    fetch_bigquery_data_profiles,
    fetch_sample_data_for_tables,
    get_table_ddl_strings,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def json_serial_default(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def _load_instruction_template() -> str:
    prompt_settings = get_prompt_settings()
    template_path = prompt_settings.instruction_file
    if not template_path.exists():
        raise FileNotFoundError(f"Instruction template not found: {template_path}")

    with template_path.open("r", encoding="utf-8") as handle:
        instructions_yaml = yaml.safe_load(handle)

    sections = [
        instructions_yaml.get("overall_workflow", ""),
        instructions_yaml.get("bigquery_data_schema_and_context", ""),
        instructions_yaml.get("table_schema_and_join_information", ""),
        instructions_yaml.get("critical_joining_logic_and_context", ""),
        instructions_yaml.get("data_profile_information", ""),
        instructions_yaml.get("sample_data", ""),
        instructions_yaml.get("usecase_specific_table_information", ""),
        instructions_yaml.get("few_shot_examples", ""),
    ]

    template = "\n".join(section for section in sections if section)
    if not template.strip():
        raise ValueError("Instruction template is empty after concatenation.")
    return template


@lru_cache(maxsize=1)
def return_instructions_bigquery() -> str:
    """
    Fetches table metadata, data profiles (conditionally sample data), formats them,
    and injects them into the main instruction template.
    """
    bigquery_settings = get_bigquery_settings()
    dataset_config = get_dataset_config()

    table_ddls = get_table_ddl_strings()
    if not table_ddls:
        table_metadata_string_for_prompt = "Table schema (DDL) information is not available."
    else:
        formatted_ddls = []
        for table_info in table_ddls:
            ddl = table_info.get("ddl", "")
            formatted_ddls.append(f"```sql\n{ddl}\n```")
        table_metadata_string_for_prompt = "\n\n---\n\n".join(formatted_ddls)

    data_profiles_raw = fetch_bigquery_data_profiles()
    data_profiles_string_for_prompt = ""
    samples_string_for_prompt = ""

    if data_profiles_raw:
        logger.info("Data profiles found (%d entries). Formatting for prompt.", len(data_profiles_raw))
        formatted_profiles = []
        for profile in data_profiles_raw:
            try:
                profile_str = json.dumps(profile, indent=2, ensure_ascii=False, default=json_serial_default)
            except TypeError as exc:
                logger.warning("Could not serialize profile part: %s. Profile: %s", exc, profile)
                profile_str = (
                    f"Profile for column '{profile.get('source_column_name', profile.get('column_name'))}'"
                    f" in table '{profile.get('source_table_id')}' contains non-serializable data."
                )

            column_key = profile.get("source_column_name", profile.get("column_name"))
            table_key = profile.get("source_table_id")
            formatted_profiles.append(
                f"Data profile for column '{column_key}' in table '{table_key}':\n{profile_str}"
            )

        data_profiles_string_for_prompt = (
            "\n\n---\n\n".join(formatted_profiles)
            if formatted_profiles
            else "Data profiles were processed but no displayable content was generated."
        )

        samples_string_for_prompt = (
            "Full data profiles are provided; sample data section is omitted for brevity in this context. "
            "If needed, sample data can be fetched for specific tables."
        )
    else:
        logger.info("Data profiles not found. Attempting to fetch sample data instead.")
        data_profiles_string_for_prompt = (
            "Data profile information is not available. Please refer to the sample data below."
        )

        sample_data_raw = fetch_sample_data_for_tables(num_rows=3)

        if sample_data_raw:
            logger.info("Sample data fetched (%d tables). Formatting for prompt.", len(sample_data_raw))
            formatted_samples = []
            for item in sample_data_raw:
                try:
                    sample_rows_str = json.dumps(
                        item["sample_rows"], indent=2, ensure_ascii=False, default=json_serial_default
                    )
                except TypeError as exc:
                    logger.warning(
                        "Could not serialize sample_rows for table %s: %s. Sample rows: %s",
                        item.get("table_name"),
                        exc,
                        item.get("sample_rows"),
                    )
                    sample_rows_str = (
                        f"Sample rows for table {item.get('table_name')} contain non-serializable data."
                    )

                formatted_samples.append(
                    f"**Sample Data for table `{item['table_name']}` (first {len(item.get('sample_rows', []))} rows):**\n"
                    f"```json\n{sample_rows_str}\n```"
                )
            samples_string_for_prompt = "\n\n---\n\n".join(formatted_samples)
        else:
            logger.warning(
                "Could not fetch sample data for the target scope: %s.%s (Tables: %s).",
                bigquery_settings.data_project_id,
                bigquery_settings.dataset,
                bigquery_settings.tables if bigquery_settings.tables else "All",
            )
            samples_string_for_prompt = (
                f"Could not fetch sample data for the target scope: "
                f"{bigquery_settings.data_project_id}.{bigquery_settings.dataset} "
                f"(Tables: {bigquery_settings.tables if bigquery_settings.tables else 'All'})."
            )

    template = _load_instruction_template()
    final_instruction = template.format(
        table_metadata=table_metadata_string_for_prompt,
        data_profiles=data_profiles_string_for_prompt,
        samples=samples_string_for_prompt,
        dataset_description=dataset_config.description or "",
    )

    return final_instruction
