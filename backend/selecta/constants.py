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

import os
from pathlib import Path

_DEFAULT_MODEL = "gemini-2.5-pro-preview-03-25"
_PACKAGE_ROOT = Path(__file__).resolve().parent

MODEL = (
    os.getenv("SELECTA_MODEL")
    or os.getenv("DATA_AGENT_MODEL")
    or _DEFAULT_MODEL
)

DEFAULT_DATASET_CONFIG_PATH = (
    os.getenv("SELECTA_DATASET_CONFIG")
    or os.getenv("DATA_AGENT_DATASET_CONFIG")
    or str(_PACKAGE_ROOT / "datasets" / "thelook.yaml")
)


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


AUTO_VIZ_ENABLED = _env_bool("SELECTA_AUTOVISUALIZE", True)
VIZ_MAX_ROWS = int(os.getenv("SELECTA_VIZ_MAX_ROWS", "500"))
VIZ_MAX_DISTINCT = int(os.getenv("SELECTA_VIZ_MAX_DISTINCT", "20"))
