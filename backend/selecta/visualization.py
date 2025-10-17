import math
from datetime import datetime
from typing import Any, Dict, List, Optional

from .constants import AUTO_VIZ_ENABLED, VIZ_MAX_DISTINCT, VIZ_MAX_ROWS

VEGA_SCHEMA_URL = "https://vega.github.io/schema/vega-lite/v5.json"


def build_chart_spec(rows: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Infer a simple Vega-Lite chart specification from result rows."""
    if not AUTO_VIZ_ENABLED or not rows:
        return None

    if len(rows) > VIZ_MAX_ROWS:
        return None

    sample = rows[: min(len(rows), VIZ_MAX_ROWS)]
    columns = list(sample[0].keys()) if sample else []
    if not columns:
        return None

    column_info = {col: _classify_column(col, sample) for col in columns}

    numeric_cols = [col for col, meta in column_info.items() if meta["type"] == "numeric"]
    temporal_cols = [col for col, meta in column_info.items() if meta["type"] == "temporal"]
    categorical_cols = [
        col
        for col, meta in column_info.items()
        if meta["type"] == "categorical" and meta.get("distinct", 0) <= VIZ_MAX_DISTINCT
    ]

    chart: Optional[Dict[str, Any]] = None

    if temporal_cols and numeric_cols:
        chart = _line_chart(sample, temporal_cols[0], numeric_cols[0], column_info)
    elif categorical_cols and numeric_cols:
        chart = _bar_chart(sample, categorical_cols[0], numeric_cols[0], column_info)
    elif len(numeric_cols) >= 2:
        chart = _scatter_chart(sample, numeric_cols[0], numeric_cols[1], column_info, categorical_cols)

    return chart


def _classify_column(column: str, rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    values = [row.get(column) for row in rows if row.get(column) is not None]
    info: Dict[str, Any] = {"type": "other", "distinct": len(set(values))}

    if not values:
        return info

    if _is_temporal_column(column, values):
        info["type"] = "temporal"
        return info

    if all(_is_numeric(value) for value in values):
        info["type"] = "numeric"
        return info

    if all(isinstance(value, str) for value in values) and len(set(values)) <= max(VIZ_MAX_DISTINCT, 5):
        info["type"] = "categorical"
        return info

    if all(isinstance(value, bool) for value in values):
        info["type"] = "categorical"
        return info

    return info


def _is_numeric(value: Any) -> bool:
    if isinstance(value, bool):  # bool is subclass of int
        return False
    if isinstance(value, (int, float)):
        return not (isinstance(value, float) and math.isnan(value))
    if isinstance(value, str):
        try:
            float(value)
            return True
        except ValueError:
            return False
    return False


def _is_temporal_column(column: str, values: List[Any]) -> bool:
    column_lower = column.lower()
    if any(keyword in column_lower for keyword in ("date", "time", "timestamp", "hour", "day")):
        return True

    return all(_is_temporal_value(value) for value in values[: min(10, len(values))])


def _is_temporal_value(value: Any) -> bool:
    if isinstance(value, datetime):
        return True
    if isinstance(value, str):
        candidate = value.strip().replace("Z", "")
        try:
            datetime.fromisoformat(candidate)
            return True
        except ValueError:
            return False
    return False


def _vega_type(kind: str) -> str:
    if kind == "numeric":
        return "quantitative"
    if kind == "temporal":
        return "temporal"
    if kind == "categorical":
        return "nominal"
    return "nominal"


def _tooltip_encoding(column_info: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [
        {"field": col, "type": _vega_type(meta["type"])}
        for col, meta in column_info.items()
    ]


def _base_chart(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "$schema": VEGA_SCHEMA_URL,
        "data": {"values": data},
        "autosize": {"type": "fit", "contains": "padding"},
    }


def _line_chart(
    data: List[Dict[str, Any]],
    x_field: str,
    y_field: str,
    column_info: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    spec = _base_chart(data)
    spec.update(
        {
            "mark": {"type": "line", "tooltip": True},
            "encoding": {
                "x": {"field": x_field, "type": "temporal"},
                "y": {"field": y_field, "type": "quantitative"},
                "tooltip": _tooltip_encoding(column_info),
            },
        }
    )
    return spec


def _bar_chart(
    data: List[Dict[str, Any]],
    category_field: str,
    value_field: str,
    column_info: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    spec = _base_chart(data)
    spec.update(
        {
            "mark": {"type": "bar", "tooltip": True},
            "encoding": {
                "x": {"field": category_field, "type": "nominal", "sort": "-y"},
                "y": {"field": value_field, "type": "quantitative"},
                "tooltip": _tooltip_encoding(column_info),
            },
        }
    )
    return spec


def _scatter_chart(
    data: List[Dict[str, Any]],
    x_field: str,
    y_field: str,
    column_info: Dict[str, Dict[str, Any]],
    categorical_cols: List[str],
) -> Dict[str, Any]:
    spec = _base_chart(data)
    encoding = {
        "x": {"field": x_field, "type": "quantitative"},
        "y": {"field": y_field, "type": "quantitative"},
        "tooltip": _tooltip_encoding(column_info),
    }
    if categorical_cols:
        encoding["color"] = {
            "field": categorical_cols[0],
            "type": "nominal",
        }
    spec.update({"mark": {"type": "point", "tooltip": True}, "encoding": encoding})
    return spec
