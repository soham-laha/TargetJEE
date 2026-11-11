"""Server-side psychometric primitives used by the scoring worker.

The browser may render a live estimate, but final scoring should call this same model
inside a server-owned submission workflow.
"""
from __future__ import annotations

from dataclasses import dataclass
from math import log, pi, sqrt
from typing import Iterable


@dataclass(frozen=True)
class ResponseTimeObservation:
    beta_i: float
    alpha_i: float
    response_seconds: float


@dataclass(frozen=True)
class VanDerLindenFit:
    tau: float
    standard_error: float
    log_likelihood: float
    observations: int


def response_time_log_density(observation: ResponseTimeObservation, tau: float) -> float:
    """ln(T_i) ~ N(β_i − τ, 1/α_i²), evaluated as a normal log-density."""
    if observation.alpha_i <= 0:
        raise ValueError("alpha_i must be positive")
    if observation.response_seconds <= 0:
        raise ValueError("response_seconds must be positive")
    variance = 1 / (observation.alpha_i**2)
    mean = observation.beta_i - tau
    residual = log(observation.response_seconds) - mean
    return -0.5 * log(2 * pi * variance) - (residual**2) / (2 * variance)


def fit_van_der_linden_speed(observations: Iterable[ResponseTimeObservation]) -> VanDerLindenFit:
    """Precision-weighted closed-form MLE for the candidate speed parameter τ."""
    usable = list(observations)
    if not usable:
        return VanDerLindenFit(tau=0.0, standard_error=0.0, log_likelihood=0.0, observations=0)

    precision = sum(observation.alpha_i**2 for observation in usable)
    if precision <= 0:
        raise ValueError("sum(alpha_i²) must be positive")
    tau = sum(
        observation.alpha_i**2 * (observation.beta_i - log(observation.response_seconds))
        for observation in usable
    ) / precision
    return VanDerLindenFit(
        tau=tau,
        standard_error=sqrt(1 / precision),
        log_likelihood=sum(response_time_log_density(observation, tau) for observation in usable),
        observations=len(usable),
    )
