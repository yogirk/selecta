import pytest

from selecta.custom_tools import _ensure_supported_temporal_intervals


def test_temporal_interval_validator_allows_supported_units():
    sql = "SELECT TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 10 DAY)"
    # Should not raise
    _ensure_supported_temporal_intervals(sql)


@pytest.mark.parametrize(
    "sql_snippet",
    [
        "SELECT TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 12 MONTH)",
        "SELECT DATETIME_ADD(CURRENT_DATETIME(), INTERVAL 2 YEARS)",
        "SELECT TIMESTAMP_DIFF( TIMESTAMP '2024-01-01', TIMESTAMP '2023-01-01', MONTH )",
    ],
)
def test_temporal_interval_validator_blocks_unsupported_units(sql_snippet: str):
    with pytest.raises(ValueError) as exc:
        _ensure_supported_temporal_intervals(sql_snippet)
    assert "TIMESTAMP" in str(exc.value) or "DATETIME" in str(exc.value)
