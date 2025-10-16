import json
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from google.adk.runners import Runner
from google.adk.sessions.in_memory_session_service import InMemorySessionService

from google.genai import types as genai_types

from sse_starlette.sse import EventSourceResponse

from selecta.agent import selecta_agent
from selecta import storage

logger = logging.getLogger(__name__)

APP_NAME = "selecta_service"
DEFAULT_USER_ID = "user_1"

session_service = InMemorySessionService()
runner: Optional[Runner] = None


class MessagePayload(BaseModel):
    role: str = Field(..., description="Actor sending the message, typically 'user'.")
    message: str = Field(..., description="Natural language prompt for the agent.")


class ChatRequest(BaseModel):
    user_id: Optional[str] = Field(default=None, description="Caller-provided user identifier.")
    session_id: Optional[str] = Field(default=None, description="Existing session identifier.")
    message: MessagePayload


class ChatMessage(BaseModel):
    role: str
    content: str


class ResultPayload(BaseModel):
    resultId: str
    sql: str
    rowCount: int
    columns: List[str]
    rows: List[Dict[str, Any]]
    createdAt: str


class ChatResponse(BaseModel):
    session_id: str
    messages: List[ChatMessage]
    results: List[ResultPayload]


def _ensure_runner() -> Runner:
    global runner
    if runner is not None:
        return runner

    if not selecta_agent:
        raise RuntimeError("Root agent is not initialised.")

    runner = Runner(
        app_name=APP_NAME,
        agent=selecta_agent,
        session_service=session_service,
    )
    logger.info("ADK Runner initialised (FastAPI service).")
    return runner


app = FastAPI(
    title="Selecta API",
    description="FastAPI wrapper around the Selecta ADK agent.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
    storage.init_db()
    _ensure_runner()


@app.get("/healthz", tags=["system"])
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


def _resolve_session(
    *,
    runner_instance: Runner,
    user_id: str,
    session_id: Optional[str],
) -> str:
    session = None
    if session_id:
        session = session_service.get_session(
            app_name=runner_instance.app_name,
            user_id=user_id,
            session_id=session_id,
        )
    if not session:
        session = session_service.create_session(
            app_name=runner_instance.app_name,
            user_id=user_id,
        )
    storage.ensure_session(session.id, user_id)
    return session.id


def _log_user_message(session_id: str, text: str) -> None:
    storage.append_message(session_id, "user", text)


def _log_agent_message(session_id: str, parts: List[str]) -> None:
    aggregated = "\n\n".join(parts).strip()
    if aggregated:
        storage.append_message(session_id, "assistant", aggregated)


def _build_results(session_id: str) -> List[ResultPayload]:
    return [ResultPayload(**result) for result in storage.get_session_results(session_id)]


def _prepare_message_content(text: str) -> ChatMessage:
    return ChatMessage(role="assistant", content=text)


@app.post("/api/chat", response_model=ChatResponse, tags=["chat"])
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    runner_instance = _ensure_runner()

    user_id = request.user_id or DEFAULT_USER_ID
    if not request.message or not request.message.message.strip():
        raise HTTPException(status_code=400, detail="Message text is required.")

    session_id = _resolve_session(
        runner_instance=runner_instance,
        user_id=user_id,
        session_id=request.session_id,
    )
    _log_user_message(session_id, request.message.message)

    agent_responses: List[ChatMessage] = []
    agent_parts: List[str] = []

    try:
        new_message = genai_types.Content(
            parts=[genai_types.Part(text=request.message.message)],
            role="user",
        )

        async for event in runner_instance.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=new_message,
        ):
            content = getattr(event, "content", None)
            if not content or not getattr(content, "parts", None):
                continue
            role = content.role or "assistant"
            for part in content.parts:
                text = getattr(part, "text", "")
                if text:
                    agent_responses.append(ChatMessage(role=role, content=text))
                    agent_parts.append(text)
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Chat processing failed: %s", exc)
        raise HTTPException(status_code=500, detail="Agent processing failed.") from exc

    if not agent_responses:
        agent_responses.append(ChatMessage(role="system", content="No response generated."))
        _log_agent_message(session_id, ["No response generated."])
    else:
        _log_agent_message(session_id, agent_parts)

    results = _build_results(session_id)
    return ChatResponse(session_id=session_id, messages=agent_responses, results=results)


@app.post("/api/chat/stream", tags=["chat"])
async def chat_stream_endpoint(request: ChatRequest) -> EventSourceResponse:
    runner_instance = _ensure_runner()

    user_id = request.user_id or DEFAULT_USER_ID
    if not request.message or not request.message.message.strip():
        raise HTTPException(status_code=400, detail="Message text is required.")

    session_id = _resolve_session(
        runner_instance=runner_instance,
        user_id=user_id,
        session_id=request.session_id,
    )
    _log_user_message(session_id, request.message.message)

    async def event_generator() -> AsyncGenerator[Dict[str, str], None]:
        agent_parts: List[str] = []
        try:
            new_message = genai_types.Content(
                parts=[genai_types.Part(text=request.message.message)],
                role="user",
            )

            yield {"event": "session", "data": json.dumps({"session_id": session_id})}

            async for event in runner_instance.run_async(
                user_id=user_id,
                session_id=session_id,
                new_message=new_message,
            ):
                content = getattr(event, "content", None)
                if not content or not getattr(content, "parts", None):
                    continue
                role = content.role or "assistant"
                for part in content.parts:
                    text = getattr(part, "text", "")
                    if text:
                        agent_parts.append(text)
                        yield {
                            "event": "message",
                            "data": json.dumps({"role": role, "content": text}),
                        }

            _log_agent_message(session_id, agent_parts)
            yield {
                "event": "complete",
                "data": json.dumps({
                    "session_id": session_id,
                    "results": _build_results(session_id),
                }),
            }
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("Streaming chat failed: %s", exc)
            yield {"event": "error", "data": json.dumps({"detail": str(exc)})}

    return EventSourceResponse(event_generator())


@app.get("/api/sessions", tags=["sessions"])
async def list_sessions(limit: int = 50) -> List[Dict[str, Any]]:
    return storage.list_sessions(limit)


@app.get("/api/sessions/{session_id}/messages", tags=["sessions"])
async def get_session_messages(session_id: str) -> List[Dict[str, Any]]:
    return storage.get_session_messages(session_id)


@app.get("/api/sessions/{session_id}/results", tags=["sessions"])
async def get_session_results(session_id: str) -> List[Dict[str, Any]]:
    return storage.get_session_results(session_id)


@app.get("/api/results/{result_id}", tags=["sessions"])
async def get_result(result_id: str) -> Dict[str, Any]:
    result = storage.get_result(result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return result
