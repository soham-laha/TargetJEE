import type { Question } from "./types";

export const DEMO_QUESTIONS: Question[] = [
  {
    id: "phy-rot-001",
    serial: 1,
    subject: "Physics",
    chapter: "Rotational Motion",
    topic: "Work-energy in a rotating frame",
    level: "JEE Advanced",
    context: "Select the most appropriate answer.",
    stem: "A small block of mass \(m\) is held at rest at radius \(r\) on a smooth horizontal turntable rotating with constant angular speed \(\omega\). It is moved slowly outward to radius \(2r\) by an agent, remaining at rest relative to the turntable. The work done by the agent in the inertial frame is",
    options: [
      {
        id: "A",
        latex: "0",
        plain: "0",
        isCorrect: false,
        trap: {
          id: "force-perpendicular",
          label: "Trap A · Hasty frame transfer",
          archetype: "Tangential-force-only heuristic",
          description:
            "You treated the motion as if the only relevant force were a perpendicular constraint force and discarded the change in kinetic energy.",
          firstWrongPivot:
            "You declared the work zero before checking how the inertial-frame speed changes from r to 2r.",
          whyPlausible:
            "A normal or constraint force is often perpendicular to motion, so zero work is a familiar first instinct.",
          validWhen:
            "the speed is unchanged and every force that acts along the displacement does zero work.",
          avoidanceRule:
            "In an inertial frame, write ΔK before declaring work zero for radial motion on a rotating surface.",
          nrm: { a: -0.62, c: 0.28 },
        },
      },
      {
        id: "B",
        latex: "\\frac{1}{2}m\\omega^2r^2",
        plain: "½mω²r²",
        isCorrect: false,
        trap: {
          id: "centrifugal-once",
          label: "Trap B · Missing radial extent",
          archetype: "Endpoint force substitution",
          description:
            "You used the centrifugal force at r as a constant instead of integrating mω²x from r to 2r.",
          firstWrongPivot:
            "You froze a position-dependent force at the starting radius instead of tracking it over the radial displacement.",
          whyPlausible:
            "Substituting the stated radius into F = mω²r looks like a direct route when the endpoint is visible.",
          validWhen:
            "the radial force is genuinely constant over the entire displacement, not proportional to x.",
          avoidanceRule:
            "When a force depends on position, integrate F(x)dx across the actual endpoints.",
          nrm: { a: -0.22, c: 0.17 },
        },
      },
      {
        id: "C",
        latex: "\\frac{3}{2}m\\omega^2r^2",
        plain: "3⁄2mω²r²",
        isCorrect: true,
      },
      {
        id: "D",
        latex: "3m\\omega^2r^2",
        plain: "3mω²r²",
        isCorrect: false,
        trap: {
          id: "double-centrifugal",
          label: "Trap D · Double-counted pseudo work",
          archetype: "Non-inertial force duplication",
          description:
            "You accounted for the centrifugal pseudo-force and also added the inertial-frame kinetic-energy change, counting the same energy transfer twice.",
          firstWrongPivot:
            "You mixed a rotating-frame pseudo-force ledger with the inertial-frame kinetic-energy change in the same calculation.",
          whyPlausible:
            "Both the centrifugal term and ΔK appear in familiar work-energy derivations, so adding them can feel safer than choosing one frame.",
          validWhen:
            "the two terms represent distinct physical transfers in one consistently defined frame; they do not here.",
          avoidanceRule:
            "Choose one frame and keep only that frame’s force–energy bookkeeping; never mix both ledgers.",
          nrm: { a: 0.18, c: -0.12 },
        },
      },
    ],
    correctOptionId: "C",
    psychometric: { a: 1.72, b: 1.05, c: 0.08, beta: 5.27, alpha: 1.25 },
    derivation: [
      "The block has inertial speed v = ωx at radius x.",
      "Thus K(x) = ½mω²x², even though it is stationary relative to the turntable.",
      "The normal force is vertical; the agent supplies the radial work. Therefore Wagent = ΔK.",
      "Wagent = ½mω²[(2r)² − r²] = 3⁄2 mω²r².",
    ],
    shortcut: [
      "At fixed angular speed, v is proportional to radius.",
      "Moving r → 2r makes kinetic energy four times larger; the increase is 3Kinitial.",
      "So ΔK = 3 × ½mω²r².",
    ],
    avoidanceRule:
      "Use exactly one reference frame’s energy ledger; in the inertial frame, radial displacement changes v = ωr.",
    recoveryCheck: {
      prompt:
        "Before declaring the agent’s work zero, what must you check in the inertial frame?",
      choices: [
        "Whether the speed changes with radius",
        "Whether the turntable is smooth",
        "Whether the block starts at rest relative to the table",
        "Whether the normal force is vertical",
      ],
      answerIndex: 0,
      explanation:
        "The inertial speed is v = ωr, so moving outward changes kinetic energy and requires a work check.",
    },
  },
  {
    id: "chem-eq-014",
    serial: 2,
    subject: "Chemistry",
    chapter: "Chemical Equilibrium",
    topic: "Reaction quotient and Le Châtelier",
    level: "JEE Main",
    context: "Assume ideal-gas behavior and constant temperature.",
    stem: "For the equilibrium \(N_2O_4(g) \rightleftharpoons 2NO_2(g)\), a vessel initially at equilibrium is compressed suddenly to half its volume at constant temperature. Immediately after compression, the reaction quotient \(Q_c\) is",
    options: [
      {
        id: "A",
        latex: "Q_c",
        plain: "unchanged",
        isCorrect: false,
        trap: {
          id: "equilibrium-invariance",
          label: "Trap A · Equilibrium inertia",
          archetype: "K versus Q confusion",
          description:
            "You preserved Q just because K remains constant; Q is computed from the instantaneous concentrations.",
          firstWrongPivot:
            "You treated Q as an equilibrium constant instead of recalculating it from the concentrations immediately after compression.",
          whyPlausible:
            "The vessel begins at equilibrium, and K does stay fixed at constant temperature, so the two symbols can blur together.",
          validWhen:
            "no concentration disturbance has occurred, or the concentration factors cancel exactly in Q.",
          avoidanceRule:
            "K changes only with temperature; Q must be recalculated after every concentration disturbance.",
          nrm: { a: -0.42, c: 0.18 },
        },
      },
      {
        id: "B",
        latex: "2Q_c",
        plain: "2Qc",
        isCorrect: true,
      },
      {
        id: "C",
        latex: "4Q_c",
        plain: "4Qc",
        isCorrect: false,
        trap: {
          id: "inverse-stoich",
          label: "Trap C · Exponent-only scaling",
          archetype: "Incomplete quotient scaling",
          description:
            "You squared the concentration multiplier in the numerator but missed that the N₂O₄ denominator also doubles.",
          firstWrongPivot:
            "You applied the compression factor to NO₂ but did not carry the same factor through the N₂O₄ denominator.",
          whyPlausible:
            "The squared product term is visually dominant, making 4Qc feel like the obvious scaling result.",
          validWhen:
            "the denominator concentration remains unchanged while the numerator species alone doubles.",
          avoidanceRule:
            "Apply the concentration factor to every species first, then combine numerator and denominator exponents.",
          nrm: { a: -0.04, c: 0.05 },
        },
      },
      {
        id: "D",
        latex: "\\frac{Q_c}{4}",
        plain: "Qc/4",
        isCorrect: false,
        trap: {
          id: "product-reactant-swap",
          label: "Trap D · Quotient inversion",
          archetype: "Products/reactants swapped",
          description:
            "You calculated [N₂O₄]/[NO₂]² rather than the defined reaction quotient.",
          firstWrongPivot:
            "You wrote the quotient in the reverse-reaction direction before applying the volume change.",
          whyPlausible:
            "Compression makes the reactant side visually salient, which can prompt an intuitive but reversed ratio.",
          validWhen:
            "the reaction is explicitly written in the reverse direction and its quotient is being defined for that reversed equation.",
          avoidanceRule:
            "Write Q in the forward-reaction direction before inserting any numerical change.",
          nrm: { a: 0.28, c: -0.11 },
        },
      },
    ],
    correctOptionId: "B",
    psychometric: { a: 1.32, b: -0.25, c: 0.14, beta: 4.91, alpha: 1.42 },
    derivation: [
      "Qc = [NO₂]²/[N₂O₄].",
      "Halving volume doubles each concentration instantaneously.",
      "The numerator becomes (2[NO₂])² = 4[NO₂]² while the denominator becomes 2[N₂O₄].",
      "So Q′c = (4/2)Qc = 2Qc — wait: verify with moles. For equal volume compression both concentrations double, hence Δν = 1 and Q′ = 2Qc.",
    ],
    shortcut: [
      "For uniform compression by factor two, Q scales as 2^Δν.",
      "Here Δν = 2 − 1 = 1, so Q′ = 2Qc.",
    ],
    avoidanceRule:
      "Use Q′/Q = f^Δν after a uniform volume change, where f is the concentration multiplier.",
    recoveryCheck: {
      prompt:
        "When volume halves at constant temperature, what happens to each gas concentration immediately?",
      choices: [
        "Each concentration doubles",
        "Only product concentration doubles",
        "Each concentration halves",
        "Q remains fixed because K is fixed",
      ],
      answerIndex: 0,
      explanation:
        "The mole amounts are unchanged at the instant of compression while volume halves, so every concentration doubles.",
    },
  },
  {
    id: "math-calc-019",
    serial: 3,
    subject: "Mathematics",
    chapter: "Integral Calculus",
    topic: "Definite integral symmetry",
    level: "JEE Advanced",
    context: "All angles are in radians.",
    stem: "The value of \\displaystyle \\int_{0}^{\\pi} \\frac{x\\sin x}{1+\\cos^2 x}\\,dx is",
    options: [
      {
        id: "A",
        latex: "0",
        plain: "0",
        isCorrect: false,
        trap: {
          id: "odd-over-symmetric",
          label: "Trap A · False odd symmetry",
          archetype: "Interval-centering error",
          description:
            "You called the integrand odd on [0, π] without first mapping x to π − x.",
          firstWrongPivot:
            "You applied an odd-function rule about zero to an interval that is not centred at zero.",
          whyPlausible:
            "The sine factor changes sign in many familiar symmetry problems, making a zero answer feel like a quick pattern match.",
          validWhen:
            "the interval is symmetric about zero and the complete integrand is odd under x → −x.",
          avoidanceRule:
            "For [0,a], use f(x)+f(a−x); odd/even labels only apply about zero.",
          nrm: { a: -0.54, c: 0.23 },
        },
      },
      {
        id: "B",
        latex: "\\frac{\\pi^2}{4}",
        plain: "π²/4",
        isCorrect: true,
      },
      {
        id: "C",
        latex: "\\frac{\\pi^2}{8}",
        plain: "π²/8",
        isCorrect: false,
        trap: {
          id: "missing-pair-factor",
          label: "Trap C · Lost symmetry factor",
          archetype: "Pairing normalization error",
          description:
            "You paired x with π−x correctly but did not divide the summed identity 2I by two.",
          firstWrongPivot:
            "You stopped after forming the paired equation 2I instead of isolating I.",
          whyPlausible:
            "The reflected-integral step is the hard insight, so it is easy to carry its factor of two into the final result.",
          validWhen:
            "the reflected relation produces I directly rather than the summed identity 2I.",
          avoidanceRule:
            "After adding a reflected integral, explicitly solve the new equation for I before evaluating constants.",
          nrm: { a: -0.08, c: 0.03 },
        },
      },
      {
        id: "D",
        latex: "\\frac{\\pi}{2}\\ln 2",
        plain: "(π/2) ln 2",
        isCorrect: false,
        trap: {
          id: "missing-x-pair",
          label: "Trap D · Unpaired logarithmic integral",
          archetype: "Integration-by-parts overreach",
          description:
            "You integrated sin x/(1+cos²x) as though the leading x had already been eliminated.",
          firstWrongPivot:
            "You chose a substitution before removing or accounting for the leading x factor.",
          whyPlausible:
            "The derivative of cos x is visible in the numerator, so the logarithmic or arctan pattern looks immediately available.",
          validWhen:
            "the leading x is absent, or symmetry/integration by parts has first converted the integral into that simpler form.",
          avoidanceRule:
            "Before substitution, check whether the differential contains the derivative of the exact inner expression.",
          nrm: { a: 0.21, c: -0.14 },
        },
      },
    ],
    correctOptionId: "B",
    psychometric: { a: 1.95, b: 1.35, c: 0.06, beta: 5.48, alpha: 1.12 },
    derivation: [
      "Let I = ∫₀π x sin x/(1+cos²x) dx.",
      "Under x → π−x, the non-x factor is unchanged, so I = ∫₀π (π−x)sin x/(1+cos²x) dx.",
      "Adding: 2I = π ∫₀π sin x/(1+cos²x) dx.",
      "With u = cos x, the integral equals ∫₋₁¹ du/(1+u²) = π/2; hence I = π²/4.",
    ],
    shortcut: [
      "When f(x) = f(π−x), ∫₀π xf(x)dx = (π/2)∫₀π f(x)dx.",
      "The remaining integral is the standard arctan form, π/2.",
      "Therefore I = π/2 × π/2 = π²/4.",
    ],
    avoidanceRule:
      "On [0,a], pair x with a−x before attempting integration by parts.",
    recoveryCheck: {
      prompt:
        "For an integral on [0, π], which pairing tests the relevant symmetry?",
      choices: ["x with π − x", "x with −x", "x with 2π − x", "x with 1/x"],
      answerIndex: 0,
      explanation:
        "The interval is centred at π/2, so the useful reflection is x → π − x, not x → −x.",
    },
  },
];
