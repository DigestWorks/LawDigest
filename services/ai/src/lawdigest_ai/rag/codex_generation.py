"""Run the public QA prompt with a dedicated, tool-free Codex invocation."""

import json
import os
import subprocess
import time
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
        return self.generate(instructions, context)

    def generate(
        self,
        instructions,
        context,
        *,
        schema_type=GeneratedAnswer,
        cancel=None,
        timeout=25,
    ):
        with TemporaryDirectory(prefix="lawdigest-qa-") as workdir:
            directory = Path(workdir)
            schema = directory / "answer-schema.json"
            output = directory / "answer.json"
            schema.write_text(
                json.dumps(schema_type.model_json_schema()), encoding="utf-8"
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
                runner = subprocess.run if cancel is None else self._run_cancellable
                result = runner(
                    command,
                    cwd=directory,
                    env=env,
                    input=json.dumps(context, ensure_ascii=False),
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    timeout=timeout,
                    check=False,
                    **({"cancel": cancel} if cancel is not None else {}),
                )
                if result.returncode != 0 or not output.is_file():
                    raise CodexGenerationError("Codex 답변 생성에 실패했습니다.")
                self._verify_events(result.stdout)
                return schema_type.model_validate_json(
                    output.read_text(encoding="utf-8")
                )
            except (OSError, ValueError, subprocess.TimeoutExpired) as exc:
                raise CodexGenerationError(
                    "완성된 Codex 답변을 확인할 수 없습니다."
                ) from exc

    @staticmethod
    def _run_cancellable(command, *, input, timeout, cancel, **kwargs):
        kwargs.pop("check", None)
        kwargs.pop("capture_output", None)
        if cancel.is_set():
            raise CodexGenerationError("답변 생성을 중지했습니다.")
        deadline = time.monotonic() + timeout
        with subprocess.Popen(
            command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            **kwargs,
        ) as process:
            try:
                first = True
                while not cancel.is_set():
                    remaining = deadline - time.monotonic()
                    if remaining <= 0:
                        raise subprocess.TimeoutExpired(command, timeout)
                    try:
                        stdout, stderr = process.communicate(
                            input=input if first else None, timeout=min(0.1, remaining)
                        )
                        return subprocess.CompletedProcess(
                            command, process.returncode, stdout, stderr
                        )
                    except subprocess.TimeoutExpired:
                        first = False
                raise CodexGenerationError("답변 생성을 중지했습니다.")
            finally:
                if process.poll() is None:
                    process.kill()
                    process.communicate()

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
