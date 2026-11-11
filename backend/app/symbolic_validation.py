"""Safe, bounded symbolic checks for generated mathematical option values.

This is a publication guard, not a general-purpose computer algebra endpoint. It accepts
only a compact normalized canonical expression grammar, runs in the worker/container
boundary, and returns `None` when an expression intentionally cannot be parsed (for
example, chemistry state labels). Unparseable values still receive human review; they are
never silently declared equivalent.
"""
from __future__ import annotations

import re
from itertools import combinations
from typing import Iterable

from sympy import E, I, pi, cos, exp, log, simplify, sin, sqrt, sympify, tan
from sympy.core.expr import Expr
from sympy.core.symbol import Symbol

_ALLOWED_EXPRESSION = re.compile(r"^[0-9A-Za-z_+\-*/^().,\s]+$")
_IDENTIFIER = re.compile(r"\b[A-Za-z][A-Za-z0-9_]*\b")
_ALLOWED_FUNCTIONS = {"sin": sin, "cos": cos, "tan": tan, "sqrt": sqrt, "log": log, "exp": exp}
_ALLOWED_CONSTANTS = {"pi": pi, "E": E, "I": I}


class CanonicalExpressionError(ValueError):
    """Raised when a canonical field is syntactically unsafe, not merely non-symbolic."""


def parse_canonical_expression(value: str) -> Expr | None:
    """Parse a safe normalized expression or return None when it is outside the CAS grammar."""
    candidate = value.strip()
    if not candidate:
        raise CanonicalExpressionError("canonical value cannot be empty")
    if len(candidate) > 500 or "__" in candidate or not _ALLOWED_EXPRESSION.fullmatch(candidate):
        raise CanonicalExpressionError("canonical value contains unsupported symbolic syntax")

    # Dots are allowed only inside numeric decimals, preventing attribute-style syntax.
    without_decimals = re.sub(r"\d+\.\d*|\.\d+", "", candidate)
    if "." in without_decimals:
        raise CanonicalExpressionError("only decimal-point notation may use a dot")

    normalized = candidate.replace("^", "**")
    identifiers = set(_IDENTIFIER.findall(normalized))
    locals_dict: dict[str, object] = {**_ALLOWED_FUNCTIONS, **_ALLOWED_CONSTANTS}
    for identifier in identifiers:
        if identifier not in locals_dict:
            locals_dict[identifier] = Symbol(identifier, real=True)
    try:
        return sympify(normalized, locals=locals_dict, evaluate=True)
    except (SyntaxError, TypeError, ValueError):
        # A value such as `N2O4(aq)` is valid canonical domain text but not a mathematical
        # expression. It proceeds to reviewer validation rather than a false CAS verdict.
        return None


def mathematically_equivalent(left: str, right: str) -> bool | None:
    """True/False for parseable values; None when either value is intentionally non-symbolic."""
    left_expression = parse_canonical_expression(left)
    right_expression = parse_canonical_expression(right)
    if left_expression is None or right_expression is None:
        return None
    return bool(simplify(left_expression - right_expression) == 0)


def assert_no_equivalent_canonical_values(values: Iterable[str]) -> None:
    """Reject options that differ in text but collapse to the same exact symbolic value."""
    materialized = list(values)
    for left_index, right_index in combinations(range(len(materialized)), 2):
        if mathematically_equivalent(materialized[left_index], materialized[right_index]) is True:
            raise CanonicalExpressionError(
                f"canonical option values at indexes {left_index} and {right_index} are mathematically equivalent"
            )
