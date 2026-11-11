import json
import subprocess
from dataclasses import replace
from pathlib import Path

import pytest

from lawdigest_ai.rag.codex_generation import CodexAnswerGenerator, CodexGenerationError
from lawdigest_ai.rag.settings import RagSettings


def test_cli_uses_terra_and_only_passes_dedicated_auth(monkeypatch):
    settings = replace(RagSettings(), codex_api_key="dedicated")
    monkeypatch.setenv("DB_PASSWORD", "never pass this")

    def run(args, **kwargs):
        assert args[args.index("--model") + 1] == "gpt-6.1-terra"
        assert args[args.index("--sandbox") + 1] == "read-only"
        assert {"shell_tool", "multi_agent", "apps", "hooks"}.issubset(args)
        assert "--ephemeral" in args and "--ignore-user-config" in args
        assert kwargs["env"]["CODEX_API_KEY"] == "dedicated"
        assert "DB_PASSWORD" not in kwargs["env"]
        assert json.loads(kwargs["input"]) == {"question": "공개 법안 질문"}
        assert args[-1] == "고정 생성 지시"
        schema = Path(args[args.index("--output-schema") + 1])
        assert set(json.loads(schema.read_text())["required"]) == {
            "answerable",
            "paragraphs",
            "limitations",
        }
        output = Path(args[args.index("--output-last-message") + 1])
        output.write_text('{"answerable":false,"paragraphs":[],"limitations":[]}')
        return subprocess.CompletedProcess(args, 0, '{"type":"turn.completed"}\n', "")

    monkeypatch.setattr("lawdigest_ai.rag.codex_generation.subprocess.run", run)
    answer = CodexAnswerGenerator(settings)(
        "고정 생성 지시", {"question": "공개 법안 질문"}
    )
    assert answer.answerable is False


@pytest.mark.parametrize(
    "events",
    [
        '{"type":"turn.failed"}',
        '{"type":"item.completed","item":{"type":"command_execution"}}\n{"type":"turn.completed"}',
        '{"type":"thread.started"}',
    ],
)
def test_cli_rejects_failed_incomplete_or_tool_using_turn(events):
    with pytest.raises(CodexGenerationError):
        CodexAnswerGenerator._verify_events(events)
