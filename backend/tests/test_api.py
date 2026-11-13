import pytest
from fastapi.testclient import TestClient

from app.main import app


def test_van_der_linden_endpoint_returns_fitted_speed() -> None:
    client = TestClient(app)
    response = client.post(
        "/v1/analytics/van-der-linden",
        json={
            "observations": [
                {"beta_i": 5.27, "alpha_i": 1.25, "response_seconds": 195},
                {"beta_i": 4.91, "alpha_i": 1.42, "response_seconds": 135},
            ]
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["observations"] == 2
    assert payload["model"] == "ln(T_i) ~ Normal(beta_i - tau, 1 / alpha_i^2)"
    assert isinstance(payload["tau"], float)


def test_timing_endpoint_rejects_invalid_alpha() -> None:
    client = TestClient(app)
    response = client.post(
        "/v1/analytics/van-der-linden",
        json={"observations": [{"beta_i": 5.27, "alpha_i": 0, "response_seconds": 195}]},
    )
    assert response.status_code == 422


def test_item_validator_rejects_symbolically_equivalent_distractors() -> None:
    client = TestClient(app)

    def trap(code: str, value: str) -> dict:
        return {
            "archetype_code": code,
            "label": "Computed misconception path",
            "severity": "CONCEPTUAL",
            "executable_steps": ["apply a supported mistaken transformation", "evaluate the resulting exact value"],
            "evaluated_latex": value,
            "evaluated_canonical_value": value,
            "diagnosis": "The selection indicates a specific error in the energy ledger.",
            "first_wrong_pivot": "The learner mixes a pseudo-force ledger with the inertial-frame energy change.",
            "why_plausible": "Both energy terms look familiar when the rotating frame is introduced.",
            "valid_when": "The terms represent distinct transfers in one consistent frame.",
            "avoidance_rule": "Write the sign convention before substituting values.",
            "nrm": {"a": -0.2, "c": 0.1},
        }

    payload = {
        "schema_version": "targetjee.item.v1",
        "subject": "Physics",
        "chapter": "Rotational Motion",
        "topic": "Rotating frame work",
        "target_level": "JEE Advanced",
        "source_problem_normalized": "A verified rotating-frame source problem with sufficient conditions.",
        "stem_latex": "\\text{Find the work done by the agent.}",
        "assumptions": [],
        "correct_derivation": ["Write the inertial kinetic energy.", "Evaluate the endpoint change."],
        "competitive_shortcut": ["Use the radius-squared kinetic-energy scaling."],
        "avoidance_rule": "Keep one consistent frame ledger.",
        "recovery_check": {
            "prompt": "Before adding work terms, what must remain consistent?",
            "choices": ["The reference frame", "The font size", "The option order"],
            "answer_index": 0,
            "explanation": "Use one consistent reference-frame ledger before combining energy terms."
        },
        "options": [
            {"key": "A", "latex": "0", "canonical_value": "0", "is_correct": True, "trap_path": None},
            {"key": "B", "latex": "3m\\omega^2r^2/2", "canonical_value": "3/2*m*w^2*r^2", "is_correct": False, "trap_path": trap("ENDPOINT_SUBSTITUTION", "3/2*m*w^2*r^2")},
            {"key": "C", "latex": "1.5m\\omega^2r^2", "canonical_value": "1.5*m*w^2*r^2", "is_correct": False, "trap_path": trap("DOUBLE_COUNTED_PSEUDO_FORCE", "1.5*m*w^2*r^2")},
            {"key": "D", "latex": "3m\\omega^2r^2", "canonical_value": "3*m*w^2*r^2", "is_correct": False, "trap_path": trap("FRAME_MIXING", "3*m*w^2*r^2")},
        ],
        "psychometrics": {"a_i": 1.4, "b_i": 0.65, "c_i": 0.1, "beta_i": 5.3, "alpha_i": 1.25, "recommended_seconds": 200},
        "reviewer_flags": [],
    }
    response = client.post("/v1/items/validate", json=payload)
    assert response.status_code == 422
    assert "mathematically equivalent" in response.text


def test_item_validator_rejects_a_trap_with_mismatched_evaluated_value() -> None:
    client = TestClient(app)
    base_trap = {
        "archetype_code": "ENDPOINT_SUBSTITUTION",
        "label": "Computed misconception path",
        "severity": "PROCEDURAL",
        "executable_steps": ["substitute the endpoint force", "evaluate the wrong result"],
        "evaluated_latex": "m",
        "evaluated_canonical_value": "999",
        "diagnosis": "The selection indicates endpoint substitution for a variable force.",
        "first_wrong_pivot": "The force was frozen at one endpoint instead of tracked across displacement.",
        "why_plausible": "The starting radius is given explicitly and looks ready to substitute.",
        "valid_when": "The applied force remains constant throughout the displacement.",
        "avoidance_rule": "Integrate position-dependent force over the full displacement.",
        "nrm": {"a": -0.2, "c": 0.1},
    }
    option = {
        "key": "B", "latex": "m", "canonical_value": "1", "is_correct": False,
        "trap_path": base_trap,
    }
    # The Option-level contract rejects before any item can be persisted.
    from app.main import Option
    with pytest.raises(ValueError, match="evaluated output"):
        Option.model_validate(option)


def test_extraction_endpoint_returns_evidence_grounded_curriculum_tags() -> None:
    client = TestClient(app)
    response = client.post(
        "/v1/extractions",
        files={"file": ("equilibrium.png", b"fixture-image", "image/png")},
        data={"text_hint": "For N2O4(g) ⇌ 2NO2(g), find the reaction quotient after compression."},
    )
    assert response.status_code == 200
    classification = response.json()["classification"]
    assert classification["subject"] == "Chemistry"
    assert classification["chapter"] == "Chemical Equilibrium"
    assert classification["target_level"] == "JEE Main"


def test_extraction_endpoint_forwards_gemini_byok_headers_without_persisting_them(monkeypatch: pytest.MonkeyPatch) -> None:
    """The request handler receives BYOK values only for the active extraction call."""
    from app import main
    from app.extraction import normalize_text_evidence

    observed: dict[str, str | None] = {}

    async def fake_extract_source(
        file_name: str,
        mime_type: str,
        content: bytes,
        text_hint: str | None = None,
        byok_provider: str | None = None,
        byok_api_key: str | None = None,
        byok_model: str | None = None,
    ):
        observed.update({"provider": byok_provider, "key": byok_api_key, "model": byok_model})
        return normalize_text_evidence(text_hint or "Evaluate the integral of sin x from zero to pi using symmetry.")

    monkeypatch.setattr(main, "extract_source", fake_extract_source)
    client = TestClient(main.app)
    response = client.post(
        "/v1/extractions",
        files={"file": ("source.png", b"fixture-image", "image/png")},
        data={"text_hint": "Evaluate the integral of sin x from zero to pi using symmetry."},
        headers={
            "X-TargetJee-Vision-Provider": "gemini",
            "X-TargetJee-Api-Key": "AIzaExampleBrowserOnlyKey",
            "X-TargetJee-Vision-Model": "gemini-flash-latest",
        },
    )
    assert response.status_code == 200
    assert observed == {"provider": "gemini", "key": "AIzaExampleBrowserOnlyKey", "model": "gemini-flash-latest"}


def test_byok_cors_preflight_allows_explicit_gemini_headers() -> None:
    client = TestClient(app)
    response = client.options(
        "/v1/extractions",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "x-targetjee-api-key,x-targetjee-vision-model,x-targetjee-vision-provider",
        },
    )
    assert response.status_code == 200
    allowed = response.headers["access-control-allow-headers"].lower()
    assert "x-targetjee-api-key" in allowed
