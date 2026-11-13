"""TargetJEE Engine FastAPI boundary.

The production service accepts source material, queues a Vision-LLM extraction job,
validates the model output against the strict contract, and persists through Prisma
(or SQLAlchemy/asyncpg where a Python-owned write layer is preferred).

This compact reference implementation deliberately never manufactures distractors;
without a configured provider it returns a deterministic validation-ready demo item.
"""
from __future__ import annotations

from enum import Enum
import os
import re
from hashlib import sha256
from math import exp
from pathlib import Path
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .extraction import ExtractionResult, ExtractionUnavailable, extract_source
from .psychometrics import ResponseTimeObservation, fit_van_der_linden_speed
from .symbolic_validation import CanonicalExpressionError, assert_no_equivalent_canonical_values, mathematically_equivalent
from .security import EXTRACTION_RATE_LIMITER, request_client_key

app = FastAPI(title="TargetJEE Engine API", version="1.0.0")


def configured_cors_origins() -> list[str]:
    """Comma-separated explicit browser origins; never default to an unrestricted wildcard."""
    configured = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000")
    return [origin.strip().rstrip("/") for origin in configured.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_cors_origins(),
    # Optional for Vercel preview deployments, e.g. ^https://targetjee-.*\.vercel\.app$
    allow_origin_regex=os.getenv("CORS_ALLOW_ORIGIN_REGEX") or None,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    # BYOK headers are forwarded only for the individual extraction request; FastAPI does
    # not persist or log them. They must be explicitly allowed for direct Railway uploads.
    allow_headers=["Content-Type", "Authorization", "X-TargetJee-Vision-Provider", "X-TargetJee-Api-Key", "X-TargetJee-Vision-Model"],
)

class Subject(str, Enum):
    PHYSICS = "Physics"
    CHEMISTRY = "Chemistry"
    MATHEMATICS = "Mathematics"

class NrmParameter(BaseModel):
    model_config = ConfigDict(extra="forbid")
    a: float = Field(ge=-3.0, le=3.0)
    c: float = Field(ge=-8.0, le=8.0)

class TrapPath(BaseModel):
    model_config = ConfigDict(extra="forbid")
    archetype_code: str = Field(pattern=r"^[A-Z0-9_]{4,80}$")
    label: str = Field(min_length=4, max_length=120)
    severity: Literal["CARELESS", "PROCEDURAL", "CONCEPTUAL", "DEEP_CONCEPTUAL"]
    executable_steps: list[str] = Field(min_length=2, max_length=8)
    evaluated_latex: str = Field(min_length=1, max_length=1000)
    evaluated_canonical_value: str = Field(min_length=1, max_length=500)
    diagnosis: str = Field(min_length=20, max_length=800)
    first_wrong_pivot: str = Field(min_length=20, max_length=800)
    why_plausible: str = Field(min_length=20, max_length=800)
    valid_when: str = Field(min_length=12, max_length=500)
    avoidance_rule: str = Field(min_length=12, max_length=300)
    nrm: NrmParameter

class RecoveryCheck(BaseModel):
    """A verified micro-check used to establish that a diagnostic explanation resolved the doubt."""
    model_config = ConfigDict(extra="forbid")
    prompt: str = Field(min_length=12, max_length=600)
    choices: list[str] = Field(min_length=3, max_length=4)
    answer_index: int = Field(ge=0, le=3)
    explanation: str = Field(min_length=20, max_length=800)

    @model_validator(mode="after")
    def answer_index_exists(self):
        if self.answer_index >= len(self.choices):
            raise ValueError("recovery check answer_index must identify one supplied choice")
        return self

class Option(BaseModel):
    model_config = ConfigDict(extra="forbid")
    key: Literal["A", "B", "C", "D"]
    latex: str = Field(min_length=1, max_length=1000)
    canonical_value: str = Field(min_length=1, max_length=500)
    is_correct: bool
    trap_path: TrapPath | None = None

    @model_validator(mode="after")
    def correct_option_has_no_trap_and_distractor_has_trap(self):
        if self.is_correct and self.trap_path is not None:
            raise ValueError("the correct option must not carry a trap_path")
        if not self.is_correct and self.trap_path is None:
            raise ValueError("each distractor must map to a computed trap_path")
        if not self.is_correct and self.trap_path is not None:
            try:
                equivalence = mathematically_equivalent(
                    self.canonical_value, self.trap_path.evaluated_canonical_value
                )
            except CanonicalExpressionError as exc:
                raise ValueError(f"distractor trap evaluation is unsafe: {exc}") from exc
            if equivalence is False or (
                equivalence is None
                and self.canonical_value.strip().lower() != self.trap_path.evaluated_canonical_value.strip().lower()
            ):
                raise ValueError("trap_path evaluated output must equal its displayed option canonical_value")
        return self

class PsychometricParameters(BaseModel):
    model_config = ConfigDict(extra="forbid")
    a_i: float = Field(ge=0.5, le=2.5)
    b_i: float = Field(ge=-3.0, le=3.0)
    c_i: float = Field(ge=0.0, le=0.25)
    beta_i: float = Field(ge=3.5, le=7.5, description="natural log of calibrated seconds")
    alpha_i: float = Field(ge=0.3, le=3.0)
    recommended_seconds: int = Field(ge=30, le=1200)

class GeneratedItem(BaseModel):
    """Strict contract returned by the provider after JSON-schema validation."""
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal["targetjee.item.v1"]
    subject: Subject
    chapter: str = Field(min_length=2, max_length=100)
    topic: str = Field(min_length=2, max_length=140)
    target_level: Literal["JEE Main", "JEE Advanced"]
    source_problem_normalized: str = Field(min_length=20, max_length=12000)
    stem_latex: str = Field(min_length=10, max_length=12000)
    assumptions: list[str] = Field(default_factory=list, max_length=8)
    correct_derivation: list[str] = Field(min_length=2, max_length=12)
    competitive_shortcut: list[str] = Field(min_length=1, max_length=8)
    avoidance_rule: str = Field(min_length=12, max_length=300)
    recovery_check: RecoveryCheck
    options: list[Option] = Field(min_length=4, max_length=4)
    psychometrics: PsychometricParameters
    reviewer_flags: list[str] = Field(default_factory=list, max_length=12)

    @field_validator("options")
    @classmethod
    def exactly_one_correct_and_no_equivalent_options(cls, options: list[Option]):
        if sum(option.is_correct for option in options) != 1:
            raise ValueError("exactly one option must be correct")
        if len({option.key for option in options}) != 4:
            raise ValueError("option keys A, B, C, D are required exactly once")
        canonical = [option.canonical_value.strip().lower() for option in options]
        if len(set(canonical)) != 4:
            raise ValueError("option canonical values must be non-duplicate")
        distractors = [option for option in options if not option.is_correct]
        if len(distractors) != 3:
            raise ValueError("exactly three evaluated distractor options are required")
        archetypes = [option.trap_path.archetype_code for option in distractors if option.trap_path]
        if len(set(archetypes)) != 3:
            raise ValueError("each distractor must use a distinct misconception archetype")
        try:
            # String comparison catches direct duplicates; the bounded SymPy guard catches
            # algebraically equivalent distractors such as 3/2*m*w^2*r^2 and 1.5*m*w^2*r^2.
            assert_no_equivalent_canonical_values([option.canonical_value for option in options])
        except CanonicalExpressionError as exc:
            raise ValueError(str(exc)) from exc
        return options

    @model_validator(mode="after")
    def beta_matches_time_budget(self):
        expected_seconds = exp(self.psychometrics.beta_i)
        ratio = self.psychometrics.recommended_seconds / expected_seconds
        if not 0.55 <= ratio <= 1.55:
            raise ValueError("recommended_seconds must remain consistent with exp(beta_i)")
        return self

class UploadReceipt(BaseModel):
    source_id: str
    original_name: str
    sha256: str
    accepted_mime_type: str
    next_step: str

class ResponseTimeInput(BaseModel):
    """One completed item for ln(T_i) ~ N(β_i − τ, 1/α_i²)."""
    beta_i: float = Field(ge=3.5, le=7.5)
    alpha_i: float = Field(gt=0.0, le=3.0)
    response_seconds: float = Field(gt=0.0, le=7200.0)

class VanDerLindenRequest(BaseModel):
    observations: list[ResponseTimeInput] = Field(min_length=1, max_length=300)

class VanDerLindenResponse(BaseModel):
    tau: float
    standard_error: float
    log_likelihood: float
    observations: int
    model: Literal["ln(T_i) ~ Normal(beta_i - tau, 1 / alpha_i^2)"]

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "targetjee-api"}

@app.post("/v1/analytics/van-der-linden", response_model=VanDerLindenResponse)
def fit_response_time_model(payload: VanDerLindenRequest) -> VanDerLindenResponse:
    """Fit server-authoritative candidate speed using the hierarchical log-time model."""
    fit = fit_van_der_linden_speed(
        ResponseTimeObservation(
            beta_i=observation.beta_i,
            alpha_i=observation.alpha_i,
            response_seconds=observation.response_seconds,
        )
        for observation in payload.observations
    )
    return VanDerLindenResponse(
        tau=fit.tau,
        standard_error=fit.standard_error,
        log_likelihood=fit.log_likelihood,
        observations=fit.observations,
        model="ln(T_i) ~ Normal(beta_i - tau, 1 / alpha_i^2)",
    )


@app.post("/v1/sources", response_model=UploadReceipt, status_code=202)
async def upload_source(file: UploadFile = File(...)) -> UploadReceipt:
    allowed = {"image/png", "image/jpeg", "application/pdf"}
    if file.content_type not in allowed:
        raise HTTPException(415, "Only PNG, JPEG, and PDF sources are accepted")
    content = await file.read()
    if not content or len(content) > 20 * 1024 * 1024:
        raise HTTPException(413, "Source must be between 1 byte and 20 MB")
    # Production: stream encrypted object storage, virus scan, then enqueue source_id.
    digest = sha256(content).hexdigest()
    return UploadReceipt(
        source_id=str(uuid4()), original_name=Path(file.filename or "source").name,
        sha256=digest, accepted_mime_type=file.content_type,
        next_step="Queued for OCR, formula normalization, diagram anchoring, and JSON-only item generation.",
    )

@app.post("/v1/extractions", response_model=ExtractionResult)
async def extract_uploaded_source(
    request: Request,
    file: UploadFile = File(...),
    text_hint: str | None = Form(default=None),
    byok_provider: Annotated[str | None, Header(alias="X-TargetJee-Vision-Provider")] = None,
    byok_api_key: Annotated[str | None, Header(alias="X-TargetJee-Api-Key")] = None,
    byok_model: Annotated[str | None, Header(alias="X-TargetJee-Vision-Model")] = None,
) -> ExtractionResult:
    """Extract evidence with configured server credentials or a request-scoped Gemini BYOK key."""
    if not EXTRACTION_RATE_LIMITER.allow(request_client_key(request)):
        raise HTTPException(429, "Extraction rate limit reached. Please wait before submitting another source.", headers={"Retry-After": "60"})
    allowed = {"image/png", "image/jpeg", "application/pdf"}
    if file.content_type not in allowed:
        raise HTTPException(415, "Only PNG, JPEG, and PDF sources are accepted")
    content = await file.read()
    if not content or len(content) > 20 * 1024 * 1024:
        raise HTTPException(413, "Source must be between 1 byte and 20 MB")
    key = (byok_api_key or "").strip()
    provider = (byok_provider or "").strip().lower() or None
    model = (byok_model or "").strip() or None
    if key and (len(key) > 2048 or any(char.isspace() for char in key)):
        raise HTTPException(400, "Malformed BYOK API key header")
    if provider not in {None, "gemini"}:
        raise HTTPException(400, "Unsupported BYOK provider")
    if model and not re.fullmatch(r"[A-Za-z0-9._-]{3,120}", model):
        raise HTTPException(400, "Malformed BYOK model header")
    try:
        return await extract_source(
            file.filename or "source", file.content_type, content, text_hint,
            byok_provider=provider, byok_api_key=key or None, byok_model=model,
        )
    except ExtractionUnavailable as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, f"Extraction JSON failed contract validation: {exc}") from exc


@app.post("/v1/items/validate", response_model=GeneratedItem)
def validate_generated_item(item: GeneratedItem) -> GeneratedItem:
    """Use this endpoint after the LLM response and before persistence or delivery."""
    return item
