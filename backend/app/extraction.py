"""Vision extraction contract for raw JEE sources.

The module accepts a configured OpenAI-compatible server provider and an explicit
Google Gemini BYOK path. BYOK credentials arrive only for an individual extraction,
are never persisted, and callers always receive the same Pydantic evidence shape.
"""
from __future__ import annotations

import asyncio
import base64
import json
import os
import re
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CoordinatePoint(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: str = Field(min_length=1, max_length=40)
    # Normalized canvas coordinates: x [0,100], y [0,100]. They are evidence
    # anchors, not an assertion that the original drawing is to scale.
    x: float = Field(ge=0, le=100)
    y: float = Field(ge=0, le=100)


class CoordinateDiagram(BaseModel):
    model_config = ConfigDict(extra="forbid")
    description: str = Field(min_length=10, max_length=1000)
    x_label: str = Field(min_length=1, max_length=80)
    y_label: str = Field(min_length=1, max_length=80)
    points: list[CoordinatePoint] = Field(default_factory=list, max_length=40)
    primitives: list[Literal["axis", "line", "ray", "vector", "arc", "circle", "curve", "label"]] = Field(default_factory=list, max_length=100)


class ProblemClassification(BaseModel):
    """Automatic curriculum tag inferred from source evidence before item generation."""
    model_config = ConfigDict(extra="forbid")
    subject: Literal["Physics", "Chemistry", "Mathematics"]
    chapter: str = Field(min_length=2, max_length=100)
    topic: str = Field(min_length=2, max_length=140)
    target_level: Literal["JEE Main", "JEE Advanced"]
    confidence: float = Field(ge=0, le=1)
    evidence: str = Field(min_length=8, max_length=500)


class ExtractionResult(BaseModel):
    """A reviewable extraction record, before question generation begins."""
    model_config = ConfigDict(extra="forbid")
    raw_text: str = Field(min_length=1, max_length=20000)
    normalized_latex: str = Field(min_length=1, max_length=24000)
    math_blocks: list[str] = Field(default_factory=list, max_length=80)
    classification: ProblemClassification
    coordinate_diagram: CoordinateDiagram
    tags: list[str] = Field(default_factory=list, max_length=12)
    extraction_confidence: float = Field(ge=0, le=1)
    ambiguities: list[str] = Field(default_factory=list, max_length=20)
    source: Literal["vision", "text_normalizer"]

    @field_validator("math_blocks")
    @classmethod
    def blocks_must_be_katex_safe(cls, blocks: list[str]) -> list[str]:
        if any("$" in block for block in blocks):
            raise ValueError("math_blocks must be raw KaTeX expressions without dollar delimiters")
        return blocks


class ExtractionUnavailable(RuntimeError):
    pass


EXTRACTION_SYSTEM_PROMPT = r"""
You are TARGETJEE_VISION_EXTRACTOR. Extract evidence from a single uploaded JEE problem.
Return ONLY one JSON object matching the requested schema; do not solve the problem.

Rules:
- raw_text: exact readable prose in natural Unicode, preserving conditions and units.
- normalized_latex: the complete learner-facing statement in KaTeX-compatible LaTeX.
  Use \text{} for prose, never dollar delimiters. Preserve fractions, roots, vectors,
  integrals, limits, subscripts, superscripts, Greek symbols, degree/radian markers,
  units and sign conventions.
- math_blocks: each separately recognized mathematical expression in raw KaTeX syntax.
- coordinate_diagram: describe only visible coordinates/labels/primitives. Convert point
  locations into 0..100 normalized canvas anchors. If no coordinate diagram exists,
  set description to "No coordinate diagram detected", labels to "x" and "y", and
  points/primitives to empty arrays. Never invent points or geometry.
- classification: automatically tag exactly one subject (Physics, Chemistry, or Mathematics),
  a standard JEE chapter, a precise topic, and JEE Main or JEE Advanced target level. Give
  confidence in [0,1] and a short evidence statement grounded in the source. Never use an
  unsupported chapter or level merely because it is common.
- tags: additional short topic labels only when supported by evidence.
- ambiguities: include every illegible exponent, cropped label, uncertain diagram mark,
  or unreadable condition. Lower extraction_confidence when ambiguity exists.
- source must be "vision".
""".strip()

# Enough replacements to clean known OCR/text evidence paths. Image/PDF extraction itself
# should go through the configured vision provider rather than pretending to OCR locally.
UNICODE_MATH = {
    "π": r"\pi", "ω": r"\omega", "Ω": r"\Omega", "Δ": r"\Delta", "δ": r"\delta",
    "θ": r"\theta", "λ": r"\lambda", "μ": r"\mu", "×": r"\times", "÷": r"\div",
    "≤": r"\le", "≥": r"\ge", "≠": r"\ne", "√": r"\sqrt{}", "→": r"\to",
    "⇌": r"\rightleftharpoons", "∞": r"\infty",
}


def normalize_text_evidence(source_text: str) -> ExtractionResult:
    """Useful for test fixtures or manually pasted OCR; it is not image OCR."""
    raw = re.sub(r"\s+", " ", source_text).strip()
    latex = raw
    # Whitespace on both sides prevents OCR strings such as Δx becoming the invalid
    # control word `\\Deltax` after conversion.
    for unicode_symbol, latex_symbol in UNICODE_MATH.items():
        latex = latex.replace(unicode_symbol, f" {latex_symbol} ")
    latex = re.sub(r"\s+", " ", latex).strip()
    # Keep single-letter variables mathematical while rendering multi-letter prose with
    # KaTeX \text{}. This is a safe fallback for pasted OCR—not a substitute for Vision.
    tokenized = re.findall(r"\\[A-Za-z]+|[A-Za-z]+|\d+(?:\.\d+)?|\s+|.", latex)
    rendered: list[str] = []
    for token in tokenized:
        if token.isspace():
            rendered.append(r"\;")
        elif re.fullmatch(r"[A-Za-z]+", token) and len(token) > 1:
            rendered.append(r"\text{" + token + "}")
        elif token in {"%", "#", "&", "_"}:
            rendered.append("\\" + token)
        else:
            rendered.append(token)
    normalized = "".join(rendered)
    # Preserve obvious formulas as math blocks; reviewer still verifies the full rendering.
    math_blocks = re.findall(r"(?:[A-Za-z][A-Za-z0-9_{}^]*\s*=\s*[^.;,]+|\\[a-zA-Z]+(?:\{[^}]*\})?)", latex)
    lower = raw.lower()
    if any(token in lower for token in ("n2o4", "no2", "equilibrium", "stoichiometric", "reaction quotient")):
        classification = ProblemClassification(subject="Chemistry", chapter="Chemical Equilibrium", topic="Reaction quotient and volume change", target_level="JEE Main", confidence=0.70, evidence="Equilibrium-species and reaction-quotient vocabulary detected.")
    elif any(token in lower for token in ("integral", "sin", "cos", "differenti", "limit")):
        classification = ProblemClassification(subject="Mathematics", chapter="Integral Calculus", topic="Definite integrals and symmetry", target_level="JEE Advanced", confidence=0.68, evidence="Calculus notation and trigonometric-integral vocabulary detected.")
    else:
        classification = ProblemClassification(subject="Physics", chapter="Mechanics", topic="Kinematics and dynamics", target_level="JEE Main", confidence=0.45, evidence="No high-confidence chemistry or mathematics vocabulary detected; reviewer confirmation required.")
    return ExtractionResult(
        raw_text=raw,
        normalized_latex=normalized,
        math_blocks=math_blocks[:20],
        classification=classification,
        coordinate_diagram=CoordinateDiagram(description="No coordinate diagram detected", x_label="x", y_label="y"),
        tags=[classification.subject, classification.chapter, classification.target_level], extraction_confidence=0.62, ambiguities=["Text-only normalization: verify formula grouping against the original source."],
        source="text_normalizer",
    )


def _provider_config() -> tuple[str, str, str]:
    base_url = os.getenv("VISION_LLM_BASE_URL", "").strip()
    api_key = os.getenv("VISION_LLM_API_KEY", "").strip()
    model = os.getenv("VISION_LLM_MODEL", "").strip()
    if not all((base_url, api_key, model)):
        raise ExtractionUnavailable("Vision provider is not configured. Set VISION_LLM_BASE_URL, VISION_LLM_API_KEY, and VISION_LLM_MODEL.")
    return base_url.rstrip("/"), api_key, model


def _request_provider(file_name: str, mime_type: str, content: bytes) -> dict:
    base_url, api_key, model = _provider_config()
    encoded = base64.b64encode(content).decode("ascii")
    data_url = f"data:{mime_type};base64,{encoded}"
    # `image_url` is supported by OpenAI-compatible vision chat services. For a provider
    # that accepts PDF as input_file, replace this content part in the adapter only.
    user_content: list[dict[str, object]] = [
        {"type": "text", "text": f"Source filename: {file_name}. Inspect every visible page and return extraction JSON."},
        {"type": "image_url", "image_url": {"url": data_url}},
    ]
    payload = {
        "model": model,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
    }
    request = Request(
        url=f"{base_url}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=75) as response:
            body = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        raise ExtractionUnavailable(f"Vision provider rejected the extraction request ({exc.code}).") from exc
    except URLError as exc:
        raise ExtractionUnavailable("Vision provider could not be reached.") from exc
    try:
        content_text = body["choices"][0]["message"]["content"]
        return json.loads(content_text)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise ExtractionUnavailable("Vision provider did not return a valid structured JSON response.") from exc




def _request_gemini_byok(file_name: str, mime_type: str, content: bytes, api_key: str, model: str) -> dict:
    """Call the Gemini generateContent API using a request-scoped learner key.

    The key never enters persistence or logs; it only exists in this in-memory request until
    urllib completes. Model IDs are restricted by the API layer before reaching this adapter.
    """
    encoded = base64.b64encode(content).decode("ascii")
    payload = {
        "systemInstruction": {"parts": [{"text": EXTRACTION_SYSTEM_PROMPT}]},
        "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
        "contents": [{
            "role": "user",
            "parts": [
                {"text": f"Source filename: {file_name}. Inspect every visible page and return extraction JSON."},
                {"inlineData": {"mimeType": mime_type, "data": encoded}},
            ],
        }],
    }
    request = Request(
        url=f"https://generativelanguage.googleapis.com/v1beta/models/{quote(model, safe='._-')}:generateContent",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )
    try:
        with urlopen(request, timeout=75) as response:
            body = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        raise ExtractionUnavailable(f"Gemini rejected the extraction request ({exc.code}). Check the key, model, and API access.") from exc
    except URLError as exc:
        raise ExtractionUnavailable("Google Gemini could not be reached.") from exc
    try:
        parts = body["candidates"][0]["content"]["parts"]
        content_text = "".join(part["text"] for part in parts if "text" in part)
        return json.loads(content_text)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise ExtractionUnavailable("Gemini did not return a valid structured JSON response.") from exc

async def extract_source(
    file_name: str,
    mime_type: str,
    content: bytes,
    text_hint: str | None = None,
    byok_provider: str | None = None,
    byok_api_key: str | None = None,
    byok_model: str | None = None,
) -> ExtractionResult:
    """Extract source evidence with either a server provider or request-scoped Gemini BYOK."""
    if byok_api_key:
        if byok_provider != "gemini":
            raise ExtractionUnavailable("Unsupported BYOK provider. Select Google Gemini in the TargetJEE key dialog.")
        model = byok_model or "gemini-flash-latest"
        payload = await asyncio.to_thread(_request_gemini_byok, file_name, mime_type, content, byok_api_key, model)
        return ExtractionResult.model_validate(payload)
    if text_hint and text_hint.strip() and not os.getenv("VISION_LLM_BASE_URL"):
        return normalize_text_evidence(text_hint)
    payload = await asyncio.to_thread(_request_provider, file_name, mime_type, content)
    return ExtractionResult.model_validate(payload)
