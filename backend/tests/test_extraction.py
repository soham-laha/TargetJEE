from app.extraction import normalize_text_evidence


def test_text_normalizer_automatically_tags_equilibrium_problem() -> None:
    result = normalize_text_evidence("For N2O4(g) ⇌ 2NO2(g), find the reaction quotient after compression.")
    assert result.classification.subject == "Chemistry"
    assert result.classification.chapter == "Chemical Equilibrium"
    assert result.classification.target_level == "JEE Main"


def test_text_normalizer_automatically_tags_integral_problem() -> None:
    result = normalize_text_evidence("Evaluate the integral of sin x from zero to pi using symmetry.")
    assert result.classification.subject == "Mathematics"
    assert result.classification.chapter == "Integral Calculus"
    assert result.classification.target_level == "JEE Advanced"


def test_gemini_byok_defaults_to_flash_latest(monkeypatch) -> None:
    import asyncio
    from app import extraction

    observed: dict[str, str] = {}

    def fake_gemini_request(file_name: str, mime_type: str, content: bytes, api_key: str, model: str) -> dict:
        observed["api_key"] = api_key
        observed["model"] = model
        return {
            "raw_text": "Evaluate a definite integral with the supplied bounds.",
            "normalized_latex": "\\text{Evaluate the supplied definite integral.}",
            "math_blocks": [],
            "classification": {
                "subject": "Mathematics",
                "chapter": "Integral Calculus",
                "topic": "Definite integrals and symmetry",
                "target_level": "JEE Advanced",
                "confidence": 0.9,
                "evidence": "Integral notation and explicit bounds are visible in the source.",
            },
            "coordinate_diagram": {"description": "No coordinate diagram detected", "x_label": "x", "y_label": "y", "points": [], "primitives": []},
            "tags": ["Mathematics", "Integral Calculus"],
            "extraction_confidence": 0.9,
            "ambiguities": [],
            "source": "vision",
        }

    monkeypatch.setattr(extraction, "_request_gemini_byok", fake_gemini_request)
    result = asyncio.run(extraction.extract_source("source.png", "image/png", b"source", byok_provider="gemini", byok_api_key="AIzaByokTest"))
    assert result.source == "vision"
    assert observed == {"api_key": "AIzaByokTest", "model": "gemini-flash-latest"}
