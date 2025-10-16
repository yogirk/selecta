import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

from .constants import DEFAULT_DATASET_CONFIG_PATH, MODEL


@dataclass(frozen=True)
class BigQuerySettings:
    billing_project_id: str
    data_project_id: str
    dataset: str
    location: str
    tables: List[str]
    data_profiles_table: Optional[str] = None


@dataclass(frozen=True)
class PromptSettings:
    instruction_file: Path


@dataclass(frozen=True)
class DatasetConfig:
    id: str
    display_name: Optional[str]
    description: Optional[str]
    model: str
    bigquery: BigQuerySettings
    prompt: PromptSettings


def _resolve_path(base_path: Path, candidate: str) -> Path:
    path = Path(candidate)
    if not path.is_absolute():
        path = (base_path / path).resolve()
    return path


def _load_yaml(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


@lru_cache(maxsize=1)
def get_dataset_config() -> DatasetConfig:
    config_path_env = os.getenv("SELECTA_DATASET_CONFIG") or os.getenv(
        "DATA_AGENT_DATASET_CONFIG", DEFAULT_DATASET_CONFIG_PATH
    )
    config_path = Path(config_path_env).expanduser().resolve()
    if not config_path.exists():
        raise FileNotFoundError(f"Dataset configuration file not found: {config_path}")

    raw = _load_yaml(config_path)

    bigquery_raw = raw.get("bigquery") or {}
    bigquery = BigQuerySettings(
        billing_project_id=bigquery_raw.get("billing_project_id", "").strip(),
        data_project_id=bigquery_raw.get("data_project_id", "").strip(),
        dataset=bigquery_raw.get("dataset", "").strip(),
        location=bigquery_raw.get("location", "").strip(),
        tables=list(bigquery_raw.get("tables") or []),
        data_profiles_table=(bigquery_raw.get("data_profiles_table") or "").strip() or None,
    )

    prompt_raw = raw.get("prompt") or {}
    instruction_file = prompt_raw.get("instruction_file")
    if not instruction_file:
        raise ValueError("prompt.instruction_file must be provided in dataset configuration.")

    prompt = PromptSettings(
        instruction_file=_resolve_path(config_path.parent, instruction_file),
    )

    model = raw.get("model") or MODEL

    return DatasetConfig(
        id=raw.get("id", ""),
        display_name=raw.get("display_name"),
        description=raw.get("description"),
        model=model,
        bigquery=bigquery,
        prompt=prompt,
    )


def get_bigquery_settings() -> BigQuerySettings:
    return get_dataset_config().bigquery


def get_prompt_settings() -> PromptSettings:
    return get_dataset_config().prompt


def get_model() -> str:
    return get_dataset_config().model
