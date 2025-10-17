import re
from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass(frozen=True)
class StructuredSections:
    summary: str
    results: str
    business_insights: str


_SECTION_HEADERS = {
    "summary": "summary",
    "results": "results",
    "business insights": "business_insights",
}

_PLAIN_HEADINGS = set(_SECTION_HEADERS.keys())

_HEADING_PATTERN = re.compile(r"^#{1,6}\s+(?P<header>.+?)\s*$")


def _normalise_header(header: str) -> str:
    return header.strip().lower()


def _clean_text(text: str) -> str:
    return text.strip()


def parse_structured_sections(markdown: str) -> StructuredSections:
    """Extract key sections from agent markdown output."""
    sections: Dict[str, List[str]] = {value: [] for value in _SECTION_HEADERS.values()}

    current_section: Optional[str] = None
    for raw_line in markdown.splitlines():
        stripped = raw_line.strip()
        if not stripped:
            if current_section:
                sections[current_section].append("")
            continue

        match = _HEADING_PATTERN.match(stripped)
        section_key: Optional[str] = None
        if match:
            normalised = _normalise_header(match.group("header"))
            section_key = _SECTION_HEADERS.get(normalised)
        elif stripped.lower() in _PLAIN_HEADINGS:
            section_key = _SECTION_HEADERS[stripped.lower()]

        if section_key:
            current_section = section_key
            continue

        if current_section:
            sections[current_section].append(raw_line)

    def join_section(name: str) -> str:
        content = "\n".join(sections[name]).strip()
        return _clean_text(content)

    return StructuredSections(
        summary=join_section("summary"),
        results=join_section("results"),
        business_insights=join_section("business_insights"),
    )
