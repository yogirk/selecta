import math
from datetime import datetime
from typing import Any, Dict, List, Optional

from .constants import AUTO_VIZ_ENABLED, VIZ_MAX_DISTINCT, VIZ_MAX_ROWS

VEGA_SCHEMA_URL = "https://vega.github.io/schema/vega-lite/v5.json"
DEFAULT_CHART_HEIGHT = 320
MAX_CATEGORICAL_BARS = 12
LABEL_TRUNCATE = 16

THEME_CONFIG: Dict[str, Any] = {
    "background": "transparent",
    "font": "Inter, 'Segoe UI', system-ui, sans-serif",
    "padding": 12,
    "axis": {
        "labelColor": "#4b5563",
        "labelFontSize": 12,
        "titleColor": "#1f2937",
        "titleFontWeight": 600,
        "gridColor": "rgba(148, 163, 184, 0.3)",
        "gridOpacity": 1,
        "tickColor": "rgba(148, 163, 184, 0.4)",
    },
    "legend": {
        "labelColor": "#4b5563",
        "titleColor": "#1f2937",
        "labelFontSize": 12,
    },
    "view": {"stroke": "transparent"},
    "range": {
        "category": [
            "#a78bfa",
            "#c084fc",
            "#d8b4fe",
            "#e9d5ff",
            "#a78bfa",
            "#c084fc",
            "#d8b4fe",
            "#e9d5ff",
        ]
    },
}


def build_chart_bundle(rows: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Build a bundle of chart specifications with a default selection."""
    if not AUTO_VIZ_ENABLED or not rows or len(rows) > VIZ_MAX_ROWS:
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

    charts: List[Dict[str, Any]] = []

    def add_chart(chart_id: str, label: str, spec: Optional[Dict[str, Any]]) -> None:
        if not spec:
            return
        themed = _apply_theme(spec)
        charts.append({"id": chart_id, "label": label, "spec": themed})

    if temporal_cols and numeric_cols:
        x_field = temporal_cols[0]
        y_field = numeric_cols[0]
        add_chart("line", "Line", _line_chart(sample, x_field, y_field, column_info))
        add_chart("area", "Area", _area_chart(sample, x_field, y_field, column_info))
    elif categorical_cols and numeric_cols:
        category_field = categorical_cols[0]
        value_field = numeric_cols[0]
        use_horizontal = _should_use_horizontal_bars(sample, category_field)
        default_orientation = "horizontal" if use_horizontal else "vertical"
        add_chart(
            f"bar-{default_orientation}",
            f"Bar ({'Horizontal' if use_horizontal else 'Vertical'})",
            _bar_chart_spec(sample, category_field, value_field, column_info, default_orientation),
        )
        alternate_orientation = "vertical" if use_horizontal else "horizontal"
        add_chart(
            f"bar-{alternate_orientation}",
            f"Bar ({'Vertical' if use_horizontal else 'Horizontal'})",
            _bar_chart_spec(sample, category_field, value_field, column_info, alternate_orientation),
        )
        distinct_count = column_info.get(category_field, {}).get("distinct", len({row.get(category_field) for row in sample}))
        if 2 <= distinct_count <= 8:
            add_chart("donut", "Donut", _donut_chart(sample, category_field, value_field))
    elif len(numeric_cols) >= 2:
        add_chart("scatter", "Scatter", _scatter_chart(sample, numeric_cols[0], numeric_cols[1], column_info, categorical_cols))

    if not charts:
        return None

    # Remove duplicates by id while preserving order
    seen = set()
    unique_charts: List[Dict[str, Any]] = []
    for chart in charts:
        if chart["id"] in seen:
            continue
        seen.add(chart["id"])
        unique_charts.append(chart)

    if not unique_charts:
        return None

    return {
        "defaultChartId": unique_charts[0]["id"],
        "charts": unique_charts,
    }


def build_chart_spec(rows: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    bundle = build_chart_bundle(rows)
    if not bundle:
        return None
    return bundle["charts"][0]["spec"]


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


def _label_trunc_expr(max_length: int) -> str:
    return (
        f"length(datum.label) > {max_length} ? substring(datum.label, 0, {max_length}) + '…' : datum.label"
    )


def _should_use_horizontal_bars(rows: List[Dict[str, Any]], category_field: str) -> bool:
    if not rows:
        return False
    labels = [str(row.get(category_field, "")) for row in rows]
    if not labels:
        return False
    max_len = max(len(label) for label in labels)
    avg_len = sum(len(label) for label in labels) / len(labels)
    return max_len >= 16 or avg_len >= 13


def _merge_dicts(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    result = dict(base)
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _merge_dicts(result[key], value)
        else:
            result[key] = value
    return result


def _apply_theme(spec: Dict[str, Any]) -> Dict[str, Any]:
    config = spec.get("config") or {}
    spec["config"] = _merge_dicts(THEME_CONFIG, config)
    spec.setdefault("height", DEFAULT_CHART_HEIGHT)
    spec.setdefault("width", "container")
    spec.setdefault("autosize", {"type": "fit", "contains": "padding"})
    return spec


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
            "mark": {
                "type": "line",
                "tooltip": True,
                "point": {"filled": True, "size": 45, "opacity": 0.85},
                "strokeWidth": 2.5,
            },
            "encoding": {
                "x": {
                    "field": x_field,
                    "type": "temporal",
                    "axis": {"labelAngle": 0, "labelFlush": True, "labelOverlap": "parity"},
                },
                "y": {
                    "field": y_field,
                    "type": "quantitative",
                    "axis": {"gridDash": [2, 4]},
                },
                "tooltip": _tooltip_encoding(column_info),
            },
        }
    )
    return spec


def _bar_chart_spec(
    data: List[Dict[str, Any]],
    category_field: str,
    value_field: str,
    column_info: Dict[str, Dict[str, Any]],
    orientation: str,
) -> Dict[str, Any]:
    sorted_data = sorted(
        data,
        key=lambda row: (row.get(value_field) if isinstance(row.get(value_field), (int, float)) else 0),
        reverse=True,
    )
    limited_data = sorted_data[:MAX_CATEGORICAL_BARS]
    spec = _base_chart(limited_data)

    category_sort = "-x" if orientation == "horizontal" else "-y"
    category_axis = {
        "labelLimit": 140,
        "labelPadding": 6,
        "labelExpr": _label_trunc_expr(LABEL_TRUNCATE),
    }

    quantitative_axis = {
        "axis": {"gridDash": [2, 4]},
    }

    mark = {
        "type": "bar",
        "tooltip": True,
        "cornerRadiusEnd": 6,
        "stroke": None,
    }

    if orientation == "horizontal":
        encoding = {
            "y": {
                "field": category_field,
                "type": "nominal",
                "sort": category_sort,
                "axis": category_axis,
            },
            "x": {"field": value_field, "type": "quantitative", **quantitative_axis},
            "tooltip": _tooltip_encoding(column_info),
        }
    else:
        encoding = {
            "x": {
                "field": category_field,
                "type": "nominal",
                "sort": category_sort,
                "axis": {**category_axis, "labelAngle": -18},
            },
            "y": {"field": value_field, "type": "quantitative", **quantitative_axis},
            "tooltip": _tooltip_encoding(column_info),
        }

    spec.update({"mark": mark, "encoding": encoding})
    return spec


def _area_chart(
    data: List[Dict[str, Any]],
    x_field: str,
    y_field: str,
    column_info: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    spec = _base_chart(data)
    spec.update(
        {
            "mark": {
                "type": "area",
                "tooltip": True,
                "line": {"strokeWidth": 2.2},
                "point": {"filled": True, "size": 35, "opacity": 0.8},
                "opacity": 0.85,
            },
            "encoding": {
                "x": {
                    "field": x_field,
                    "type": "temporal",
                    "axis": {"labelAngle": 0, "labelFlush": True, "labelOverlap": "parity"},
                },
                "y": {
                    "field": y_field,
                    "type": "quantitative",
                    "axis": {"gridDash": [2, 4]},
                },
                "tooltip": _tooltip_encoding(column_info),
            },
        }
    )
    return spec


def _donut_chart(
    data: List[Dict[str, Any]],
    category_field: str,
    value_field: str,
) -> Dict[str, Any]:
    spec = _base_chart(data)
    spec.update(
        {
            "mark": {
                "type": "arc",
                "tooltip": True,
                "innerRadius": 60,
                "cornerRadius": 6,
            },
            "encoding": {
                "theta": {"field": value_field, "type": "quantitative"},
                "color": {"field": category_field, "type": "nominal", "sort": "-theta"},
                "tooltip": [
                    {"field": category_field, "type": "nominal"},
                    {"field": value_field, "type": "quantitative"},
                ],
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
