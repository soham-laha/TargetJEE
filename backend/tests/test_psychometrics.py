from math import exp, sqrt

import pytest

from app.psychometrics import ResponseTimeObservation, fit_van_der_linden_speed, response_time_log_density
from app.symbolic_validation import CanonicalExpressionError, assert_no_equivalent_canonical_values, mathematically_equivalent, parse_canonical_expression


def test_precision_weighted_van_der_linden_mle_recovers_known_tau() -> None:
    tau = 0.37
    observations = [
        ResponseTimeObservation(beta_i=5.27, alpha_i=1.25, response_seconds=exp(5.27 - tau)),
        ResponseTimeObservation(beta_i=4.91, alpha_i=1.42, response_seconds=exp(4.91 - tau)),
    ]
    fit = fit_van_der_linden_speed(observations)

    assert fit.tau == pytest.approx(tau)
    assert fit.standard_error == pytest.approx(sqrt(1 / (1.25**2 + 1.42**2)))
    assert fit.observations == 2


def test_normal_log_density_is_maximal_at_beta_minus_tau() -> None:
    observation = ResponseTimeObservation(beta_i=5.27, alpha_i=1.25, response_seconds=exp(5.27 - 0.2))
    at_mean = response_time_log_density(observation, 0.2)
    off_mean = response_time_log_density(
        ResponseTimeObservation(beta_i=5.27, alpha_i=1.25, response_seconds=observation.response_seconds * 2), 0.2
    )
    assert at_mean > off_mean


def test_symbolic_guard_rejects_equivalent_option_values() -> None:
    assert mathematically_equivalent("3/2*m*w^2*r^2", "1.5*m*w^2*r^2") is True
    with pytest.raises(CanonicalExpressionError):
        assert_no_equivalent_canonical_values(["0", "3/2*m*w^2*r^2", "1.5*m*w^2*r^2", "3*m*w^2*r^2"])


def test_symbolic_guard_does_not_execute_unsafe_syntax() -> None:
    with pytest.raises(CanonicalExpressionError):
        parse_canonical_expression("__import__('os').system('whoami')")
