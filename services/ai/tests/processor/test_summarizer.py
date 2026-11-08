from unittest.mock import patch
import pandas as pd


def test_summarizer_skips_already_summarized():
    from lawdigest_ai.processor.summarizer import AISummarizer
    summarizer = AISummarizer()
    df = pd.DataFrame([{
        "bill_id": "B001", "bill_name": "테스트법", "summary": "내용",
        "title": "이미 요약됨", "gpt_summary": "상세 요약 있음",
        "proposers": "홍길동", "proposer_kind": "의원발의",
        "proposeDate": "2024-01-01", "stage": "위원회"
    }])
    result = summarizer.AI_structured_summarize(df)
    assert len(result) == 1
    assert result.iloc[0]["title"] == "이미 요약됨"


def test_summarizer_processes_unsummarized():
    from lawdigest_ai.processor.summarizer import AISummarizer, StructuredBillSummary
    mock_result = StructuredBillSummary(
        title="요약 제목",
        gpt_summary="상세 요약 내용",
        tags=["세금", "부동산", "의회", "법안", "개정"],
        category="경제·세금",
    )
    with patch.object(AISummarizer, "_summarize_one", return_value=mock_result):
        summarizer = AISummarizer()
        df = pd.DataFrame([{
            "bill_id": "B002", "bill_name": "새법안", "summary": "원문",
            "title": None, "gpt_summary": None,
            "proposers": "김의원", "proposer_kind": "의원발의",
            "proposeDate": "2024-01-01", "stage": "본회의"
        }])
        result = summarizer.AI_structured_summarize(df)
    assert result.iloc[0]["title"] == "요약 제목"
    assert result.iloc[0]["gpt_summary"] == "상세 요약 내용"
    assert result.iloc[0]["category"] == "economy"


def test_pydantic_ai_summarizer_reuses_batch_prompt():
    from lawdigest_ai.processor.summarizer import AISummarizer

    summarizer = AISummarizer()
    prompt = summarizer._build_user_prompt({
        "bill_id": "B010",
        "bill_name": "동일프롬프트법",
        "summary": "원문",
        "proposers": "김의원",
        "proposer_kind": "의원발의",
    })

    assert "다음 법안 정보를 보고 JSON으로만 응답하세요." in prompt
    assert "키는 title, gptSummary, tags, category 네 개만 포함해야 합니다." in prompt
    assert "category는 아래 17개 분야" in prompt
    assert "카드에 표시할 설명형 제목" in prompt
    assert "[대상·바뀌는 내용·목적]하기 위한 법안" in prompt
    assert "정식 법안명(bill_name)을 붙이지 마세요." in prompt
