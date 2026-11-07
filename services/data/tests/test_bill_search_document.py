import pytest
from lawdigest_data.bills.search_document import build_bill_search_document


def test_build_bill_search_document_combines_weighted_search_text():
    row = {
        "bill_id": "BILL-1",
        "bill_name": "데이터 법안",
        "title": "짧은 요약",
        "gpt_summary": "AI 요약",
        "summary": "원문 요약",
        "modified_date": "2026-06-27 10:00:00",
    }

    document = build_bill_search_document(row)

    assert document["bill_id"] == "BILL-1"
    assert document["bill_name_text"] == "데이터 법안"
    assert document["title_text"] == "짧은 요약"
    assert document["gpt_summary_text"] == "AI 요약"
    assert document["raw_summary_text"] == "원문 요약"
    assert document["source_modified_date"] == "2026-06-27 10:00:00"
    assert document["search_text"].count("데이터 법안") == 3
    assert document["search_text"].count("짧은 요약") == 2
    assert "AI 요약" in document["search_text"]
    assert "원문 요약" in document["search_text"]


def test_build_bill_search_document_returns_none_without_bill_id():
    assert build_bill_search_document({"summary": "원문 요약"}) is None


@pytest.mark.parametrize(
    "tags",
    ['["쉬운우리말", "법률접근성"]', ["쉬운우리말", "법률접근성"]],
)
def test_build_bill_search_document_makes_tags_searchable(tags):
    document = build_bill_search_document({"bill_id": "BILL-1", "summary_tags": tags})

    assert document["search_text"].count("쉬운우리말 법률접근성") == 2


@pytest.mark.parametrize("tags", [None, "", "태그 아님", "{}", 3])
def test_build_bill_search_document_ignores_invalid_tags(tags):
    document = build_bill_search_document(
        {"bill_id": "BILL-1", "bill_name": "데이터 법안", "summary_tags": tags}
    )

    assert document["search_text"] == "\n".join(["데이터 법안"] * 3)
