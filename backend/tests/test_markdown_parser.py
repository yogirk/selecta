from selecta.markdown_parser import StructuredSections, parse_structured_sections


def test_parse_structured_sections_happy_path():
    markdown = """### Summary
Key takeaway line.

### Results
| Col | Value |
| --- | ----- |
| A   | 1     |

### Business Insights
- Focus on upselling accessories.
"""
    sections = parse_structured_sections(markdown)
    assert sections == StructuredSections(
        summary="Key takeaway line.",
        results="| Col | Value |\n| --- | ----- |\n| A   | 1     |",
        business_insights="- Focus on upselling accessories.",
    )


def test_parse_structured_sections_missing_headings():
    markdown = """### Summary
Quick note.

### Something Else
Ignored content.
"""
    sections = parse_structured_sections(markdown)
    assert sections.summary == "Quick note."
    assert sections.results == ""
    assert sections.business_insights == ""
