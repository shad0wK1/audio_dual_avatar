from __future__ import annotations

import asyncio
import hashlib
import json
import secrets
import time
from collections import OrderedDict, deque
from collections.abc import Awaitable
from datetime import UTC, datetime, timedelta
from uuid import NAMESPACE_URL, UUID, uuid4, uuid5

from fastapi import APIRouter, Cookie, Header, HTTPException, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.agents import (
    AgentServiceError,
    ConversationTurnConflictError,
)
from app.agents.direct_generation import router as media_turn_router
from app.api.client_identity import rate_limit_key, resolve_client_ip
from app.api.dependencies import (
    AdminWorkspaceId,
    AuthenticatedWorkspaceId,
    OwnedAsset,
    OwnedConversation,
    OwnedDramaProject,
    OwnedImageEvaluation,
    OwnedJob,
    OwnedProfessionalProject,
    SessionWorkspaceId,
    WorkspaceId,
)
from app.api.pagination import (
    CursorPage,
    decode_cursor,
    decode_pinned_cursor,
    encode_cursor,
    encode_pinned_cursor,
)
from app.container import AppContainer
from app.core.auth import (
    InvalidToken,
    hash_password,
    issue_action_token,
    issue_media_signature,
    issue_workspace_token,
    verify_action_token,
    verify_media_signature,
    verify_password,
    verify_workspace_token,
)
from app.domain.assets import Asset, AssetKind, AssetStatus, UploadTicket
from app.domain.auth import AuthSession, hash_refresh_token
from app.domain.automation import (
    ApiKeyRecord,
    WebhookDelivery,
    WebhookDeliveryStatus,
    WebhookEndpoint,
)
from app.domain.conversations import (
    AgentCapabilities,
    ConversationMessage,
    ConversationSummary,
    ReasoningEffort,
)
from app.domain.credits import CreditBalance, InsufficientCredits
from app.domain.dramas import (
    ApplyDramaStoryboardRequest,
    CreateDramaProjectRequest,
    CreateDramaShotRequest,
    DraftDramaStoryboardRequest,
    DramaAutomationPreview,
    DramaAutomationStatus,
    DramaProductionAudit,
    DramaProject,
    DramaShotGenerationResult,
    DramaStoryboardPreview,
    GenerateDramaShotRequest,
    ReorderDramaShotsRequest,
    ReplaceDramaStoryboardRequest,
    ReviewDramaShotRequest,
    StartDramaAutomationRequest,
    UpdateDramaProjectRequest,
    UpdateDramaShotRequest,
    UpsertDramaCharactersRequest,
)
from app.domain.evaluations import (
    CreateImageEvaluationRequest,
    ImageEvaluation,
)
from app.domain.generation import (
    Capability,
    GenerationBatchCreateResponse,
    GenerationBatchQuoteItem,
    GenerationBatchQuoteResponse,
    GenerationBatchRequest,
    GenerationJob,
    GenerationQuoteResponse,
    GenerationRequest,
    JobEvent,
    JobLookupRequest,
    JobStatus,
    Quote,
    generation_proposal_id,
    generation_request_digest,
)
from app.domain.history import capture_project_mutation
from app.domain.media_boundary import MediaBoundaryOperation
from app.domain.media_quality import MediaQualityCheck, MediaQualityOrigin
from app.domain.metrics import WorkspaceMetrics
from app.domain.professional import (
    ApplyScrollWorldMediaRequest,
    ComposeSafetyEducationRequest,
    CreateProfessionalProjectRequest,
    ProfessionalProject,
    ProfessionalProjectKind,
    ProfessionalRun,
    ProfessionalRunStatus,
    ScrollWorldConfig,
    StartProfessionalRunRequest,
    UpdateProfessionalProjectRequest,
    UpdateProfessionalRunRequest,
)
from app.domain.shares import ShareLink
from app.domain.users import User
from app.history import is_agent_request
from app.jobs import GenerationQueueFull
from app.operations import (
    AdminOperationsSnapshot,
    OperationsSnapshot,
    build_admin_operations_snapshot,
    build_operations_snapshot,
)
from app.providers import ProviderUnavailableError
from app.repositories import (
    AssetQuotaExceeded,
    ConcurrentModificationError,
    IdempotencyKeyConflict,
)
from app.services.storage import (
    AssetContentStream,
    RangeNotSatisfiable,
    ScrubVariantBusy,
    normalize_mime_type,
)

router = APIRouter(prefix="/v1")
router.include_router(media_turn_router)
_RATE_WINDOW_MAX_BUCKETS = 10_000
_rate_windows: OrderedDict[str, tuple[int, deque[float]]] = OrderedDict()
_sse_connections: dict[str, int] = {}
_sse_connections_lock = asyncio.Lock()
_MAX_SSE_CONNECTIONS_PER_SESSION = 6
_PUBLIC_JOB_EVENT_FIELDS = (
    "id",
    "title",
    "capability",
    "status",
    "stage",
    "progress",
    "prompt",
    "request",
    "context",
    "estimated_credits",
    "output_asset_ids",
    "error_code",
    "error_message",
    "retryable",
    "created_at",
    "updated_at",
)


def asset_stream_response(content: AssetContentStream, cache_control: str) -> StreamingResponse:
    headers = {
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": cache_control,
        "Accept-Ranges": "bytes",
        "Content-Length": str(content.content_length),
    }
    if content.partial:
        headers["Content-Range"] = f"bytes {content.start}-{content.end}/{content.total_size}"
    return StreamingResponse(
        content.chunks,
        status_code=(status.HTTP_206_PARTIAL_CONTENT if content.partial else status.HTTP_200_OK),
        media_type=content.mime_type,
        headers=headers,
    )


def public_job_event(event: JobEvent) -> dict[str, object]:
    value = event.model_dump(mode="json")
    payload = value.get("payload")
    if not isinstance(payload, dict):
        return value
    job = payload.get("job")
    if isinstance(job, dict):
        value["payload"] = {
            **payload,
            "job": {key: job.get(key) for key in _PUBLIC_JOB_EVENT_FIELDS},
        }
    return value


async def signal_drama_project_updated(request: Request, project: DramaProject) -> None:
    await get_container(request).redis_bus.signal_event(project.workspace_id)


async def persist_agent_project_mutation[ProjectT: (DramaProject, ProfessionalProject)](
    request: Request, mutation: Awaitable[ProjectT]
) -> ProjectT:
    source = "agent" if is_agent_request(request) else None
    with capture_project_mutation(source):
        return await mutation


def ensure_drama_manual_action_allowed(project: DramaProject) -> None:
    if (
        project.automation is not None
        and project.automation.status == DramaAutomationStatus.RUNNING
    ):
        raise HTTPException(
            status_code=409,
            detail="自动粗剪生成期间不能手动修改或生成镜头，请先停止任务",
        )


async def enforce_rate_limit(
    request: Request,
    scope: str,
    *,
    limit: int,
    window: int,
    subject: str | None = None,
    include_client: bool = True,
) -> None:
    settings = get_container(request).settings
    host = resolve_client_ip(request, settings.trusted_proxy_cidrs)
    bucket = rate_limit_key(scope, host if include_client else None, subject)
    redis_allowed = await get_container(request).redis_bus.allow_request(
        f"aigc:ratelimit:{bucket}", limit, window
    )
    if redis_allowed is not None:
        if not redis_allowed:
            raise HTTPException(status_code=429, detail="请求过于频繁，请稍后重试")
        return
    key = bucket
    now = time.monotonic()
    entry = _rate_windows.get(key)
    if entry is None:
        for stale_key, (stale_window, stale_values) in tuple(_rate_windows.items()):
            while stale_values and stale_values[0] <= now - stale_window:
                stale_values.popleft()
            if not stale_values:
                _rate_windows.pop(stale_key, None)
        while len(_rate_windows) >= _RATE_WINDOW_MAX_BUCKETS:
            _rate_windows.popitem(last=False)
        values = deque()
        _rate_windows[key] = (window, values)
    else:
        _, values = entry
        _rate_windows.move_to_end(key)
    while values and values[0] <= now - window:
        values.popleft()
    if len(values) >= limit:
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后重试")
    values.append(now)


def get_container(request: Request) -> AppContainer:
    return request.app.state.container


class UploadRequest(BaseModel):
    project_id: UUID | None = None
    name: str = Field(min_length=1, max_length=255)
    mime_type: str = Field(min_length=3, max_length=128)
    size: int = Field(gt=0)


class UploadCompleteRequest(BaseModel):
    size: int | None = Field(default=None, ge=0)


class RenameJobRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)


class RenameAssetRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class ProjectStatistics(BaseModel):
    total: int = Field(ge=0)
    active: int = Field(ge=0)
    completed: int = Field(ge=0)


class CreateConversationRequest(BaseModel):
    project_id: UUID | None = None
    title: str | None = Field(default=None, max_length=120)
    system_prompt: str | None = Field(default=None, min_length=1, max_length=10_000)


class UpdateConversationRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    pinned: bool | None = None
    unread: bool | None = None
    archived: bool | None = None
    project_name: str | None = Field(default=None, max_length=120)


class ShareTokenResponse(BaseModel):
    share_id: UUID
    token: str
    expires_at: int


class SendConversationMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=20_000)
    asset_ids: list[str] = Field(default_factory=list, max_length=8)
    drama_shot_ids: list[str] = Field(default_factory=list, max_length=8)
    client_turn_id: UUID = Field(default_factory=uuid4)
    reasoning_effort: ReasoningEffort | None = None
    web_enabled: bool = False


class ConversationTurn(BaseModel):
    conversation: ConversationSummary
    user_message: ConversationMessage
    assistant_message: ConversationMessage


class SessionResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    workspace_id: str
    expires_in: int
    username: str | None = None


class ScopedTokenResponse(BaseModel):
    access_token: str
    expires_in: int


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    password: str = Field(min_length=12, max_length=256)


class CreateApiKeyRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ApiKeySummary(BaseModel):
    id: UUID
    name: str
    prefix: str
    revoked_at: datetime | None
    last_used_at: datetime | None
    created_at: datetime

    @classmethod
    def from_record(cls, record: ApiKeyRecord) -> ApiKeySummary:
        return cls.model_validate(record.model_dump(exclude={"workspace_id", "key_hash"}))


class ApiKeyCreated(BaseModel):
    item: ApiKeySummary
    secret: str


class CreateWebhookRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    url: str = Field(min_length=8, max_length=2_000)
    event_types: list[str] = Field(default_factory=lambda: ["job.completed", "job.failed"])


class UpdateWebhookRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    url: str | None = Field(default=None, min_length=8, max_length=2_000)
    enabled: bool | None = None
    event_types: list[str] | None = None


class WebhookSummary(BaseModel):
    id: UUID
    name: str
    url: str
    enabled: bool
    event_types: list[str]
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_record(cls, record: WebhookEndpoint) -> WebhookSummary:
        return cls.model_validate(record.model_dump(exclude={"workspace_id"}, mode="json"))


class WebhookCreated(BaseModel):
    item: WebhookSummary
    signing_secret: str


class WebhookDeliverySummary(BaseModel):
    id: UUID
    endpoint_id: UUID
    event_id: str
    event_type: str
    status: WebhookDeliveryStatus
    attempt: int
    next_attempt_at: datetime
    response_status: int | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_record(cls, record: WebhookDelivery) -> WebhookDeliverySummary:
        return cls.model_validate(
            record.model_dump(exclude={"workspace_id", "payload"})
        )


class MediaQualitySummary(BaseModel):
    id: UUID
    asset_id: UUID
    asset_name: str
    job_id: UUID | None
    origin: MediaQualityOrigin | None
    origin_resolution: str
    origin_message: str | None
    rework_job_id: UUID | None
    rework_attempt: int
    rework_job_status: str | None = None
    candidate_asset_id: UUID | None
    candidate_quality_status: str | None = None
    candidate_quality_decision: str | None = None
    applied_at: datetime | None
    status: str
    decision: str | None
    duration: float
    width: int
    height: int
    has_audio: bool
    errors: list[str]
    warnings: list[str]
    error_message: str | None
    retryable: bool
    attempt: int
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_record(
        cls,
        record: MediaQualityCheck,
        *,
        rework_job_status: str | None = None,
        candidate_quality: MediaQualityCheck | None = None,
    ) -> MediaQualitySummary:
        return cls.model_validate(
            {
                **record.model_dump(
                    exclude={"workspace_id", "claimed_by", "lease_expires_at"}
                ),
                "rework_job_status": rework_job_status,
                "candidate_quality_status": (
                    candidate_quality.status.value if candidate_quality else None
                ),
                "candidate_quality_decision": (
                    candidate_quality.decision.value
                    if candidate_quality and candidate_quality.decision
                    else None
                ),
            }
        )


class RegisterMediaQualityReworkRequest(BaseModel):
    job_id: UUID


async def media_quality_summary(
    container: AppContainer, record: MediaQualityCheck
) -> MediaQualitySummary:
    rework_job, candidate_quality = await asyncio.gather(
        container.repository.get_job(record.rework_job_id)
        if record.rework_job_id
        else asyncio.sleep(0, result=None),
        container.media_quality.candidate_quality(record),
    )
    return MediaQualitySummary.from_record(
        record,
        rework_job_status=rework_job.status.value if rework_job else None,
        candidate_quality=candidate_quality,
    )


_REFRESH_COOKIE = "aigc_refresh_token"
_ANONYMOUS_COOKIE = "aigc_anonymous_session"


def set_refresh_cookie(response: Response, token: str, *, max_age: int, secure: bool) -> None:
    response.set_cookie(
        _REFRESH_COOKIE,
        token,
        max_age=max_age,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/v1/auth",
    )


def set_avatar_identity(response: Response, settings, session: AuthSession) -> None:
    lifetime = max(1, int((session.expires_at - datetime.now(UTC)).total_seconds()))
    token = issue_action_token(
        {"sid": str(session.id), "uid": str(session.user_id)}, settings.auth_secret,
        purpose="avatar-owner", ttl_seconds=lifetime,
    )
    response.set_cookie("aigc_avatar_session", token, path="/", max_age=lifetime,
                        httponly=True, secure=settings.auth_cookie_secure, samesite="strict")


@router.get("/auth/avatar-owner", include_in_schema=False)
async def avatar_owner(request: Request, response: Response) -> dict[str, str]:
    container = get_container(request)
    try:
        claims = verify_action_token(request.cookies.get("aigc_avatar_session", ""),
                                     container.settings.auth_secret, purpose="avatar-owner")
        active = await container.repository.is_auth_session_active(UUID(str(claims["sid"])))
        user = await container.repository.get_user_by_id(UUID(str(claims["uid"]))) if active else None
    except (InvalidToken, ValueError, KeyError):
        user = None
    if not user or user.status != "active":
        raise HTTPException(status_code=401, detail="请先登录平台")
    response.headers["Cache-Control"] = "private, no-store"
    return {"owner_id": user.workspace_id}


async def create_user_session(request: Request, response: Response, user: User) -> SessionResponse:
    container = get_container(request)
    settings = container.settings
    refresh_token = secrets.token_urlsafe(48)
    auth_session = await container.repository.create_auth_session(
        AuthSession(
            user_id=user.id,
            workspace_id=user.workspace_id,
            refresh_token_hash=hash_refresh_token(refresh_token),
            expires_at=datetime.now(UTC) + timedelta(seconds=settings.auth_refresh_ttl_seconds),
            is_admin=user.role == "admin",
        )
    )
    set_refresh_cookie(
        response,
        refresh_token,
        max_age=settings.auth_refresh_ttl_seconds,
        secure=settings.auth_cookie_secure,
    )
    set_avatar_identity(response, settings, auth_session)
    response.delete_cookie(_ANONYMOUS_COOKIE, path="/v1")
    return SessionResponse(
        access_token=issue_workspace_token(
            user.workspace_id,
            settings.auth_secret,
            subject=str(user.id),
            ttl_seconds=settings.auth_token_ttl_seconds,
            session_id=str(auth_session.id),
            scope="workspace admin" if auth_session.is_admin else "workspace",
        ),
        workspace_id=user.workspace_id,
        expires_in=settings.auth_token_ttl_seconds,
        username=user.username,
    )


def raise_asset_validation_error(error: ValueError) -> None:
    if isinstance(error, AssetQuotaExceeded):
        detail = (
            "资产数量已达到工作区上限" if error.quota == "asset-count" else "工作区存储空间不足"
        )
        raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail=detail) from error
    status_code = (
        status.HTTP_413_CONTENT_TOO_LARGE
        if "exceeds maximum size" in str(error)
        else status.HTTP_422_UNPROCESSABLE_CONTENT
    )
    raise HTTPException(status_code=status_code, detail=str(error)) from error


async def read_limited_body(request: Request, maximum_bytes: int) -> bytes:
    declared_size = request.headers.get("content-length")
    if declared_size:
        try:
            if int(declared_size) > maximum_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail=f"Asset exceeds maximum size of {maximum_bytes} bytes",
                )
        except ValueError as error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Content-Length header",
            ) from error
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > maximum_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"Asset exceeds maximum size of {maximum_bytes} bytes",
            )
    return bytes(body)


@router.get("/health", tags=["system"])
async def health(request: Request) -> dict[str, object]:
    container = get_container(request)
    return {
        "status": "ok",
        "service": "aigc-api",
        "repository": container.settings.repository_backend,
        "storage": container.settings.storage_backend,
    }


@router.post("/session", response_model=SessionResponse, tags=["auth"])
async def create_anonymous_session(
    request: Request,
    response: Response,
    anonymous_token: str | None = Cookie(default=None, alias=_ANONYMOUS_COOKIE),
) -> SessionResponse:
    settings = get_container(request).settings
    if anonymous_token:
        try:
            claims = verify_workspace_token(anonymous_token, settings.auth_secret)
            workspace_id = str(claims["workspace_id"])
            scopes = set(str(claims.get("scope", "workspace")).split())
            if workspace_id.startswith("anon-") and "workspace" in scopes:
                return SessionResponse(
                    access_token=anonymous_token,
                    workspace_id=workspace_id,
                    expires_in=max(0, int(claims["exp"]) - int(time.time())),
                )
        except (InvalidToken, KeyError, TypeError, ValueError):
            pass
    await enforce_rate_limit(request, "session", limit=20, window=60)
    workspace_id = f"anon-{uuid4().hex}"
    access_token = issue_workspace_token(
        workspace_id, settings.auth_secret, ttl_seconds=settings.auth_token_ttl_seconds
    )
    response.set_cookie(
        _ANONYMOUS_COOKIE,
        access_token,
        max_age=settings.auth_token_ttl_seconds,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        path="/v1",
    )
    return SessionResponse(
        access_token=access_token,
        workspace_id=workspace_id,
        expires_in=settings.auth_token_ttl_seconds,
    )


@router.post("/auth/login", response_model=SessionResponse, tags=["auth"])
async def login(request: Request, response: Response, payload: LoginRequest) -> SessionResponse:
    await enforce_rate_limit(request, "login-ip", limit=30, window=300)
    await enforce_rate_limit(
        request,
        "login-account",
        limit=10,
        window=300,
        subject=payload.username,
        include_client=False,
    )
    container = get_container(request)
    settings = container.settings
    user = await container.repository.get_user_by_username(payload.username)
    if user is None and payload.username == settings.auth_username:
        password_ok = (
            verify_password(payload.password, settings.auth_password_hash)
            if settings.auth_password_hash
            else payload.password == settings.auth_password
        )
        if password_ok:
            user = await container.repository.create_user(
                User(
                    username=payload.username,
                    password_hash=settings.auth_password_hash or hash_password(payload.password),
                    workspace_id=f"user-{payload.username}",
                    role="admin",
                )
            )
    if (
        user is None
        or user.status != "active"
        or not verify_password(payload.password, user.password_hash)
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    return await create_user_session(request, response, user)


@router.get("/auth/registration", tags=["auth"])
async def registration_status(request: Request, response: Response) -> dict[str, bool]:
    response.headers["Cache-Control"] = "no-store"
    return {"enabled": get_container(request).settings.auth_registration_enabled}


@router.post("/auth/register", response_model=SessionResponse, tags=["auth"])
async def register(
    request: Request, response: Response, payload: RegisterRequest
) -> SessionResponse:
    container = get_container(request)
    if not container.settings.auth_registration_enabled:
        raise HTTPException(status_code=403, detail="注册暂未开放，请使用已有账号登录。")
    await enforce_rate_limit(request, "register", limit=5, window=3600)
    if payload.username.casefold() == container.settings.auth_username.casefold():
        raise HTTPException(status_code=409, detail="该用户名为系统保留名称")
    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        workspace_id=f"user-{uuid4().hex}",
    )
    try:
        user = await container.repository.create_user(user)
    except ValueError as error:
        raise HTTPException(status_code=409, detail="用户名已存在") from error
    return await create_user_session(request, response, user)


@router.post("/auth/refresh", response_model=SessionResponse, tags=["auth"])
async def refresh_session(
    request: Request,
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=_REFRESH_COOKIE),
) -> SessionResponse:
    await enforce_rate_limit(request, "refresh", limit=60, window=300)
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh session is required")
    container = get_container(request)
    replacement = secrets.token_urlsafe(48)
    auth_session = await container.repository.rotate_auth_session(
        hash_refresh_token(refresh_token), hash_refresh_token(replacement)
    )
    if auth_session is None:
        response.delete_cookie(_REFRESH_COOKIE, path="/v1/auth")
        raise HTTPException(status_code=401, detail="Refresh session is invalid")
    user = await container.repository.get_user_by_id(auth_session.user_id)
    if user is None or user.status != "active" or user.workspace_id != auth_session.workspace_id:
        await container.repository.revoke_auth_session(hash_refresh_token(replacement))
        response.delete_cookie(_REFRESH_COOKIE, path="/v1/auth")
        raise HTTPException(status_code=401, detail="Refresh session is invalid")
    is_admin = user.role == "admin"
    set_refresh_cookie(
        response,
        replacement,
        max_age=max(1, int((auth_session.expires_at - datetime.now(UTC)).total_seconds())),
        secure=container.settings.auth_cookie_secure,
    )
    set_avatar_identity(response, container.settings, auth_session)
    return SessionResponse(
        access_token=issue_workspace_token(
            auth_session.workspace_id,
            container.settings.auth_secret,
            subject=str(auth_session.user_id),
            ttl_seconds=container.settings.auth_token_ttl_seconds,
            session_id=str(auth_session.id),
            scope="workspace admin" if is_admin else "workspace",
        ),
        workspace_id=auth_session.workspace_id,
        expires_in=container.settings.auth_token_ttl_seconds,
        username=user.username,
    )


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT, tags=["auth"])
async def logout_session(
    request: Request,
    response: Response,
    workspace_id: WorkspaceId,
    refresh_token: str | None = Cookie(default=None, alias=_REFRESH_COOKIE),
) -> Response:
    claims = getattr(request.state, "auth_claims", {})
    session_id = claims.get("sid") if isinstance(claims, dict) else None
    if session_id:
        try:
            await get_container(request).repository.revoke_auth_session_by_id(
                UUID(str(session_id)), workspace_id
            )
        except ValueError as error:
            raise HTTPException(status_code=401, detail="Invalid access token") from error
    if refresh_token:
        await get_container(request).repository.revoke_auth_session(
            hash_refresh_token(refresh_token)
        )
    response.delete_cookie(_REFRESH_COOKIE, path="/v1/auth")
    response.delete_cookie("aigc_avatar_session", path="/")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/health/providers", tags=["system"])
async def provider_health(request: Request, workspace_id: AdminWorkspaceId) -> dict[str, object]:
    return {
        "status": "ok",
        "providers": await get_container(request).providers.list(refresh=True),
    }


@router.get("/metrics", response_model=WorkspaceMetrics, tags=["system"])
async def workspace_metrics(request: Request, workspace_id: AdminWorkspaceId) -> WorkspaceMetrics:
    return await get_container(request).repository.workspace_metrics(workspace_id)


@router.get("/operations", response_model=OperationsSnapshot, tags=["system"])
async def operations_snapshot(
    request: Request, workspace_id: WorkspaceId
) -> OperationsSnapshot:
    return await build_operations_snapshot(get_container(request).repository, workspace_id)


@router.get("/admin/operations", response_model=AdminOperationsSnapshot, tags=["system"])
async def admin_operations_snapshot(
    request: Request, workspace_id: AdminWorkspaceId
) -> AdminOperationsSnapshot:
    container = get_container(request)
    return await build_admin_operations_snapshot(
        container.repository, container.providers, workspace_id
    )


@router.post("/events/token", response_model=ScopedTokenResponse, tags=["system"])
async def create_events_token(request: Request, workspace_id: WorkspaceId) -> ScopedTokenResponse:
    await enforce_rate_limit(request, "events-token", limit=30, window=60)
    ttl = 300
    claims = getattr(request.state, "auth_claims", {})
    return ScopedTokenResponse(
        access_token=issue_workspace_token(
            workspace_id,
            get_container(request).settings.auth_secret,
            ttl_seconds=ttl,
            scope="events:read",
            subject=str(claims.get("sub", "")) or f"workspace:{workspace_id}",
            session_id=str(claims.get("sid", "")) or None,
        ),
        expires_in=ttl,
    )


@router.get("/providers", tags=["generation"])
async def list_providers(
    request: Request, workspace_id: AdminWorkspaceId
) -> list[dict[str, object]]:
    return await get_container(request).providers.list()


@router.get("/generation/capabilities", tags=["generation"])
async def generation_capabilities(request: Request, workspace_id: WorkspaceId, refresh: bool = False) -> dict[str, object]:
    del workspace_id
    return await get_container(request).providers.discover_capabilities(refresh=refresh)


def generation_batch_digest(payload: GenerationBatchRequest) -> str:
    canonical = json.dumps(
        payload.model_dump(mode="json", exclude_none=True),
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode()).hexdigest()


@router.post("/generation/h3/compile", tags=["generation"])
async def compile_h3_prompt(request: Request, payload: GenerationRequest, workspace_id: WorkspaceId):
    generation = get_container(request).generation
    context = getattr(request.state, "agent_context", None)
    if context is not None and not set(payload.asset_ids).issubset(set(context.get("asset_ids", []))):
        raise HTTPException(403, "素材未提供给本次运行")
    await enforce_rate_limit(request, "h3-compile", limit=20, window=60,
                             subject=workspace_id, include_client=False)
    if not generation.h3_compiler_enabled:
        raise HTTPException(409, "视频方案编译尚未启用")
    try:
        _, record = await generation.prepare_h3(workspace_id, payload)
        if not record:
            raise HTTPException(422, "当前请求未使用 H3 视频模型")
        return generation.h3_compiler.preview(record)
    except LookupError as error:
        raise HTTPException(422, str(error)) from error


@router.post("/generation/quote", response_model=GenerationQuoteResponse, tags=["generation"])
async def quote_generation(
    request: Request, payload: GenerationRequest, workspace_id: WorkspaceId
) -> GenerationQuoteResponse:
    try:
        container = get_container(request)
        quote = await container.generation.quote(payload, workspace_id)
        ttl_seconds = 120
        token = issue_action_token(
            {
                "workspace_id": workspace_id,
                "request_digest": generation_request_digest(payload),
                "h3_compilation_id": str(quote.h3_compilation_id) if quote.h3_compilation_id else None,
                "provider_id": quote.provider_id,
                "credits": quote.credits,
                "estimated_wait_seconds": quote.estimated_wait_seconds,
            },
            container.settings.auth_secret,
            purpose="generation-quote",
            ttl_seconds=ttl_seconds,
        )
        return GenerationQuoteResponse(
            **quote.model_dump(),
            confirmation_token=token,
            expires_in=ttl_seconds,
        )
    except ProviderUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except GenerationQueueFull as error:
        raise HTTPException(status_code=429, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)
        ) from error


@router.post(
    "/generation/batches/quote",
    response_model=GenerationBatchQuoteResponse,
    tags=["generation"],
)
async def quote_generation_batch(
    request: Request, payload: GenerationBatchRequest, workspace_id: WorkspaceId
) -> GenerationBatchQuoteResponse:
    if len({item.item_id for item in payload.items}) != len(payload.items):
        raise HTTPException(status_code=422, detail="批次项目编号不能重复")
    try:
        container = get_container(request)
        video_items = sum(
            item.request.capability
            in {Capability.TEXT_TO_VIDEO, Capability.IMAGE_TO_VIDEO}
            for item in payload.items
        )
        active_video_jobs = (
            await container.generation.ensure_queue_capacity(workspace_id, video_items)
            if video_items
            else 0
        )
        prepared_items = await container.generation.prepare_h3_batch(workspace_id, payload.items)
        quotes = await asyncio.gather(
            *(
                container.generation.quote(
                    item.request,
                    workspace_id,
                    check_queue_capacity=False,
                    known_active_video_jobs=active_video_jobs,
                )
                for item in prepared_items
            )
        )
        ttl_seconds = 180
        total_credits = sum(quote.credits for quote in quotes)
        estimated_wait_seconds = max((quote.estimated_wait_seconds for quote in quotes), default=0)
        locked_items = [
            {
                "item_id": item.item_id,
                "h3_compilation_id": str(quote.h3_compilation_id) if quote.h3_compilation_id else None,
                "presentation": quote.presentation,
                "findings": quote.findings,
                "provider_id": quote.provider_id,
                "credits": quote.credits,
                "estimated_wait_seconds": quote.estimated_wait_seconds,
            }
            for item, quote in zip(payload.items, quotes, strict=True)
        ]
        token = issue_action_token(
            {
                "workspace_id": workspace_id,
                "request_digest": generation_batch_digest(payload),
                "items": [{k: v for k, v in item.items() if k not in {"presentation", "findings"}} for item in locked_items],
                "total_credits": total_credits,
            },
            container.settings.auth_secret,
            purpose="generation-batch-quote",
            ttl_seconds=ttl_seconds,
        )
        return GenerationBatchQuoteResponse(
            items=[GenerationBatchQuoteItem(**item) for item in locked_items],
            total_credits=total_credits,
            estimated_wait_seconds=estimated_wait_seconds,
            confirmation_token=token,
            expires_in=ttl_seconds,
        )
    except ProviderUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except GenerationQueueFull as error:
        raise HTTPException(status_code=429, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("/credits", response_model=CreditBalance, tags=["generation"])
async def get_credit_balance(request: Request, workspace_id: WorkspaceId) -> CreditBalance:
    return await get_container(request).generation.credit_balance(workspace_id)


@router.get(
    "/project-statistics",
    response_model=ProjectStatistics,
    tags=["generation"],
)
async def get_project_statistics(
    request: Request, workspace_id: AuthenticatedWorkspaceId
) -> ProjectStatistics:
    total, completed = await get_container(request).repository.creation_project_counts(workspace_id)
    return ProjectStatistics(total=total, active=total-completed, completed=completed)


@router.post(
    "/jobs", response_model=GenerationJob, status_code=status.HTTP_202_ACCEPTED, tags=["generation"]
)
async def create_job(
    request: Request,
    payload: GenerationRequest,
    workspace_id: WorkspaceId,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key", max_length=128),
    quote_token: str | None = Header(
        default=None, alias="X-Generation-Quote-Token", max_length=4096
    ),
) -> GenerationJob:
    container = get_container(request)
    if workspace_id.startswith("anon-") and not container.settings.allow_anonymous_generation:
        raise HTTPException(status_code=403, detail="请先登录后再使用生成能力")
    if not idempotency_key or not idempotency_key.strip():
        raise HTTPException(status_code=422, detail="Idempotency-Key is required")
    existing = await container.repository.find_job_by_idempotency(workspace_id, idempotency_key)
    if existing:
        if (existing.request_digest or generation_request_digest(existing.request)) != generation_request_digest(payload):
            raise HTTPException(409, "幂等键已用于不同的生成请求，请更换后重试")
        return existing
    if payload.context and payload.context.project_kind != "free":
        from app.creation.router import call
        from app.creation.service import CreationService
        context = payload.context
        if not context.source_asset_id or str(context.source_asset_id) not in payload.asset_ids:
            raise HTTPException(422, "领域项目的生成请通过所属工作台或素材继续创作入口提交")
        expected = await call(CreationService(get_container(request)).continuation_context(
            workspace_id, context.source_asset_id, payload.capability, context.project_id, context.subject_id))
        if expected != context:
            raise HTTPException(409, "来源项目或素材用途已变化，请重新打开素材继续创作")
    if not quote_token:
        raise HTTPException(status_code=409, detail="请先获取并确认生成报价")
    try:
        try:
            quote_claims = verify_action_token(
                quote_token,
                container.settings.auth_secret,
                purpose="generation-quote",
            )
        except InvalidToken as error:
            raise HTTPException(status_code=409, detail="生成报价已失效，请重新获取") from error
        if quote_claims.get("workspace_id") != workspace_id or quote_claims.get(
            "request_digest"
        ) != generation_request_digest(payload):
            raise HTTPException(status_code=409, detail="生成参数已变化，请重新获取报价")
        locked_quote = Quote(
            h3_compilation_id=quote_claims.get("h3_compilation_id"),
            credits=int(quote_claims["credits"]),
            provider_id=str(quote_claims["provider_id"]),
            estimated_wait_seconds=int(quote_claims.get("estimated_wait_seconds", 0)),
        )
        return await container.generation.create_job(
            workspace_id, payload, idempotency_key, locked_quote=locked_quote
        )
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)
        ) from error
    except IdempotencyKeyConflict as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="幂等键已用于不同的生成请求，请更换后重试",
        ) from error
    except InsufficientCredits as error:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=str(error)
        ) from error
    except GenerationQueueFull as error:
        raise HTTPException(status_code=429, detail=str(error)) from error


@router.post(
    "/generation/batches",
    response_model=GenerationBatchCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["generation"],
)
async def create_generation_batch(
    request: Request,
    payload: GenerationBatchRequest,
    workspace_id: WorkspaceId,
    idempotency_key: str | None = Header(
        default=None, alias="Idempotency-Key", min_length=8, max_length=96
    ),
    quote_token: str | None = Header(
        default=None, alias="X-Generation-Quote-Token", max_length=8192
    ),
) -> GenerationBatchCreateResponse:
    if any(item.request.context and item.request.context.project_kind != "free" for item in payload.items):
        raise HTTPException(422, "领域项目的生成请通过所属工作台或返工接口提交")
    container = get_container(request)
    if workspace_id.startswith("anon-") and not container.settings.allow_anonymous_generation:
        raise HTTPException(status_code=403, detail="请先登录后再使用生成能力")
    if not idempotency_key:
        raise HTTPException(status_code=409, detail="创作批次必须提供幂等键")
    if not quote_token:
        raise HTTPException(status_code=409, detail="请先获取并确认批次报价")
    try:
        try:
            claims = verify_action_token(
                quote_token,
                container.settings.auth_secret,
                purpose="generation-batch-quote",
            )
        except InvalidToken as error:
            raise HTTPException(status_code=409, detail="批次报价已失效，请重新获取") from error
        if claims.get("workspace_id") != workspace_id or claims.get(
            "request_digest"
        ) != generation_batch_digest(payload):
            raise HTTPException(status_code=409, detail="批次生成参数已变化，请重新获取报价")
        locked_items = claims.get("items")
        if not isinstance(locked_items, list) or len(locked_items) != len(payload.items):
            raise HTTPException(status_code=409, detail="批次报价内容不完整，请重新获取")
        locked_quotes: list[Quote] = []
        for item, locked in zip(payload.items, locked_items, strict=True):
            if not isinstance(locked, dict) or locked.get("item_id") != item.item_id:
                raise HTTPException(status_code=409, detail="批次报价顺序已变化，请重新获取")
            locked_quotes.append(
                Quote(
                    h3_compilation_id=locked.get("h3_compilation_id"),
                    credits=int(locked["credits"]),
                    provider_id=str(locked["provider_id"]),
                    estimated_wait_seconds=int(locked.get("estimated_wait_seconds", 0)),
                )
            )
        batch_id = uuid5(NAMESPACE_URL, f"aigc-generation-batch:{workspace_id}:{idempotency_key}")
        jobs = await container.generation.create_batch(
            workspace_id,
            payload.items,
            batch_id,
            locked_quotes,
            idempotency_key,
        )
        return GenerationBatchCreateResponse(
            batch_id=batch_id,
            jobs=jobs,
            total_credits=sum(quote.credits for quote in locked_quotes),
        )
    except LookupError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except IdempotencyKeyConflict as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="幂等键已用于不同的生成请求，请更换后重试",
        ) from error
    except InsufficientCredits as error:
        raise HTTPException(status_code=402, detail=str(error)) from error
    except GenerationQueueFull as error:
        raise HTTPException(status_code=429, detail=str(error)) from error


@router.get("/jobs", response_model=CursorPage[GenerationJob], tags=["generation"])
async def list_jobs(
    request: Request,
    workspace_id: WorkspaceId,
    limit: int = Query(default=50, ge=1, le=200),
    cursor: str | None = Query(default=None),
    query: str | None = Query(default=None, max_length=120),
) -> CursorPage[GenerationJob]:
    try:
        before = decode_cursor(cursor)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    repository = get_container(request).repository
    items, total = await asyncio.gather(
        repository.list_jobs(workspace_id, limit + 1, before, search=query),
        repository.count_jobs(workspace_id, search=query),
    )
    visible = items[:limit]
    return CursorPage(
        items=visible,
        total=total,
        next_cursor=(
            encode_cursor(visible[-1].created_at, visible[-1].id)
            if len(items) > limit and visible
            else None
        ),
    )


@router.post("/jobs/lookup", response_model=list[GenerationJob], tags=["generation"])
async def lookup_jobs(
    request: Request,
    payload: JobLookupRequest,
    workspace_id: WorkspaceId,
) -> list[GenerationJob]:
    repository = get_container(request).repository
    return await repository.get_jobs_by_ids(workspace_id, list(dict.fromkeys(payload.ids)))


@router.get("/jobs/{job_id}", response_model=GenerationJob, tags=["generation"])
async def get_job(
    job: OwnedJob,
) -> GenerationJob:
    return job


@router.patch("/jobs/{job_id}", response_model=GenerationJob, tags=["generation"])
async def rename_job(request: Request, job: OwnedJob, payload: RenameJobRequest) -> GenerationJob:
    repository = get_container(request).repository
    try:
        return await repository.save_job(
            job.model_copy(update={"title": payload.title}),
            "job.renamed",
            expected=job,
        )
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="Job changed; refresh and retry") from error


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["generation"])
async def delete_job(request: Request, job: OwnedJob) -> Response:
    if job.status not in {
        JobStatus.SUCCEEDED,
        JobStatus.FAILED,
        JobStatus.DEAD_LETTER,
        JobStatus.CANCELED,
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Job must be canceled or completed before deletion",
        )
    if not await get_container(request).repository.delete_job(job.id):
        raise HTTPException(status_code=404, detail="Job not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/jobs/{job_id}/cancel", response_model=GenerationJob, tags=["generation"])
async def cancel_job(request: Request, owned_job: OwnedJob) -> GenerationJob:
    try:
        job = await get_container(request).generation.cancel_job(owned_job.id, owned_job.workspace_id)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    if job is None:  # A concurrent delete may win after the ownership check.
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/events", tags=["generation"])
async def stream_events(
    request: Request,
    workspace_id: WorkspaceId,
    after: int | None = Query(default=None, ge=0),
    last_event_id: str | None = Header(default=None, alias="Last-Event-ID"),
) -> StreamingResponse:
    container = get_container(request)
    claims = getattr(request.state, "auth_claims", {})
    connection_key = str(claims.get("sid") or f"workspace:{workspace_id}")
    try:
        if last_event_id:
            initial_cursor = max(after or 0, int(last_event_id))
        elif after is not None:
            initial_cursor = after
        else:
            initial_cursor = await container.repository.latest_event_sequence(workspace_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Last-Event-ID header",
        ) from error
    async with _sse_connections_lock:
        active_connections = _sse_connections.get(connection_key, 0)
        if active_connections >= _MAX_SSE_CONNECTIONS_PER_SESSION:
            raise HTTPException(status_code=429, detail="实时连接数量过多")
        _sse_connections[connection_key] = active_connections + 1

    async def event_stream():
        try:
            cursor = initial_cursor
            async with container.redis_bus.event_subscription(workspace_id) as subscription:
                while not await request.is_disconnected():
                    events = await container.repository.list_events(workspace_id, cursor)
                    if not events:
                        yield ": keep-alive\n\n"
                        if subscription is not None:
                            await subscription.wait()
                        else:
                            await asyncio.sleep(1)
                        continue
                    for event in events:
                        cursor = event.sequence
                        payload = json.dumps(public_job_event(event), ensure_ascii=False)
                        yield f"id: {event.sequence}\ndata: {payload}\n\n"
        finally:
            async with _sse_connections_lock:
                remaining = _sse_connections.get(connection_key, 1) - 1
                if remaining > 0:
                    _sse_connections[connection_key] = remaining
                else:
                    _sse_connections.pop(connection_key, None)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/uploads/presign", response_model=UploadTicket, tags=["assets"])
async def create_upload(
    request: Request,
    payload: UploadRequest,
    workspace_id: AuthenticatedWorkspaceId,
) -> UploadTicket:
    await enforce_rate_limit(request, "upload-ticket", limit=30, window=60)
    container = get_container(request)
    if payload.size > container.settings.max_asset_bytes:
        raise HTTPException(status_code=413, detail="文件超过单个资产大小上限")
    folder = None
    if payload.project_id:
        from app.creation.router import call
        from app.creation.service import CreationService
        folder = await call(CreationService(container).project(workspace_id, payload.project_id))
    try:
        ticket = await container.storage.create_upload(
            workspace_id,
            payload.name,
            payload.mime_type,
            expected_size=payload.size,
            max_asset_count=container.settings.workspace_max_asset_count,
            max_pending_uploads=container.settings.workspace_max_pending_uploads,
            max_storage_bytes=container.settings.workspace_max_storage_bytes,
        )
        if folder:
            from app.creation.management import preference_id
            from app.creation.router import call
            from app.domain.creation import CreationRecord
            kind, project = folder
            # Register the destination before handing out the upload ticket.
            # Catalogs exclude pending/failed uploads; completion exposes the same asset.
            await call(container.repository.save_creation_preference(CreationRecord(
                id=preference_id(workspace_id, "project-asset", ticket.asset.id, project.id),
                workspace_id=workspace_id, project_id=project.id, kind="project-asset",
                subject_id=ticket.asset.id, data={"included": True, "project_kind": kind,
                    "asset_id": str(ticket.asset.id)}), 0,
                project_guard=(kind, project.id, project.version)))
        return ticket
    except AssetQuotaExceeded as error:
        if error.quota == "pending-uploads":
            raise HTTPException(
                status_code=429,
                detail="待完成上传过多，请完成或删除后再试",
            ) from error
        detail = (
            "资产数量已达到工作区上限" if error.quota == "asset-count" else "工作区存储空间不足"
        )
        raise HTTPException(status_code=413, detail=detail) from error
    except ValueError as error:
        raise_asset_validation_error(error)


@router.put("/uploads/{asset_id}/content", status_code=status.HTTP_204_NO_CONTENT, tags=["assets"])
async def local_upload_content(
    request: Request,
    asset: OwnedAsset,
    workspace_id: AuthenticatedWorkspaceId,
    content_type: str | None = Header(default=None, alias="Content-Type"),
) -> Response:
    del workspace_id
    await enforce_rate_limit(request, "upload-content", limit=20, window=60)
    container = get_container(request)
    try:
        normalized_content_type = (
            normalize_mime_type(content_type) if content_type is not None else None
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=str(error),
        ) from error
    if normalized_content_type != asset.mime_type:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload Content-Type does not match the asset ticket",
        )
    try:
        await container.storage.write_upload_stream(asset, request.stream())
    except ValueError as error:
        await container.repository.delete_asset(asset.id)
        raise_asset_validation_error(error)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/uploads/{asset_id}/complete", response_model=Asset, tags=["assets"])
async def complete_upload(
    request: Request,
    asset: OwnedAsset,
    payload: UploadCompleteRequest,
    workspace_id: AuthenticatedWorkspaceId,
) -> Asset:
    container = get_container(request)
    ready_assets = await container.repository.list_assets(workspace_id)
    used_bytes = sum(item.storage_bytes for item in ready_assets)
    if payload.size is not None and (
        used_bytes + payload.size > container.settings.workspace_max_storage_bytes
    ):
        raise HTTPException(status_code=413, detail="工作区存储空间不足")
    try:
        return await container.storage.complete_upload(asset, payload.size)
    except ValueError as error:
        raise_asset_validation_error(error)


@router.get("/assets", response_model=CursorPage[Asset], tags=["assets"])
async def list_assets(
    request: Request,
    workspace_id: WorkspaceId,
    limit: int = Query(default=50, ge=1, le=200),
    cursor: str | None = Query(default=None),
    kind: AssetKind | None = None,
    query: str | None = Query(default=None, max_length=120),
) -> CursorPage[Asset]:
    try:
        before = decode_cursor(cursor)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    repository = get_container(request).repository
    items, total = await asyncio.gather(
        repository.list_assets(workspace_id, limit + 1, before, kind, query),
        repository.count_assets(workspace_id, kind, query),
    )
    visible = items[:limit]
    return CursorPage(
        items=visible,
        next_cursor=(
            encode_cursor(visible[-1].created_at, visible[-1].id)
            if len(items) > limit and visible
            else None
        ),
        total=total,
    )


@router.get("/assets/{asset_id}", response_model=Asset, tags=["assets"])
async def get_asset(asset: OwnedAsset) -> Asset:
    return asset


@router.get("/image-evaluation-policies", tags=["image-evaluations"])
async def list_image_evaluation_policies(workspace_id: AuthenticatedWorkspaceId):
    from app.evaluations.policies import policy_catalog

    del workspace_id
    try:
        return [pack.model_dump(mode="json") for pack in policy_catalog()]
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.post(
    "/image-evaluations",
    response_model=ImageEvaluation,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["image-evaluations"],
)
async def create_image_evaluation(
    request: Request,
    payload: CreateImageEvaluationRequest,
    workspace_id: WorkspaceId,
) -> ImageEvaluation:
    claims = getattr(request.state, "auth_claims", {})
    is_agent = str(claims.get("sub", "")).startswith("agent:")
    if workspace_id.startswith("anon-") or not (claims.get("sid") or is_agent):
        raise HTTPException(status_code=403, detail="请先登录后再使用图片评测")
    await enforce_rate_limit(request, "image-evaluation", limit=20, window=60)
    asset = await get_container(request).repository.get_asset(payload.asset_id)
    if asset is None or asset.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Asset not found")
    try:
        return await get_container(request).image_evaluations.create(
            workspace_id, asset, payload.context
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.get(
    "/image-evaluations",
    response_model=list[ImageEvaluation],
    tags=["image-evaluations"],
)
async def list_image_evaluations(
    request: Request,
    workspace_id: WorkspaceId,
    asset_id: UUID | None = None,
    limit: int = Query(default=100, ge=1, le=200),
) -> list[ImageEvaluation]:
    return await get_container(request).repository.list_image_evaluations(
        workspace_id, asset_id=asset_id, limit=limit
    )


@router.get(
    "/image-evaluations/{evaluation_id}",
    response_model=ImageEvaluation,
    tags=["image-evaluations"],
)
async def get_image_evaluation(
    evaluation: OwnedImageEvaluation,
) -> ImageEvaluation:
    return evaluation


@router.post(
    "/image-evaluations/{evaluation_id}/retry",
    response_model=ImageEvaluation,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["image-evaluations"],
)
async def retry_image_evaluation(
    request: Request,
    evaluation: OwnedImageEvaluation,
    workspace_id: AuthenticatedWorkspaceId,
) -> ImageEvaluation:
    del workspace_id
    await enforce_rate_limit(request, "image-evaluation-retry", limit=20, window=60)
    try:
        return await get_container(request).image_evaluations.retry(evaluation)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except (ValueError, RuntimeError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.get(
    "/media-quality-checks",
    response_model=list[MediaQualitySummary],
    tags=["media-quality"],
)
async def list_media_quality_checks(
    request: Request,
    workspace_id: AuthenticatedWorkspaceId,
    limit: int = Query(default=100, ge=1, le=200),
) -> list[MediaQualitySummary]:
    container = get_container(request)
    await container.media_quality.queue_missing(limit=limit)
    checks = await container.repository.list_media_quality_checks(workspace_id, limit)
    checks = await container.media_quality.refresh_records(checks)
    return list(
        await asyncio.gather(
            *(media_quality_summary(container, check) for check in checks)
        )
    )


@router.post(
    "/media-quality-checks/{check_id}/retry",
    response_model=MediaQualitySummary,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["media-quality"],
)
async def retry_media_quality_check(
    request: Request,
    check_id: UUID,
    workspace_id: AuthenticatedWorkspaceId,
) -> MediaQualitySummary:
    check = await get_container(request).repository.get_media_quality_check(check_id)
    if check is None or check.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Media quality check not found")
    try:
        retried = await get_container(request).media_quality.retry(check)
        return await media_quality_summary(get_container(request), retried)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.post(
    "/media-quality-checks/{check_id}/rework",
    response_model=MediaQualitySummary,
    tags=["media-quality"],
)
async def register_media_quality_rework(
    request: Request,
    check_id: UUID,
    payload: RegisterMediaQualityReworkRequest,
    workspace_id: AuthenticatedWorkspaceId,
) -> MediaQualitySummary:
    container = get_container(request)
    check = await container.repository.get_media_quality_check(check_id)
    if check is None or check.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Media quality check not found")
    try:
        saved = await container.media_quality.attach_rework(check, payload.job_id)
        return await media_quality_summary(container, saved)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except (TypeError, ValueError, ConcurrentModificationError) as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.post(
    "/media-quality-checks/{check_id}/apply-candidate",
    response_model=MediaQualitySummary,
    tags=["media-quality"],
)
async def apply_media_quality_candidate(
    request: Request,
    check_id: UUID,
    workspace_id: SessionWorkspaceId,
) -> MediaQualitySummary:
    container = get_container(request)
    check = await container.repository.get_media_quality_check(check_id)
    if check is None or check.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Media quality check not found")
    try:
        saved = await container.media_quality.apply_candidate(check)
        return await media_quality_summary(container, saved)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except (TypeError, ValueError, ConcurrentModificationError) as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.get("/automation/api-keys", response_model=list[ApiKeySummary], tags=["automation"])
async def list_api_keys(
    request: Request, workspace_id: SessionWorkspaceId
) -> list[ApiKeySummary]:
    records = await get_container(request).repository.list_api_keys(workspace_id)
    return [ApiKeySummary.from_record(record) for record in records]


@router.post(
    "/automation/api-keys",
    response_model=ApiKeyCreated,
    status_code=status.HTTP_201_CREATED,
    tags=["automation"],
)
async def create_api_key(
    request: Request,
    payload: CreateApiKeyRequest,
    workspace_id: SessionWorkspaceId,
) -> ApiKeyCreated:
    await enforce_rate_limit(request, "api-key-create", limit=10, window=3600)
    record, secret = await get_container(request).automation.create_api_key(
        workspace_id, payload.name
    )
    return ApiKeyCreated(item=ApiKeySummary.from_record(record), secret=secret)


@router.delete(
    "/automation/api-keys/{key_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["automation"],
)
async def revoke_api_key(
    request: Request, key_id: UUID, workspace_id: SessionWorkspaceId
) -> Response:
    if not await get_container(request).repository.revoke_api_key(key_id, workspace_id):
        raise HTTPException(status_code=404, detail="API key not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def validate_webhook_event_types(values: list[str]) -> list[str]:
    allowed = {"job.completed", "job.failed", "job.canceled"}
    normalized = list(dict.fromkeys(values))
    if not normalized or len(normalized) > len(allowed) or not set(normalized) <= allowed:
        raise HTTPException(status_code=422, detail="Webhook 事件类型无效")
    return normalized


@router.get(
    "/automation/webhooks", response_model=list[WebhookSummary], tags=["automation"]
)
async def list_webhooks(
    request: Request, workspace_id: SessionWorkspaceId
) -> list[WebhookSummary]:
    endpoints = await get_container(request).repository.list_webhook_endpoints(workspace_id)
    return [WebhookSummary.from_record(endpoint) for endpoint in endpoints]


@router.post(
    "/automation/webhooks",
    response_model=WebhookCreated,
    status_code=status.HTTP_201_CREATED,
    tags=["automation"],
)
async def create_webhook(
    request: Request,
    payload: CreateWebhookRequest,
    workspace_id: SessionWorkspaceId,
) -> WebhookCreated:
    await enforce_rate_limit(request, "webhook-create", limit=20, window=3600)
    try:
        endpoint, secret = await get_container(request).automation.create_webhook(
            workspace_id,
            payload.name,
            payload.url,
            validate_webhook_event_types(payload.event_types),
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return WebhookCreated(
        item=WebhookSummary.from_record(endpoint), signing_secret=secret
    )


@router.patch(
    "/automation/webhooks/{endpoint_id}",
    response_model=WebhookSummary,
    tags=["automation"],
)
async def update_webhook(
    request: Request,
    endpoint_id: UUID,
    payload: UpdateWebhookRequest,
    workspace_id: SessionWorkspaceId,
) -> WebhookSummary:
    repository = get_container(request).repository
    endpoint = await repository.get_webhook_endpoint(endpoint_id)
    if endpoint is None or endpoint.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Webhook not found")
    changes = payload.model_dump(exclude_none=True)
    if "url" in changes:
        try:
            get_container(request).automation.validate_webhook_url(str(changes["url"]))
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
    if "event_types" in changes:
        changes["event_types"] = validate_webhook_event_types(changes["event_types"])
    changes["updated_at"] = datetime.now(UTC)
    updated = await repository.save_webhook_endpoint(endpoint.model_copy(update=changes))
    return WebhookSummary.from_record(updated)


@router.delete(
    "/automation/webhooks/{endpoint_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["automation"],
)
async def delete_webhook(
    request: Request, endpoint_id: UUID, workspace_id: SessionWorkspaceId
) -> Response:
    if not await get_container(request).repository.delete_webhook_endpoint(
        endpoint_id, workspace_id
    ):
        raise HTTPException(status_code=404, detail="Webhook not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/automation/webhook-deliveries",
    response_model=list[WebhookDeliverySummary],
    tags=["automation"],
)
async def list_webhook_deliveries(
    request: Request,
    workspace_id: SessionWorkspaceId,
    limit: int = Query(default=50, ge=1, le=100),
) -> list[WebhookDeliverySummary]:
    deliveries = await get_container(request).repository.list_webhook_deliveries(
        workspace_id, limit
    )
    return [WebhookDeliverySummary.from_record(item) for item in deliveries]


@router.post(
    "/assets/{asset_id}/first-frame",
    response_model=MediaBoundaryOperation,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["assets"],
)
async def extract_asset_first_frame(request: Request, asset: OwnedAsset) -> MediaBoundaryOperation:
    try:
        return await get_container(request).storage.ingest_video_first_frame(asset)
    except ConcurrentModificationError as error:
        raise HTTPException(
            status_code=429, detail=str(error), headers={"Retry-After": "2"}
        ) from error
    except ValueError as error:
        raise_asset_validation_error(error)


@router.post(
    "/assets/{asset_id}/last-frame",
    response_model=MediaBoundaryOperation,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["assets"],
)
async def extract_asset_last_frame(request: Request, asset: OwnedAsset) -> MediaBoundaryOperation:
    try:
        return await get_container(request).storage.ingest_video_last_frame(asset)
    except ConcurrentModificationError as error:
        raise HTTPException(
            status_code=429, detail=str(error), headers={"Retry-After": "2"}
        ) from error
    except ValueError as error:
        raise_asset_validation_error(error)


@router.get("/media-boundary-operations/{operation_id}", response_model=MediaBoundaryOperation, tags=["assets"])
async def get_media_boundary_operation(request: Request, operation_id: UUID, workspace_id: WorkspaceId):
    operation = await get_container(request).repository.get_media_boundary(operation_id)
    if operation is None or operation.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Media operation not found")
    return operation


@router.post("/media-boundary-operations/{operation_id}/cancel", response_model=MediaBoundaryOperation, tags=["assets"])
async def cancel_media_boundary_operation(request: Request, operation_id: UUID, workspace_id: WorkspaceId):
    await get_media_boundary_operation(request, operation_id, workspace_id)
    return await get_container(request).repository.cancel_media_boundary(operation_id)


@router.patch("/assets/{asset_id}", response_model=Asset, tags=["assets"])
async def rename_asset(request: Request, asset: OwnedAsset, payload: RenameAssetRequest) -> Asset:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Asset name cannot be empty")
    return await get_container(request).repository.save_asset(
        asset.model_copy(update={"name": name})
    )


@router.get("/assets/{asset_id}/content-url", tags=["assets"])
async def get_asset_content_url(request: Request, asset: OwnedAsset) -> dict[str, str | int]:
    variant = request.query_params.get("variant", "original")
    if variant not in {"original", "thumb", "thumb-sm", "scrub"}:
        raise HTTPException(status_code=422, detail="Unsupported asset variant")
    if variant == "scrub" and asset.kind is not AssetKind.VIDEO:
        raise HTTPException(status_code=422, detail="Scrub variants require a video asset")
    container = get_container(request)
    if variant == "scrub" and asset.status is AssetStatus.READY and (asset.size or 0) > 0:
        container.storage.schedule_scrub_prewarm(asset)
    claims = getattr(request.state, "auth_claims", {})
    session_id = str(claims.get("sid", ""))
    signature, expires_at = issue_media_signature(
        str(asset.id),
        asset.workspace_id,
        container.settings.auth_secret,
        variant=variant,
        session_id=session_id,
        ttl_seconds=container.settings.media_signature_ttl_seconds,
    )
    return {
        "url": (
            f"/v1/assets/{asset.id}/signed-content"
            f"?variant={variant}&ws={asset.workspace_id}&sid={session_id}"
            f"&sig={signature}&exp={expires_at}"
        ),
        "expires_at": expires_at,
    }


@router.get("/assets/{asset_id}/signed-content", tags=["assets"])
async def get_signed_asset_content(
    request: Request,
    asset_id: UUID,
    range_header: str | None = Header(default=None, alias="Range"),
    variant: str = Query(default="original", pattern="^(original|thumb|thumb-sm|scrub)$"),
    workspace_id: str = Query(alias="ws", min_length=1, max_length=64),
    session_id: str = Query(default="", alias="sid", max_length=64),
    sig: str = Query(min_length=8),
    exp: int = Query(gt=0),
    share_hash: str = Query(default="", alias="sh", max_length=64),
) -> Response:
    container = get_container(request)
    if not verify_media_signature(
        str(asset_id),
        workspace_id,
        sig,
        exp,
        container.settings.auth_secret,
        variant=variant,
        session_id=session_id,
        share_hash=share_hash,
    ):
        raise HTTPException(status_code=403, detail="媒体签名无效或已过期")
    if share_hash:
        share = await container.repository.get_share_link_by_token_hash(share_hash)
        if share is None or not share.active or share.workspace_id != workspace_id:
            raise HTTPException(status_code=403, detail="分享链接无效或已过期")
        if not any(
            isinstance(scene, dict)
            and str(asset_id)
            in {
                scene.get(field)
                for field in (
                    "keyframe_asset_id",
                    "first_frame_asset_id",
                    "last_frame_asset_id",
                    "video_asset_id",
                    "connector_video_asset_id",
                )
            }
            for scene in share.snapshot.get("scenes", [])
        ):
            raise HTTPException(status_code=403, detail="媒体不属于此分享")
    asset = await container.repository.get_asset(asset_id)
    if asset is None or asset.workspace_id != workspace_id or asset.status != AssetStatus.READY:
        raise HTTPException(status_code=404, detail="Asset content not found")
    if variant == "scrub" and asset.kind is not AssetKind.VIDEO:
        raise HTTPException(status_code=422, detail="Scrub variants require a video asset")
    if session_id:
        try:
            active = await container.repository.is_auth_session_active(UUID(session_id))
        except ValueError as error:
            raise HTTPException(status_code=403, detail="媒体签名无效或已过期") from error
        if not active:
            raise HTTPException(status_code=403, detail="媒体签名无效或已过期")
    try:
        content = await container.storage.open_content_stream(
            asset, variant=variant, range_header=range_header
        )
    except AssetQuotaExceeded as error:
        raise HTTPException(status_code=413, detail="工作区存储空间不足") from error
    except ScrubVariantBusy as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Scrub derivative is being prepared; retry shortly",
            headers={"Retry-After": "2"},
        ) from error
    except RangeNotSatisfiable as error:
        raise HTTPException(
            status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            detail=str(error),
            headers={"Content-Range": f"bytes */{error.total_size}"},
        ) from error
    return asset_stream_response(
        content,
        "private, no-store" if share_hash else f"private, max-age={max(0, exp - int(time.time()))}",
    )


@router.get("/assets/{asset_id}/content", tags=["assets"])
async def get_asset_content(
    request: Request,
    asset: OwnedAsset,
    range_header: str | None = Header(default=None, alias="Range"),
) -> Response:
    container = get_container(request)
    if asset.status != AssetStatus.READY:
        raise HTTPException(status_code=404, detail="Asset content not found")
    try:
        content = await container.storage.open_content_stream(asset, range_header=range_header)
    except RangeNotSatisfiable as error:
        raise HTTPException(
            status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            detail=str(error),
            headers={"Content-Range": f"bytes */{error.total_size}"},
        ) from error
    return asset_stream_response(content, "private, max-age=3600")


@router.delete("/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["assets"])
async def delete_asset(request: Request, asset: OwnedAsset) -> Response:
    container = get_container(request)
    if asset.status != AssetStatus.DELETING:
        asset = await container.repository.save_asset(
            asset.model_copy(update={"status": AssetStatus.DELETING})
        )
    try:
        await container.storage.delete_content(asset)
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail="资产已进入删除队列，存储清理将在后台重试",
        ) from error
    if (
        not await container.repository.delete_asset(asset.id)
        # A concurrent reconciler may have completed the same tombstone.
        and await container.repository.get_asset(asset.id) is not None
    ):
        raise HTTPException(status_code=503, detail="资产删除尚未完成")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/professional-projects",
    response_model=ProfessionalProject,
    status_code=status.HTTP_201_CREATED,
    tags=["professional-projects"],
)
async def create_professional_project(
    request: Request,
    payload: CreateProfessionalProjectRequest,
    workspace_id: AuthenticatedWorkspaceId,
) -> ProfessionalProject:
    try:
        project = await get_container(request).professional_projects.create(workspace_id, payload)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    await get_container(request).redis_bus.signal_event(project.workspace_id)
    return project


@router.get(
    "/professional-projects",
    response_model=CursorPage[ProfessionalProject],
    tags=["professional-projects"],
)
async def list_professional_projects(
    request: Request,
    workspace_id: AuthenticatedWorkspaceId,
    limit: int = Query(default=50, ge=1, le=200),
    cursor: str | None = Query(default=None),
    archived: bool = Query(default=False),
    query: str | None = Query(default=None, max_length=120),
    kind: ProfessionalProjectKind | None = None,
) -> CursorPage[ProfessionalProject]:
    try:
        before = decode_pinned_cursor(cursor)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    repository = get_container(request).repository
    projects = await repository.list_professional_projects(
        workspace_id,
        limit + 1,
        before,
        archived,
        search=query,
        kind=kind,
    )
    total = await repository.count_professional_projects(
        workspace_id, archived, search=query, kind=kind
    )
    visible = projects[:limit]
    return CursorPage(
        items=visible,
        total=total,
        next_cursor=(
            encode_pinned_cursor(visible[-1].pinned, visible[-1].updated_at, visible[-1].id)
            if len(projects) > limit and visible
            else None
        ),
    )


@router.get(
    "/professional-projects/{project_id}",
    response_model=ProfessionalProject,
    tags=["professional-projects"],
)
async def get_professional_project(
    project: OwnedProfessionalProject,
) -> ProfessionalProject:
    return project


@router.patch(
    "/professional-projects/{project_id}",
    response_model=ProfessionalProject,
    tags=["professional-projects"],
)
async def update_professional_project(
    request: Request,
    project: OwnedProfessionalProject,
    payload: UpdateProfessionalProjectRequest,
) -> ProfessionalProject:
    try:
        updated = await persist_agent_project_mutation(
            request,
            get_container(request).professional_projects.update(project, payload),
        )
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except (TypeError, ValueError) as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    await get_container(request).redis_bus.signal_event(updated.workspace_id)
    return updated


@router.post(
    "/professional-projects/{project_id}/scroll-world/scenes/{scene_id}/media",
    response_model=ProfessionalProject | MediaBoundaryOperation,
    tags=["professional-projects"],
)
async def apply_scroll_world_media(
    request: Request,
    response: Response,
    project: OwnedProfessionalProject,
    scene_id: UUID,
    payload: ApplyScrollWorldMediaRequest,
) -> ProfessionalProject | MediaBoundaryOperation:
    try:
        updated = await get_container(
            request
        ).professional_projects.apply_scroll_world_media(project, scene_id, payload)
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except (TypeError, ValueError) as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    if isinstance(updated, MediaBoundaryOperation):
        response.status_code = status.HTTP_202_ACCEPTED
        return updated
    await get_container(request).redis_bus.signal_event(updated.workspace_id)
    return updated


@router.post(
    "/professional-projects/{project_id}/compose",
    response_model=ProfessionalProject,
    tags=["professional-projects"],
)
async def compose_safety_education_project(
    request: Request,
    project: OwnedProfessionalProject,
    payload: ComposeSafetyEducationRequest,
) -> ProfessionalProject:
    try:
        updated = await get_container(request).professional_projects.compose_safety_education(
            project, payload
        )
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except AssetQuotaExceeded as error:
        raise_asset_validation_error(error)
    except (TypeError, ValueError) as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=503, detail="成片合并失败，请检查视频文件后重试") from error
    await get_container(request).redis_bus.signal_event(updated.workspace_id)
    return updated


@router.post(
    "/professional-projects/{project_id}/share",
    response_model=ShareTokenResponse,
    tags=["professional-projects"],
)
async def share_professional_project(
    request: Request,
    project: OwnedProfessionalProject,
) -> ShareTokenResponse:
    if (
        project.kind != ProfessionalProjectKind.SCROLL_WORLD
        or project.config.kind != "scroll-world"
    ):
        raise HTTPException(status_code=409, detail="当前项目不支持独立预览")
    if project.config.architecture != "loop-connector-v3":
        raise HTTPException(
            status_code=409,
            detail="该项目使用旧版飞入视频，请先按定帧升级重制场景循环。",
        )
    try:
        await get_container(request).professional_projects._validate_completed_project(project)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    ordered_scenes = sorted(project.config.scenes, key=lambda item: item.sequence)
    if not ordered_scenes or any(
        scene.keyframe_asset_id is None
        or scene.first_frame_asset_id is None
        or scene.video_asset_id is None
        or scene.last_frame_asset_id is None
        or (
            index < len(ordered_scenes) - 1
            and scene.connector_video_asset_id is None
        )
        for index, scene in enumerate(ordered_scenes)
    ):
        raise HTTPException(
            status_code=409,
            detail="请先完成全部场景定帧、场景循环、真实首尾帧和切节连接视频，再创建预览链接",
        )

    repository = get_container(request).repository
    for scene in ordered_scenes:
        for asset_id in (
            scene.keyframe_asset_id,
            scene.first_frame_asset_id,
            scene.video_asset_id,
            scene.last_frame_asset_id,
            scene.connector_video_asset_id,
        ):
            if asset_id is None:
                continue
            asset = await repository.get_asset(asset_id)
            if (
                asset is None
                or asset.workspace_id != project.workspace_id
                or asset.status != AssetStatus.READY
            ):
                raise HTTPException(
                    status_code=409,
                    detail="预览所需的媒体尚未就绪，请刷新项目状态后重试",
                )

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(days=30)
    share = await repository.replace_share_link(
        ShareLink(
            workspace_id=project.workspace_id,
            resource_type="scroll-world",
            resource_id=project.id,
            token_hash=hashlib.sha256(token.encode()).hexdigest(),
            expires_at=expires_at,
            snapshot={
                "kind": "scroll-world",
                "project_id": str(project.id),
                "title": project.title,
                "summary": project.summary,
                "updated_at": project.updated_at.isoformat(),
                "aspect_ratio": project.config.aspect_ratio,
                "visual_style": project.config.visual_style,
                "brand": project.config.brand,
                "pitch": project.config.pitch,
                "palette": project.config.palette,
                "art_direction": project.config.art_direction,
                "tier": project.config.tier,
                "architecture": project.config.architecture,
                "scenes": [
                    {
                        "id": str(scene.id),
                        "sequence": scene.sequence,
                        "title": scene.title,
                        "description": scene.description,
                        "eyebrow": scene.eyebrow,
                        "body": scene.body,
                        "purpose": scene.purpose,
                        "tags": scene.tags,
                        "duration_seconds": scene.duration_seconds,
                        "keyframe_asset_id": str(scene.keyframe_asset_id),
                        "first_frame_asset_id": str(scene.first_frame_asset_id),
                        "video_asset_id": str(scene.video_asset_id),
                        "last_frame_asset_id": str(scene.last_frame_asset_id),
                        "connector_video_asset_id": (
                            str(scene.connector_video_asset_id)
                            if scene.connector_video_asset_id is not None
                            else None
                        ),
                    }
                    for scene in ordered_scenes
                ],
            },
        )
    )
    return ShareTokenResponse(
        share_id=share.id,
        token=token,
        expires_at=int(expires_at.timestamp()),
    )


@router.delete(
    "/professional-projects/{project_id}/share",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["professional-projects"],
)
async def revoke_professional_project_shares(
    request: Request,
    project: OwnedProfessionalProject,
) -> Response:
    await get_container(request).repository.revoke_share_links_for_resource(
        project.workspace_id, "scroll-world", project.id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete(
    "/professional-projects/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["professional-projects"],
)
async def delete_professional_project(
    request: Request,
    project: OwnedProfessionalProject,
) -> Response:
    if project.run is not None and project.run.status in {
        ProfessionalRunStatus.QUEUED,
        ProfessionalRunStatus.RUNNING,
        ProfessionalRunStatus.PAUSED,
    }:
        raise HTTPException(status_code=409, detail="请先取消当前生产运行再删除项目")
    deleted = await get_container(request).repository.delete_professional_project(project.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Professional project not found")
    await get_container(request).repository.delete_conversation(project.conversation_id)
    await get_container(request).redis_bus.signal_event(project.workspace_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/professional-projects/{project_id}/runs",
    response_model=ProfessionalProject,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["professional-projects"],
)
async def start_professional_run(
    request: Request,
    project: OwnedProfessionalProject,
    payload: StartProfessionalRunRequest,
) -> ProfessionalProject:
    try:
        updated = await get_container(request).professional_projects.start_run(project, payload)
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    await get_container(request).redis_bus.signal_event(updated.workspace_id)
    return updated


@router.get(
    "/professional-projects/{project_id}/run",
    response_model=ProfessionalRun,
    tags=["professional-projects"],
)
async def get_professional_run(
    project: OwnedProfessionalProject,
) -> ProfessionalRun:
    if project.run is None:
        raise HTTPException(status_code=404, detail="Production run not found")
    return project.run


@router.patch(
    "/professional-projects/{project_id}/run",
    response_model=ProfessionalProject,
    tags=["professional-projects"],
)
async def update_professional_run(
    request: Request,
    project: OwnedProfessionalProject,
    payload: UpdateProfessionalRunRequest,
) -> ProfessionalProject:
    try:
        updated = await get_container(request).professional_projects.update_run(project, payload)
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    await get_container(request).redis_bus.signal_event(updated.workspace_id)
    return updated


@router.post(
    "/drama-projects",
    response_model=DramaProject,
    status_code=status.HTTP_201_CREATED,
    tags=["drama"],
)
async def create_drama_project(
    request: Request,
    payload: CreateDramaProjectRequest,
    workspace_id: AuthenticatedWorkspaceId,
) -> DramaProject:
    project = await get_container(request).dramas.create_project(workspace_id, payload)
    await signal_drama_project_updated(request, project)
    return project


@router.get(
    "/drama-projects",
    response_model=CursorPage[DramaProject],
    tags=["drama"],
)
async def list_drama_projects(
    request: Request,
    workspace_id: AuthenticatedWorkspaceId,
    limit: int = Query(default=50, ge=1, le=200),
    cursor: str | None = Query(default=None),
    archived: bool = Query(default=False),
    query: str | None = Query(default=None, max_length=120),
) -> CursorPage[DramaProject]:
    try:
        before = decode_pinned_cursor(cursor)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    projects = await get_container(request).repository.list_drama_projects(
        workspace_id, limit + 1, before, archived, search=query
    )
    total = await get_container(request).repository.count_drama_projects(
        workspace_id, archived, search=query
    )
    visible = projects[:limit]
    return CursorPage(
        items=visible,
        total=total,
        next_cursor=(
            encode_pinned_cursor(visible[-1].pinned, visible[-1].updated_at, visible[-1].id)
            if len(projects) > limit and visible
            else None
        ),
    )


@router.get("/drama-projects/{project_id}", response_model=DramaProject, tags=["drama"])
async def get_drama_project(project: OwnedDramaProject) -> DramaProject:
    return project


@router.get(
    "/drama-projects/{project_id}/audit",
    response_model=DramaProductionAudit,
    tags=["drama"],
)
async def audit_drama_project(request: Request, project: OwnedDramaProject) -> DramaProductionAudit:
    return await get_container(request).dramas.audit_project(project)


@router.post(
    "/drama-projects/{project_id}/storyboard/preview",
    response_model=DramaStoryboardPreview,
    tags=["drama"],
)
async def preview_drama_storyboard(
    request: Request,
    project: OwnedDramaProject,
    payload: DraftDramaStoryboardRequest,
) -> DramaStoryboardPreview:
    container = get_container(request)
    if not container.settings.agent_enabled:
        raise HTTPException(status_code=503, detail="Agent service is not enabled")
    ensure_drama_manual_action_allowed(project)
    try:
        return await container.dramas.preview_storyboard(project, payload)
    except LookupError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except AgentServiceError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail={
                "code": error.code,
                "message": error.user_message,
                "retryable": error.retryable,
            },
        ) from error


@router.post(
    "/drama-projects/{project_id}/storyboard/apply",
    response_model=DramaProject,
    tags=["drama"],
)
async def apply_drama_storyboard(
    request: Request,
    project: OwnedDramaProject,
    payload: ApplyDramaStoryboardRequest,
) -> DramaProject:
    ensure_drama_manual_action_allowed(project)
    try:
        updated = await get_container(request).dramas.apply_storyboard(project, payload)
        await signal_drama_project_updated(request, updated)
        return updated
    except LookupError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="短剧项目已在其他窗口更新") from error


@router.post(
    "/drama-projects/{project_id}/storyboard/replace",
    response_model=DramaProject,
    tags=["drama"],
)
async def replace_drama_storyboard(
    request: Request,
    project: OwnedDramaProject,
    payload: ReplaceDramaStoryboardRequest,
) -> DramaProject:
    ensure_drama_manual_action_allowed(project)
    try:
        updated = await persist_agent_project_mutation(
            request,
            get_container(request).dramas.replace_storyboard(project, payload),
        )
        await signal_drama_project_updated(request, updated)
        return updated
    except LookupError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="短剧项目已在其他窗口更新") from error


@router.get("/drama-projects/{project_id}/automation", tags=["drama"])
async def get_drama_automation(request: Request, project: OwnedDramaProject):
    if not project.automation:
        return {"run": None}
    service = get_container(request).drama_automation
    return {"run": await service.describe(project, project.automation, include_steps=True)}


@router.get("/drama-projects/{project_id}/automation/runs", tags=["drama"])
async def list_drama_automation_runs(
    request: Request, project: OwnedDramaProject, limit: int = Query(default=30, ge=1, le=100)
):
    container = get_container(request)
    records = await container.repository.list_drama_automation_runs(
        project.workspace_id, project.id, limit
    )
    return {"runs": [await container.drama_automation.describe(project, r["run"]) for r in records]}


@router.get("/drama-projects/{project_id}/automation/runs/{run_id}", tags=["drama"])
async def get_drama_automation_run(request: Request, project: OwnedDramaProject, run_id: UUID):
    container = get_container(request)
    run = await container.repository.get_drama_automation_run(
        project.workspace_id, project.id, run_id
    )
    if not run:
        raise HTTPException(404, "自动制片运行不存在")
    return {"run": await container.drama_automation.describe(project, run, include_steps=True)}


@router.get("/drama-projects/{project_id}/shots", tags=["drama"])
async def list_drama_shots(
    project: OwnedDramaProject,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=50),
):
    return {
        "project_id": str(project.id),
        "version": project.version,
        "total": len(project.shots),
        "offset": offset,
        "shots": [s.model_dump(mode="json") for s in project.shots[offset : offset + limit]],
        "next_offset": offset + limit if offset + limit < len(project.shots) else None,
    }


@router.get(
    "/drama-projects/{project_id}/automation/preview",
    response_model=DramaAutomationPreview,
    tags=["drama"],
)
async def preview_drama_automation(
    request: Request,
    project: OwnedDramaProject,
    mode: str = Query(default="quality", pattern=r"^(fast|quality)$"),
    max_video_takes: int = Query(default=2, ge=1, le=5),
    max_frame_takes: int = Query(default=2, ge=1, le=3),
) -> DramaAutomationPreview:
    try:
        container = get_container(request)
        preview = await container.drama_automation.preview(
            project, mode, max_video_takes, max_frame_takes
        )
        ttl_seconds = 120
        return preview.model_copy(
            update={
                "confirmation_token": issue_action_token(
                    {
                        "workspace_id": project.workspace_id,
                        "project_id": str(project.id),
                        "project_version": project.version,
                        "mode": mode,
                        "max_video_takes": max_video_takes,
                        "max_frame_takes": max_frame_takes,
                        "maximum_credits": preview.maximum_credits,
                        "plan_fingerprint": preview.plan.fingerprint if preview.plan else None,
                    },
                    container.settings.auth_secret,
                    purpose="drama-automation-preview",
                    ttl_seconds=ttl_seconds,
                ),
                "expires_in": ttl_seconds,
            }
        )
    except ProviderUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.post(
    "/drama-projects/{project_id}/automation/start",
    response_model=DramaProject,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["drama"],
)
async def start_drama_automation(
    request: Request,
    project: OwnedDramaProject,
    payload: StartDramaAutomationRequest,
) -> DramaProject:
    try:
        container = get_container(request)
        if not payload.confirmation_token:
            raise HTTPException(status_code=409, detail="请先预估并确认自动制片预算")
        try:
            preview_claims = verify_action_token(
                payload.confirmation_token,
                container.settings.auth_secret,
                purpose="drama-automation-preview",
            )
        except InvalidToken as error:
            raise HTTPException(
                status_code=409, detail="自动制片预算确认已失效，请重新预估"
            ) from error
        operation_id = str(preview_claims.get("nonce", ""))
        if (
            operation_id
            and project.automation is not None
            and project.automation.operation_id == operation_id
        ):
            return project
        expected = {
            "workspace_id": project.workspace_id,
            "project_id": str(project.id),
            "project_version": project.version,
            "mode": payload.mode,
            "max_video_takes": payload.max_video_takes,
            "max_frame_takes": payload.max_frame_takes,
        }
        if any(preview_claims.get(key) != value for key, value in expected.items()):
            raise HTTPException(status_code=409, detail="项目或自动制片参数已变化，请重新预估")
        current_preview, locks = await container.drama_automation._preview_with_quotes(
            project, payload.mode, payload.max_video_takes, payload.max_frame_takes
        )
        if current_preview.maximum_credits != preview_claims.get("maximum_credits"):
            raise HTTPException(status_code=409, detail="自动制片预算已变化，请重新确认")
        if not current_preview.plan or current_preview.plan.fingerprint != preview_claims.get(
            "plan_fingerprint"
        ):
            raise HTTPException(status_code=409, detail="制作方案或供应商已变化，请重新预估并确认")
        updated = await container.drama_automation.start(
            project,
            payload.model_copy(update={"operation_id": operation_id}),
            approved_preview=current_preview.model_dump(mode="json"),
            approved_locks={k: v.model_dump(mode="json") for k, v in locks.items()},
        )
        await signal_drama_project_updated(request, updated)
        return updated
    except ProviderUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except InsufficientCredits as error:
        raise HTTPException(status_code=402, detail=str(error)) from error
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="短剧项目已在其他窗口更新") from error


@router.post(
    "/drama-projects/{project_id}/automation/cancel",
    response_model=DramaProject,
    tags=["drama"],
)
async def cancel_drama_automation(
    request: Request,
    project: OwnedDramaProject,
) -> DramaProject:
    try:
        updated = await get_container(request).drama_automation.cancel(project)
        await signal_drama_project_updated(request, updated)
        return updated
    except LookupError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="短剧项目已在其他窗口更新") from error


@router.patch("/drama-projects/{project_id}", response_model=DramaProject, tags=["drama"])
async def update_drama_project(
    request: Request,
    project: OwnedDramaProject,
    payload: UpdateDramaProjectRequest,
) -> DramaProject:
    try:
        container = get_container(request)
        if (
            payload.archived is True
            and project.automation is not None
            and project.automation.status == DramaAutomationStatus.RUNNING
        ):
            project = await container.drama_automation.cancel(project)
            payload = payload.model_copy(update={"base_version": project.version})
        updated = await persist_agent_project_mutation(
            request,
            container.dramas.update_project(project, payload),
        )
        await signal_drama_project_updated(request, updated)
        return updated
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="短剧项目已在其他窗口更新") from error
    except LookupError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.post(
    "/drama-projects/{project_id}/duplicate",
    response_model=DramaProject,
    tags=["drama"],
)
async def duplicate_drama_project(request: Request, project: OwnedDramaProject) -> DramaProject:
    duplicated = await get_container(request).dramas.duplicate_project(project)
    await signal_drama_project_updated(request, duplicated)
    return duplicated


@router.post(
    "/drama-projects/{project_id}/share",
    response_model=ShareTokenResponse,
    tags=["drama"],
)
async def share_drama_project(request: Request, project: OwnedDramaProject) -> ShareTokenResponse:
    repository = get_container(request).repository
    ttl_seconds = 7 * 24 * 60 * 60
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(seconds=ttl_seconds)
    snapshot: dict[str, object] = {
        "kind": "drama",
        "title": project.title,
        "updated_at": project.updated_at.isoformat(),
        "logline": project.logline,
        "aspect_ratio": project.aspect_ratio,
        "visual_style": project.visual_style,
        "characters": [
            {
                "name": character.name,
                "description": character.description,
                "voice_hint": character.voice_hint,
            }
            for character in project.characters
        ],
        "shots": [
            {
                "sequence": shot.sequence,
                "title": shot.title,
                "summary": shot.summary,
                "prompt": shot.prompt,
                "duration_seconds": shot.duration_seconds,
                "dialogue": shot.dialogue,
            }
            for shot in project.shots
        ],
    }
    share = await repository.replace_share_link(
        ShareLink(
            workspace_id=project.workspace_id,
            resource_type="drama",
            resource_id=project.id,
            token_hash=hashlib.sha256(token.encode()).hexdigest(),
            snapshot=snapshot,
            expires_at=expires_at,
        )
    )
    return ShareTokenResponse(
        share_id=share.id, token=token, expires_at=int(expires_at.timestamp())
    )


@router.delete(
    "/drama-projects/{project_id}/share",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["drama"],
)
async def revoke_drama_project_shares(request: Request, project: OwnedDramaProject) -> Response:
    await get_container(request).repository.revoke_share_links_for_resource(
        project.workspace_id, "drama", project.id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/drama-projects/{project_id}/characters/bulk-upsert",
    response_model=DramaProject,
    tags=["drama"],
)
async def upsert_drama_characters(
    request: Request,
    project: OwnedDramaProject,
    payload: UpsertDramaCharactersRequest,
) -> DramaProject:
    ensure_drama_manual_action_allowed(project)
    try:
        updated = await persist_agent_project_mutation(
            request,
            get_container(request).dramas.upsert_characters(project, payload),
        )
        await signal_drama_project_updated(request, updated)
        return updated
    except LookupError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="短剧项目已在其他窗口更新") from error


@router.post(
    "/drama-projects/{project_id}/characters/{character_id}/portrait",
    response_model=DramaShotGenerationResult,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["drama"],
)
async def generate_drama_character_portrait(
    request: Request,
    project: OwnedDramaProject,
    character_id: UUID,
    payload: GenerateDramaShotRequest,
) -> DramaShotGenerationResult:
    ensure_drama_manual_action_allowed(project)
    try:
        result = await get_container(request).dramas.generate_character_portrait(
            project, character_id, payload
        )
        await signal_drama_project_updated(request, result.project)
        return result
    except IdempotencyKeyConflict as error:
        raise HTTPException(status_code=409, detail={
            "code": "DRAMA_GENERATION_CONFLICT",
            "message": "生成记录与当前内容不一致，本次未创建新任务。请刷新项目，查看已有任务后再重试。",
            "submission_state": "not_started",
        }) from error
    except ProviderUnavailableError as error:
        # Provider selection/quotation failed before job admission or credit holds.
        raise HTTPException(status_code=503, detail={
            "code": error.code,
            "message": f"{error}。本次未创建生成任务，也未扣除灵感。",
            "submission_state": "not_started",
        }) from error
    except LookupError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except InsufficientCredits as error:
        raise HTTPException(status_code=402, detail=str(error)) from error
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="短剧项目已在其他窗口更新") from error


@router.post(
    "/drama-projects/{project_id}/characters/{character_id}/anchor-video",
    response_model=DramaShotGenerationResult,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["drama"],
)
async def generate_drama_character_anchor_video(
    request: Request,
    project: OwnedDramaProject,
    character_id: UUID,
    payload: GenerateDramaShotRequest,
) -> DramaShotGenerationResult:
    ensure_drama_manual_action_allowed(project)
    try:
        result = await get_container(request).dramas.generate_character_anchor_video(
            project, character_id, payload
        )
        await signal_drama_project_updated(request, result.project)
        return result
    except IdempotencyKeyConflict as error:
        raise HTTPException(status_code=409, detail={
            "code": "DRAMA_GENERATION_CONFLICT",
            "message": "生成记录与当前内容不一致，本次未创建新任务。请刷新项目，查看已有任务后再重试。",
            "submission_state": "not_started",
        }) from error
    except ProviderUnavailableError as error:
        # Provider selection/quotation failed before job admission or credit holds.
        raise HTTPException(status_code=503, detail={
            "code": error.code,
            "message": f"{error}。本次未创建生成任务，也未扣除灵感。",
            "submission_state": "not_started",
        }) from error
    except LookupError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except InsufficientCredits as error:
        raise HTTPException(status_code=402, detail=str(error)) from error
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="短剧项目已在其他窗口更新") from error


@router.delete(
    "/drama-projects/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["drama"],
)
async def delete_drama_project(request: Request, project: OwnedDramaProject) -> Response:
    container = get_container(request)
    if (
        project.automation is not None
        and project.automation.status == DramaAutomationStatus.RUNNING
    ):
        project = await container.drama_automation.cancel(project)
    cancellation_failures = await container.dramas.cancel_project_jobs(project)
    if cancellation_failures:
        raise HTTPException(
            status_code=503,
            detail="短剧删除暂未完成：" + "；".join(cancellation_failures[:3]),
        )
    if not await container.repository.delete_drama_project(project.id):
        raise HTTPException(status_code=404, detail="Drama project not found")
    await signal_drama_project_updated(request, project)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/drama-projects/{project_id}/shots",
    response_model=DramaProject,
    status_code=status.HTTP_201_CREATED,
    tags=["drama"],
)
async def create_drama_shot(
    request: Request,
    project: OwnedDramaProject,
    payload: CreateDramaShotRequest,
) -> DramaProject:
    ensure_drama_manual_action_allowed(project)
    try:
        updated = await persist_agent_project_mutation(
            request,
            get_container(request).dramas.add_shot(project, payload),
        )
        await signal_drama_project_updated(request, updated)
        return updated
    except LookupError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="短剧项目已在其他窗口更新") from error


@router.patch(
    "/drama-projects/{project_id}/shots/reorder",
    response_model=DramaProject,
    tags=["drama"],
)
async def reorder_drama_shots(
    request: Request,
    project: OwnedDramaProject,
    payload: ReorderDramaShotsRequest,
) -> DramaProject:
    ensure_drama_manual_action_allowed(project)
    try:
        updated = await get_container(request).dramas.reorder_shots(project, payload)
        await signal_drama_project_updated(request, updated)
        return updated
    except LookupError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="短剧项目已在其他窗口更新") from error


@router.patch(
    "/drama-projects/{project_id}/shots/{shot_id}",
    response_model=DramaProject,
    tags=["drama"],
)
async def update_drama_shot(
    request: Request,
    project: OwnedDramaProject,
    shot_id: UUID,
    payload: UpdateDramaShotRequest,
) -> DramaProject:
    ensure_drama_manual_action_allowed(project)
    try:
        updated = await persist_agent_project_mutation(
            request,
            get_container(request).dramas.update_shot(project, shot_id, payload),
        )
        await signal_drama_project_updated(request, updated)
        return updated
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="短剧项目已在其他窗口更新") from error


@router.post(
    "/drama-projects/{project_id}/shots/{shot_id}/review",
    response_model=DramaProject,
    tags=["drama"],
)
async def review_drama_shot(
    request: Request,
    project: OwnedDramaProject,
    shot_id: UUID,
    payload: ReviewDramaShotRequest,
) -> DramaProject:
    ensure_drama_manual_action_allowed(project)
    try:
        updated = await persist_agent_project_mutation(
            request,
            get_container(request).dramas.review_shot(project, shot_id, payload),
        )
        await signal_drama_project_updated(request, updated)
        return updated
    except LookupError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="短剧项目已在其他窗口更新") from error


@router.delete(
    "/drama-projects/{project_id}/shots/{shot_id}",
    response_model=DramaProject,
    tags=["drama"],
)
async def delete_drama_shot(
    request: Request,
    project: OwnedDramaProject,
    shot_id: UUID,
) -> DramaProject:
    ensure_drama_manual_action_allowed(project)
    try:
        updated = await get_container(request).dramas.delete_shot(project, shot_id)
        await signal_drama_project_updated(request, updated)
        return updated
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="短剧项目已在其他窗口更新") from error


@router.post(
    "/drama-projects/{project_id}/shots/{shot_id}/keyframe",
    response_model=DramaShotGenerationResult,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["drama"],
)
async def generate_drama_keyframe(
    request: Request,
    project: OwnedDramaProject,
    shot_id: UUID,
    payload: GenerateDramaShotRequest,
) -> DramaShotGenerationResult:
    ensure_drama_manual_action_allowed(project)
    try:
        result = await get_container(request).dramas.generate_keyframe(project, shot_id, payload)
        await signal_drama_project_updated(request, result.project)
        return result
    except IdempotencyKeyConflict as error:
        raise HTTPException(status_code=409, detail={
            "code": "DRAMA_GENERATION_CONFLICT",
            "message": "生成记录与当前内容不一致，本次未创建新任务。请刷新项目，查看已有任务后再重试。",
            "submission_state": "not_started",
        }) from error
    except ProviderUnavailableError as error:
        # Provider selection/quotation failed before job admission or credit holds.
        raise HTTPException(status_code=503, detail={
            "code": error.code,
            "message": f"{error}。本次未创建生成任务，也未扣除灵感。",
            "submission_state": "not_started",
        }) from error
    except LookupError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except InsufficientCredits as error:
        raise HTTPException(status_code=402, detail=str(error)) from error
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="短剧项目已在其他窗口更新") from error


@router.post(
    "/drama-projects/{project_id}/shots/{shot_id}/last-frame",
    response_model=DramaShotGenerationResult,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["drama"],
)
async def generate_drama_last_frame(
    request: Request,
    project: OwnedDramaProject,
    shot_id: UUID,
    payload: GenerateDramaShotRequest,
) -> DramaShotGenerationResult:
    ensure_drama_manual_action_allowed(project)
    try:
        result = await get_container(request).dramas.generate_last_frame(project, shot_id, payload)
        await signal_drama_project_updated(request, result.project)
        return result
    except IdempotencyKeyConflict as error:
        raise HTTPException(status_code=409, detail={
            "code": "DRAMA_GENERATION_CONFLICT",
            "message": "生成记录与当前内容不一致，本次未创建新任务。请刷新项目，查看已有任务后再重试。",
            "submission_state": "not_started",
        }) from error
    except ProviderUnavailableError as error:
        # Provider selection/quotation failed before job admission or credit holds.
        raise HTTPException(status_code=503, detail={
            "code": error.code,
            "message": f"{error}。本次未创建生成任务，也未扣除灵感。",
            "submission_state": "not_started",
        }) from error
    except LookupError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except InsufficientCredits as error:
        raise HTTPException(status_code=402, detail=str(error)) from error
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="短剧项目已在其他窗口更新") from error


@router.post(
    "/drama-projects/{project_id}/shots/{shot_id}/video",
    response_model=DramaShotGenerationResult,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["drama"],
)
async def generate_drama_video(
    request: Request,
    project: OwnedDramaProject,
    shot_id: UUID,
    payload: GenerateDramaShotRequest,
) -> DramaShotGenerationResult:
    ensure_drama_manual_action_allowed(project)
    try:
        result = await get_container(request).dramas.generate_video(project, shot_id, payload)
        await signal_drama_project_updated(request, result.project)
        return result
    except IdempotencyKeyConflict as error:
        raise HTTPException(status_code=409, detail={
            "code": "DRAMA_GENERATION_CONFLICT",
            "message": "生成记录与当前内容不一致，本次未创建新任务。请刷新项目，查看已有任务后再重试。",
            "submission_state": "not_started",
        }) from error
    except ProviderUnavailableError as error:
        # Provider selection/quotation failed before job admission or credit holds.
        raise HTTPException(status_code=503, detail={
            "code": error.code,
            "message": f"{error}。本次未创建生成任务，也未扣除灵感。",
            "submission_state": "not_started",
        }) from error
    except LookupError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except InsufficientCredits as error:
        raise HTTPException(status_code=402, detail=str(error)) from error
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="短剧项目已在其他窗口更新") from error


@router.post(
    "/conversations",
    response_model=ConversationSummary,
    tags=["agent"],
)
async def create_conversation(
    request: Request,
    payload: CreateConversationRequest,
    workspace_id: WorkspaceId,
) -> ConversationSummary:
    project_ref = None
    if payload.project_id:
        from app.creation.router import call
        from app.creation.service import CreationService
        from app.domain.creation import ProjectRef
        kind, project = await call(CreationService(get_container(request)).project(workspace_id, payload.project_id))
        project_ref = ProjectRef(id=project.id, kind=kind)
    if not project_ref:
        from app.creation.folder_history import ensure_history
        from app.domain.creation import ProjectRef
        folder = await ensure_history(get_container(request).repository, workspace_id)
        project_ref = ProjectRef(id=folder.id, kind="free")
    conversation = await get_container(request).conversations.create(
        workspace_id, payload.title, payload.system_prompt, creation_project=project_ref
    )
    return ConversationSummary.from_conversation(conversation)


@router.get(
    "/conversations",
    response_model=CursorPage[ConversationSummary],
    tags=["agent"],
)
async def list_conversations(
    request: Request,
    workspace_id: WorkspaceId,
    limit: int = Query(default=50, ge=1, le=200),
    cursor: str | None = Query(default=None),
    archived: bool = Query(default=False),
    query: str | None = Query(default=None, max_length=120),
) -> CursorPage[ConversationSummary]:
    try:
        before = decode_pinned_cursor(cursor)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    search = (query or "").strip() or None
    repository = get_container(request).repository
    conversations, total = await asyncio.gather(
        repository.list_conversations(workspace_id, limit + 1, before, archived, search),
        repository.count_conversations(workspace_id, archived, search),
    )
    visible = conversations[:limit]
    return CursorPage(
        items=[ConversationSummary.from_conversation(item) for item in visible],
        total=total,
        next_cursor=(
            encode_pinned_cursor(visible[-1].pinned, visible[-1].updated_at, visible[-1].id)
            if len(conversations) > limit and visible
            else None
        ),
    )


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationSummary,
    tags=["agent"],
)
async def get_conversation(
    conversation: OwnedConversation,
) -> ConversationSummary:
    return ConversationSummary.from_conversation(conversation)


@router.patch(
    "/conversations/{conversation_id}",
    response_model=ConversationSummary,
    tags=["agent"],
)
async def update_conversation(
    request: Request,
    conversation: OwnedConversation,
    payload: UpdateConversationRequest,
) -> ConversationSummary:
    updates = {
        field: getattr(payload, field)
        for field in payload.model_fields_set
        if getattr(payload, field) is not None
    }
    if "title" in updates:
        updates["title"] = str(updates["title"]).strip()
        if not updates["title"]:
            raise HTTPException(status_code=422, detail="会话名称不能为空")
    if "project_name" in updates:
        updates["project_name"] = str(updates["project_name"]).strip()
    # Opening/restoring a chat marks it read. A repeated read must not invalidate
    # the in-flight turn's optimistic version and discard its reply/trace.
    updates = {field: value for field, value in updates.items() if value != getattr(conversation, field)}
    if not updates:
        return ConversationSummary.from_conversation(conversation)
    if any(field != "unread" for field in updates):
        updates["updated_at"] = datetime.now(UTC)
    try:
        updated = await get_container(request).repository.save_conversation(
            conversation.model_copy(update=updates, deep=True)
        )
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="会话已在其他窗口更新") from error
    return ConversationSummary.from_conversation(updated)


@router.post(
    "/conversations/{conversation_id}/duplicate",
    response_model=ConversationSummary,
    tags=["agent"],
)
async def duplicate_conversation(
    request: Request, conversation: OwnedConversation
) -> ConversationSummary:
    duplicated = await get_container(request).conversations.duplicate(conversation)
    return ConversationSummary.from_conversation(duplicated)


@router.post(
    "/conversations/{conversation_id}/share",
    response_model=ShareTokenResponse,
    tags=["agent"],
)
async def share_conversation(
    request: Request, conversation: OwnedConversation
) -> ShareTokenResponse:
    ttl_seconds = 7 * 24 * 60 * 60
    container = get_container(request)
    messages = await container.repository.list_conversation_messages(
        conversation.id, conversation.workspace_id, limit=1_000
    )
    messages.reverse()
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(seconds=ttl_seconds)
    share = await container.repository.replace_share_link(
        ShareLink(
            workspace_id=conversation.workspace_id,
            resource_type="conversation",
            resource_id=conversation.id,
            token_hash=hashlib.sha256(token.encode()).hexdigest(),
            expires_at=expires_at,
            snapshot={
                "kind": "conversation",
                "title": conversation.title,
                "updated_at": conversation.updated_at.isoformat(),
                "messages": [
                    {
                        "role": message.role.value,
                        "content": message.content,
                        "created_at": message.created_at.isoformat(),
                    }
                    for message in messages
                    if message.role.value in {"user", "assistant"}
                ],
            },
        )
    )
    return ShareTokenResponse(
        share_id=share.id, token=token, expires_at=int(expires_at.timestamp())
    )


@router.delete(
    "/conversations/{conversation_id}/share",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["agent"],
)
async def revoke_conversation_shares(request: Request, conversation: OwnedConversation) -> Response:
    await get_container(request).repository.revoke_share_links_for_resource(
        conversation.workspace_id, "conversation", conversation.id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["agent"],
)
async def delete_conversation(request: Request, conversation: OwnedConversation) -> Response:
    drama_project = await get_container(request).repository.get_drama_project_by_conversation(
        conversation.id
    )
    if drama_project is not None:
        raise HTTPException(
            status_code=409,
            detail="这是短剧项目的导演会话，请在短剧工作台删除对应项目",
        )
    professional_project = await get_container(
        request
    ).repository.get_professional_project_by_conversation(conversation.id)
    if professional_project is not None:
        raise HTTPException(
            status_code=409,
            detail="这是专业应用项目会话，请在对应工作台删除项目",
        )
    if not await get_container(request).repository.delete_conversation(conversation.id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/shares/content", tags=["share"])
async def get_shared_content(
    request: Request, token: str = Query(min_length=20)
) -> dict[str, object]:
    repository = get_container(request).repository
    share = await repository.get_share_link_by_token_hash(
        hashlib.sha256(token.encode()).hexdigest()
    )
    if share is None or not share.active:
        raise HTTPException(status_code=404, detail="分享链接无效或已过期")
    snapshot = json.loads(json.dumps(share.snapshot))
    if snapshot.get("kind") == "conversation":
        # Keep historical snapshots intact; clients can retire links without rewriting data.
        professional = await repository.get_professional_project_by_conversation(share.resource_id)
        conversation = await repository.get_conversation(share.resource_id)
        if (professional and professional.workspace_id == share.workspace_id) or (
            conversation and conversation.workspace_id == share.workspace_id
            and conversation.creation_project and conversation.creation_project.kind == "professional"
        ):
            snapshot["retired"] = True
    if snapshot.get("kind") == "scroll-world":
        container = get_container(request)
        scenes = snapshot.get("scenes")
        project = await repository.get_professional_project(share.resource_id)
        if (
            project is None
            or project.workspace_id != share.workspace_id
            or not isinstance(project.config, ScrollWorldConfig)
        ):
            raise HTTPException(status_code=404, detail="滚动世界项目不存在")
        current_scenes = {str(scene.id): scene for scene in project.config.scenes}
        if isinstance(scenes, list):
            for scene in scenes:
                if not isinstance(scene, dict):
                    continue
                current = current_scenes.get(str(scene.get("id") or ""))
                video_asset_id = scene.get("video_asset_id")
                connector_asset_id = scene.get("connector_video_asset_id")
                if (
                    current is None
                    or not isinstance(video_asset_id, str)
                    or str(current.video_asset_id) != video_asset_id
                    or (
                        isinstance(connector_asset_id, str)
                        and str(current.connector_video_asset_id) != connector_asset_id
                    )
                ):
                    raise HTTPException(
                        status_code=409,
                        detail="滚动世界媒体已更新，请重新生成预览链接",
                    )
                for asset_field, url_field, variant in (
                    ("keyframe_asset_id", "keyframe_url", "original"),
                    ("first_frame_asset_id", "first_frame_url", "original"),
                    ("video_asset_id", "video_url", "scrub"),
                    ("last_frame_asset_id", "last_frame_url", "original"),
                    ("connector_video_asset_id", "connector_video_url", "scrub"),
                ):
                    asset_id = scene.get(asset_field)
                    if not isinstance(asset_id, str):
                        continue
                    signature, expires_at = issue_media_signature(
                        asset_id,
                        share.workspace_id,
                        container.settings.auth_secret,
                        variant=variant,
                        session_id="",
                        ttl_seconds=container.settings.media_signature_ttl_seconds,
                        share_hash=share.token_hash,
                    )
                    scene[url_field] = (
                        f"/v1/assets/{asset_id}/signed-content"
                        f"?variant={variant}&ws={share.workspace_id}&sid="
                        f"&sig={signature}&exp={expires_at}&sh={share.token_hash}"
                    )
    return snapshot


@router.delete("/shares/{share_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["share"])
async def revoke_share(request: Request, share_id: UUID, workspace_id: WorkspaceId) -> Response:
    if not await get_container(request).repository.revoke_share_link(share_id, workspace_id):
        raise HTTPException(status_code=404, detail="分享链接不存在或已撤销")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=CursorPage[ConversationMessage],
    tags=["agent"],
)
async def list_conversation_messages(
    request: Request,
    conversation: OwnedConversation,
    limit: int = Query(default=100, ge=1, le=200),
    cursor: str | None = Query(default=None),
) -> CursorPage[ConversationMessage]:
    try:
        before = decode_cursor(cursor)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    container = get_container(request)
    messages = await container.repository.list_conversation_messages(
        conversation.id, conversation.workspace_id, limit + 1, before
    )
    visible = messages[:limit]
    visible = await container.conversations.refresh_message_job_snapshots(
        visible, conversation.workspace_id
    )
    return CursorPage(
        items=list(reversed(visible)),
        next_cursor=(
            encode_cursor(visible[-1].created_at, visible[-1].id)
            if len(messages) > limit and visible
            else None
        ),
    )


@router.post(
    "/conversations/{conversation_id}/generation-proposals/{proposal_id}/confirm",
    response_model=ConversationMessage,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["agent"],
)
async def confirm_conversation_generation_proposal(
    request: Request,
    conversation: OwnedConversation,
    proposal_id: str,
    workspace_id: SessionWorkspaceId,
) -> ConversationMessage:
    from app.agents.actions import AgentActionService
    from app.domain.agent_actions import AgentActionRequest

    container = get_container(request)
    messages = await container.repository.list_conversation_messages(
        conversation.id, conversation.workspace_id
    )
    source = next(
        (
            message
            for message in messages
            if (message.details.get("generation_proposal") or {}).get("proposal_id") == proposal_id
        ),
        None,
    )
    if source is None:
        raise HTTPException(404, detail="生成确认方案不存在")
    existing = next(
        (
            message
            for message in messages
            if message.details.get("confirmed_proposal_id") == proposal_id
        ),
        None,
    )
    if existing:
        return (
            await container.conversations.refresh_message_job_snapshots(
                [existing], conversation.workspace_id
            )
        )[0]
    proposal = source.details["generation_proposal"]
    payload = AgentActionRequest(
        turn_id=UUID(source.details["reply_to"]),
        operation="generate",
        parameters=proposal["request"],
    )
    # Validate the persisted legacy request binding before upgrading it.
    if (
        generation_proposal_id(
            conversation.id,
            payload.turn_id,
            GenerationRequest.model_validate(payload.parameters),
            proposal["estimated_credits"],
        )
        != proposal_id
    ):
        raise HTTPException(409, detail="生成确认方案与当前对话不匹配")
    if payload.parameters.get("capability") not in {"text-to-video", "image-to-video"}:
        raise HTTPException(422, detail="旧版确认卡只支持视频方案")
    previous_job = await container.repository.find_job_by_idempotency(
        conversation.workspace_id, f"agent-proposal:{proposal_id}"
    )
    if previous_job:
        return source.model_copy(
            update={
                "details": {
                    "confirmed_proposal_id": proposal_id,
                    "tool_runs": [
                        {
                            "tool_name": "confirm_generation_proposal",
                            "job": previous_job.model_dump(mode="json"),
                        }
                    ],
                    "reply_to": source.details.get("reply_to"),
                },
                "content": "该视频任务已提交。",
            }
        )
    service = AgentActionService(container)
    response = await service.submit(conversation, payload, None)
    # Upgraded legacy cards are shown for a fresh click: their provider and expiry
    # were absent from older messages and cannot be inferred as an approval.
    details = dict(source.details)
    details.pop("generation_proposal", None)
    details["action_proposals"] = [response["proposal"]]
    upgraded = source.model_copy(
        update={
            "details": details,
            "content": (
                "该视频任务已提交。"
                if response["status"] == "submitted"
                else "请核对升级后的报价确认卡，再点击执行。"
            ),
        }
    )
    return (
        await container.conversations.refresh_message_job_snapshots(
            [upgraded], conversation.workspace_id
        )
    )[0]


@router.get("/agent/capabilities", response_model=AgentCapabilities, tags=["agent"])
async def agent_capabilities(request: Request, workspace_id: WorkspaceId) -> AgentCapabilities:
    container = get_container(request)
    if not container.settings.agent_enabled:
        return AgentCapabilities()
    try:
        capabilities = await container.conversations.client.capabilities()
        return capabilities.model_copy(update={"web_search_available": container.web_search.available})
    except AgentServiceError as error:
        raise HTTPException(status_code=error.status_code, detail=error.user_message) from error


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=ConversationTurn,
    tags=["agent"],
)
async def send_conversation_message(
    request: Request,
    conversation: OwnedConversation,
    payload: SendConversationMessageRequest,
) -> ConversationTurn:
    container = get_container(request)
    if not container.settings.agent_enabled:
        raise HTTPException(status_code=503, detail="Agent service is not enabled")
    try:
        (
            updated_conversation,
            user_message,
            assistant_message,
        ) = await container.conversations.send_message(
                conversation.id,
                conversation.workspace_id,
                payload.content,
                payload.asset_ids,
                payload.drama_shot_ids,
                payload.client_turn_id,
                payload.reasoning_effort,
                payload.web_enabled,
            )
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ConversationTurnConflictError as error:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "conversation_turn_conflict",
                "message": "该请求编号已用于其他内容，请重新发送。",
                "retryable": False,
            },
        ) from error
    except ConcurrentModificationError as error:
        raise HTTPException(status_code=409, detail="会话已在其他窗口更新，请刷新后重试") from error
    except AgentServiceError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail={
                "code": error.code,
                "message": error.user_message,
                "retryable": error.retryable,
            },
        ) from error
    return ConversationTurn(
        conversation=ConversationSummary.from_conversation(updated_conversation),
        user_message=user_message,
        assistant_message=assistant_message,
    )
