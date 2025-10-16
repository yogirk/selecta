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

from selecta import storage
from selecta.agent import refresh_agent, selecta_agent
from selecta.config_loader import (
    DatasetDescriptor,
    get_active_dataset_descriptor,
    list_dataset_descriptors,
    set_dataset_config_path,
)
from selecta.markdown_parser import parse_structured_sections

logger = logging.getLogger(__name__)

APP_NAME = "selecta_service"
DEFAULT_USER_ID = "user_1"

session_service: InMemorySessionService = InMemorySessionService()
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


class DatasetMetadata(BaseModel):
    id: str
    displayName: Optional[str] = None
    description: Optional[str] = None
    model: Optional[str] = None
    configPath: str


class ResultPayload(BaseModel):
    resultId: str
    sql: str
    rowCount: int
    columns: List[str]
    rows: List[Dict[str, Any]]
    chart: Optional[Dict[str, Any]] = None
    summary: Optional[str] = None
    resultsMarkdown: Optional[str] = None
    businessInsights: Optional[str] = None
    suggestions: Optional[List[Dict[str, Any]]] = None
    createdAt: str


class ChatResponse(BaseModel):
    session_id: str
    messages: List[ChatMessage]
    results: List[ResultPayload]
    dataset: DatasetMetadata
    visualizations: List["VisualizationPayload"]
    insights: List["InsightsPayload"]
    suggestions: List["SuggestionsPayload"]


class DatasetListItem(DatasetMetadata):
    isActive: bool


class DatasetSwitchRequest(BaseModel):
    datasetId: str = Field(..., description="Identifier of the dataset to activate.")


class DatasetSwitchResponse(BaseModel):
    dataset: DatasetMetadata


class VisualizationPayload(BaseModel):
    resultId: str
    chart: Dict[str, Any]


class InsightsPayload(BaseModel):
    resultId: str
    summary: Optional[str] = None
    resultsMarkdown: Optional[str] = None
    businessInsights: Optional[str] = None


class SuggestionsPayload(BaseModel):
    resultId: str
    suggestions: List[Dict[str, Any]] = Field(default_factory=list)


ChatResponse.model_rebuild()


def _dataset_metadata_from_descriptor(descriptor: DatasetDescriptor) -> DatasetMetadata:
    return DatasetMetadata(
        id=descriptor.id or descriptor.path.stem,
        displayName=descriptor.display_name,
        description=descriptor.description,
        model=descriptor.model,
        configPath=str(descriptor.path),
    )


def _get_dataset_metadata() -> DatasetMetadata:
    descriptor = get_active_dataset_descriptor()
    return _dataset_metadata_from_descriptor(descriptor)


def _reset_runner() -> None:
    global runner, session_service
    session_service = InMemorySessionService()
    runner = None


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
async def healthcheck() -> Dict[str, Any]:
    dataset_meta = _get_dataset_metadata()
    return {"status": "ok", "dataset": dataset_meta.model_dump()}


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
        sections = parse_structured_sections(aggregated)
        if any([sections.summary, sections.results, sections.business_insights]):
            storage.apply_structured_sections_to_latest_result(
                session_id=session_id,
                summary=sections.summary,
                results_markdown=sections.results,
                business_insights=sections.business_insights,
            )


def _build_results(session_id: str) -> List[ResultPayload]:
    return [ResultPayload(**result) for result in storage.get_session_results(session_id)]


def _prepare_message_content(text: str) -> ChatMessage:
    return ChatMessage(role="assistant", content=text)


def _build_visualizations(results: List[ResultPayload]) -> List[VisualizationPayload]:
    payloads: List[VisualizationPayload] = []
    for result in results:
        if result.chart:
            payloads.append(VisualizationPayload(resultId=result.resultId, chart=result.chart))
    return payloads


def _build_insights(results: List[ResultPayload]) -> List[InsightsPayload]:
    payloads: List[InsightsPayload] = []
    for result in results:
        if any([result.summary, result.resultsMarkdown, result.businessInsights]):
            payloads.append(
                InsightsPayload(
                    resultId=result.resultId,
                    summary=result.summary,
                    resultsMarkdown=result.resultsMarkdown,
                    businessInsights=result.businessInsights,
                )
            )
    return payloads


def _build_suggestions(results: List[ResultPayload]) -> List[SuggestionsPayload]:
    return [
        SuggestionsPayload(resultId=result.resultId, suggestions=result.suggestions or [])
        for result in results
    ]


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
    dataset_meta = _get_dataset_metadata()
    visualizations = _build_visualizations(results)
    insights = _build_insights(results)
    suggestions = _build_suggestions(results)
    return ChatResponse(
        session_id=session_id,
        messages=agent_responses,
        results=results,
        dataset=dataset_meta,
        visualizations=visualizations,
        insights=insights,
        suggestions=suggestions,
    )


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

    dataset_meta = _get_dataset_metadata()

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
            results_payload = _build_results(session_id)
            visualizations = _build_visualizations(results_payload)
            insights = _build_insights(results_payload)
            suggestions_payloads = _build_suggestions(results_payload)

            for viz in visualizations:
                yield {
                    "event": "visualization",
                    "data": json.dumps(viz.model_dump()),
                }

            for insight in insights:
                yield {
                    "event": "insights",
                    "data": json.dumps(insight.model_dump()),
                }

            for suggestion in suggestions_payloads:
                yield {
                    "event": "suggestions",
                    "data": json.dumps(suggestion.model_dump()),
                }

            yield {
                "event": "complete",
                "data": json.dumps(
                    {
                        "session_id": session_id,
                        "dataset": dataset_meta.model_dump(),
                        "results": [result.model_dump() for result in results_payload],
                        "visualizations": [viz.model_dump() for viz in visualizations],
                        "insights": [insight.model_dump() for insight in insights],
                        "suggestions": [suggestion.model_dump() for suggestion in suggestions_payloads],
                    }
                ),
            }
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("Streaming chat failed: %s", exc)
            yield {"event": "error", "data": json.dumps({"detail": str(exc)})}

    return EventSourceResponse(event_generator())


@app.get("/api/sessions", tags=["sessions"])
async def list_sessions(limit: int = 50) -> List[Dict[str, Any]]:
    dataset_meta = _get_dataset_metadata()
    sessions = storage.list_sessions(limit)
    for session in sessions:
        session["datasetId"] = dataset_meta.id
        session["datasetDisplayName"] = dataset_meta.displayName
    return sessions


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


@app.get("/api/datasets", response_model=List[DatasetListItem], tags=["config"])
async def list_datasets() -> List[DatasetListItem]:
    descriptors = list_dataset_descriptors()
    active_descriptor = get_active_dataset_descriptor()
    active_path = active_descriptor.path.resolve()
    seen_paths = {descriptor.path.resolve() for descriptor in descriptors}
    if active_path not in seen_paths:
        descriptors.append(active_descriptor)

    items: List[DatasetListItem] = []
    for descriptor in descriptors:
        metadata = _dataset_metadata_from_descriptor(descriptor)
        items.append(
            DatasetListItem(
                **metadata.model_dump(),
                isActive=descriptor.path.resolve() == active_path,
            )
        )
    return items


@app.post("/api/config/dataset", response_model=DatasetSwitchResponse, tags=["config"])
async def switch_dataset(request: DatasetSwitchRequest) -> DatasetSwitchResponse:
    descriptors = list_dataset_descriptors()
    target = next((item for item in descriptors if item.id == request.datasetId), None)
    if target is None:
        raise HTTPException(status_code=404, detail=f"Dataset '{request.datasetId}' not found.")

    set_dataset_config_path(target.path)
    refresh_agent()
    _reset_runner()
    dataset_meta = _get_dataset_metadata()
    logger.info("Dataset switched to %s (%s)", dataset_meta.id, dataset_meta.configPath)
    return DatasetSwitchResponse(dataset=dataset_meta)
