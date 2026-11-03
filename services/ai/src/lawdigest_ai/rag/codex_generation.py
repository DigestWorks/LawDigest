"""Run the public QA prompt with a dedicated, tool-free Codex invocation."""

import json
import os
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

from lawdigest_ai.config import BILL_CODEX_MODEL
from lawdigest_ai.rag.schemas import GeneratedAnswer

class CodexGenerationError(RuntimeError):
    pass


class CodexAnswerGenerator:
    def __init__(self, settings):
        self.settings = settings

    def __call__(self, instructions, context):
        with TemporaryDirectory(prefix="lawdigest-qa-") as workdir:
            directory = Path(workdir)
            schema = directory / "answer-schema.json"
            output = directory / "answer.json"
            schema.write_text(
                json.dumps(GeneratedAnswer.model_json_schema()), encoding="utf-8"
            )
            env = {
                "PATH": os.defpath,
                "CODEX_HOME": self.settings.codex_home or workdir,
            }
            if self.settings.codex_api_key:
                env["CODEX_API_KEY"] = self.settings.codex_api_key
            command = [
                self.settings.codex_bin,
                "-a",
                "never",
                "exec",
                "--model",
                BILL_CODEX_MODEL,
                "--sandbox",
                "read-only",
                "--skip-git-repo-check",
                "--ephemeral",
                "--ignore-user-config",
                "--ignore-rules",
                "--disable",
                "shell_tool",
                "--disable",
                "apps",
                "--disable",
                "plugins",
                "--disable",
                "hooks",
                "--disable",
                "multi_agent",
                "--disable",
                "multi_agent_v2",
                "-c",
                'web_search="disabled"',
                "--output-schema",
                str(schema),
                "--output-last-message",
                str(output),
                "--json",
                instructions,
            ]
            try:
                result = subprocess.run(
                    command,
                    cwd=directory,
                    env=env,
                    input=json.dumps(context, ensure_ascii=False),
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    timeout=25,
                    check=False,
                )
                if result.returncode != 0 or not output.is_file():
                    raise CodexGenerationError("Codex 답변 생성에 실패했습니다.")
                self._verify_events(result.stdout)
                return GeneratedAnswer.model_validate_json(
                    output.read_text(encoding="utf-8")
                )
            except (OSError, ValueError, subprocess.TimeoutExpired) as exc:
                raise CodexGenerationError(
                    "완성된 Codex 답변을 확인할 수 없습니다."
                ) from exc

    @staticmethod
    def _verify_events(stdout):
        completed = False
        for line in stdout.splitlines():
            event = json.loads(line)
            event_type = event.get("type", "")
            if event_type in {"error", "turn.failed"}:
                raise CodexGenerationError("Codex 답변 생성에 실패했습니다.")
            if event_type == "turn.completed":
                completed = True
            if event_type.startswith("item.") and event.get("item", {}).get(
                "type"
            ) not in {
                "agent_message",
                "reasoning",
            }:
                raise CodexGenerationError(
                    "답변 생성 중 허용되지 않은 도구가 감지됐습니다."
                )
        if not completed:
            raise CodexGenerationError("Codex 답변 생성이 완료되지 않았습니다.")
