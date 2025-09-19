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

MODEL="gemini-2.5-pro-preview-03-25" 
# The Google Cloud Project ID for billing and API calls.
PROJECT_ID="cloudside-academy" # <-- IMPORTANT: SET THIS TO YOUR GCP BILLING PROJECT ID
DATA_SOURCE_PROJECT_ID="bigquery-public-data" # The project where the data resides.
LOCATION="US" # The geographical location of the chicago_taxi_trips dataset.
DATASET_NAME="thelook_ecommerce" # The target BigQuery dataset name.
TABLE_NAMES=["orders", "order_items", "products", "users"] # The specific tables to analyze.
DATA_PROFILES_TABLE_FULL_ID="" # Optional: Full BigQuery table ID where data profiling results are stored. Set to None or an empty string if not used. (e.g., "my_project.profiling_dataset.all_profiles", None, "")
