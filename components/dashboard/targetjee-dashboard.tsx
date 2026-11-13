"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  BrainCircuit,
  ChevronDown,
  Clock3,
  Gauge,
  GraduationCap,
  Grid2X2,
  HelpCircle,
  LineChart,
  Menu,
  Moon,
  MoreHorizontal,
  Settings2,
  Sun,
  Target,
  UploadCloud,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

type Theme = "light" | "dark";

const scoreBars = [44, 31, 53, 63, 39, 62];
const lightMetrics: Array<{ icon: LucideIcon; value: string; label: string }> =
  [
    { icon: UsersRound, value: "124", label: "QUESTIONS MASTERED" },
    { icon: BrainCircuit, value: "07", label: "CHAPTERS ACTIVE" },
    { icon: UploadCloud, value: "12", label: "MOCKS COMPLETED" },
    { icon: Clock3, value: "3,550", label: "MINUTES FOCUSED" },
    { icon: ArrowUpRight, value: "+18", label: "MARKS RECOVERABLE" },
    { icon: Target, value: "05", label: "REVIEW STREAK" },
  ];
const menu = [
  [Grid2X2, "Overview"],
  [Gauge, "Live drill"],
  [UploadCloud, "Question intake"],
  [LineChart, "Diagnostics"],
  [BookOpen, "Reference"],
] as const;

function MiniLine({ color = "#7667ef" }: { color?: string }) {
  return (
    <svg className="chart-line" viewBox="0 0 300 90" aria-hidden="true">
      <path
        d="M0 77 C23 72, 27 52, 52 63 S73 77, 89 51 S110 29, 129 50 S150 66, 171 43 S194 15, 213 36 S241 56, 258 33 S279 20, 300 42"
        fill="none"
        stroke={color}
        strokeWidth="3"
      />
      <path
        d="M0 89 L0 77 C23 72, 27 52, 52 63 S73 77, 89 51 S110 29, 129 50 S150 66, 171 43 S194 15, 213 36 S241 56, 258 33 S279 20, 300 42 L300 90Z"
        fill={`url(#fill-${color.slice(1)})`}
        opacity=".22"
      />
      <defs>
        <linearGradient
          id={`fill-${color.slice(1)}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function UnifiedDashboard({
  theme,
  switchTheme,
}: {
  theme: Theme;
  switchTheme: () => void;
}) {
  const [active, setActive] = useState("Overview");
  const isDark = theme === "dark";
  return (
    <div
      className={`tj-dashboard dashboard-light dashboard-unified ${isDark ? "is-dark" : ""}`}
    >
      <aside className="dash-light-sidebar">
        <Link className="dash-brand" href="/">
          <span>
            <GraduationCap size={21} />
          </span>
          <b>TargetJEE</b>
          <em>Engine</em>
        </Link>
        <span className="dash-section-label">NAVIGATION</span>
        <nav>
          {menu.map(([Icon, label]) => (
            <button
              key={label}
              className={
                active === label ? "dash-side-item active" : "dash-side-item"
              }
              onClick={() => setActive(label)}
            >
              <Icon size={16} /> <span>{label}</span>
              {label === "Overview" && <ChevronDown size={14} />}
            </button>
          ))}
        </nav>
        <span className="dash-section-label secondary">SYSTEM</span>
        <button className="dash-side-item">
          <Settings2 size={16} /> <span>Calibration</span>
        </button>
        <button className="dash-side-item">
          <HelpCircle size={16} /> <span>Support</span>
        </button>
        <div className="dash-sidebar-bottom">
          <div className="dash-status-dot" /> Secure session logging{" "}
          <span>v1.0</span>
        </div>
      </aside>
      <section className="dash-light-main">
        <header className="dash-light-header">
          <button className="dash-menu-button">
            <Menu size={20} />
          </button>
          <div className="dash-header-path">
            <span>Adaptive level</span>
            <b>Level 07</b>
          </div>
          <div className="dash-head-spacer" />
          <button className="dash-alert">
            <Bell size={18} />
            <i>3</i>
          </button>
          <button className="dash-user">
            <span>AS</span>
            <div>
              <b>Aarav Singh</b>
              <small>JEE aspirant</small>
            </div>
            <ChevronDown size={14} />
          </button>
          <button
            onClick={switchTheme}
            className="dash-theme-toggle"
            aria-label={
              isDark ? "Switch to light dashboard" : "Switch to dark dashboard"
            }
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>
        <div className="dash-light-crumb">
          <b>Dashboard</b>
          <span>/</span>
          <span>Practice intelligence</span>
          <span>/</span>
          <strong>Overview</strong>
        </div>
        <main className="dash-light-content">
          <div className="dash-title-row">
            <div>
              <span className="dash-overline">TODAY / 11 NOVEMBER</span>
              <h1>Good evening, Aarav.</h1>
              <p>Turn today’s mistakes into the next set of recovered marks.</p>
            </div>
            <Link href="/simulator" className="dash-start-button">
              Launch timed drill <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="dash-light-grid-top">
            <article className="dash-metric-matrix">
              {lightMetrics.map(({ icon: ItemIcon, value, label }) => (
                <div key={label}>
                  <ItemIcon size={25} />
                  <b>{value}</b>
                  <span>{label}</span>
                </div>
              ))}
            </article>
            <article className="dash-light-sales-card">
              <div className="dash-card-top">
                <b>Weekly JEE readiness</b>
                <MoreHorizontal size={18} />
              </div>
              <div className="dash-chart-kpis">
                <div>
                  <strong>21,356.46</strong>
                  <span>Questions reviewed</span>
                </div>
                <div>
                  <strong>1935.6</strong>
                  <span>Average decision seconds</span>
                </div>
              </div>
              <div className="dash-mixed-chart">
                <div className="dash-y-axis">
                  <span>80</span>
                  <span>60</span>
                  <span>40</span>
                  <span>20</span>
                  <span>0</span>
                </div>
                <MiniLine color="#b6cdfd" />
                <div className="dash-bars">
                  {scoreBars.map((height, index) => (
                    <i key={index} style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>
              <div className="dash-chart-labels">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
              </div>
              <div className="dash-chart-legend">
                <span>
                  <i /> Item score
                </span>
                <span>
                  <i /> Time average
                </span>
              </div>
            </article>
          </div>
          <div className="dash-light-grid-bottom">
            <article className="dash-stat-card conversion">
              <strong>53.94%</strong>
              <b>Decision control</b>
              <p>
                How consistently your answer choices hold up under timed review.
              </p>
              <MiniLine color="#7264f4" />
            </article>
            <article className="dash-stat-card delivery">
              <strong>1432</strong>
              <b>Marks recovered</b>
              <p>Marks converted after reviewing repeatable errors.</p>
              <div className="dash-delivery-values">
                <span>
                  <b>130</b> May
                </span>
                <span>
                  <b>251</b> June
                </span>
                <span>
                  <b>235</b> July
                </span>
              </div>
            </article>
            <article className="dash-diagnostic-board">
              <div>
                <span>SESSION SIGNAL</span>
                <b>Estimate stability</b>
              </div>
              <strong>Settling</strong>
              <p>
                Complete a few more scored questions for a steadier performance
                picture.
              </p>
              <Link href="/simulator">
                Start a focused drill <ArrowUpRight size={14} />
              </Link>
            </article>
          </div>
        </main>
      </section>
    </div>
  );
}

export function TargetJeeDashboard() {
  const [theme, setTheme] = useState<Theme>("light");
  return (
    <UnifiedDashboard
      theme={theme}
      switchTheme={() =>
        setTheme((current) => (current === "light" ? "dark" : "light"))
      }
    />
  );
}
