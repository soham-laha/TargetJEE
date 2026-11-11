"use client";

import Link from "next/link";
import { Activity, ArrowUpRight, Bell, BookOpen, BrainCircuit, ChevronDown, Clock3, FileText, Gauge, GraduationCap, Grid2X2, HelpCircle, LineChart, Menu, Moon, MoreHorizontal, Search, Settings2, Sun, Target, UploadCloud, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

type Theme = "light" | "dark";

const scoreBars = [44, 31, 53, 63, 39, 62];
const responseBars = [34, 68, 51, 49, 75, 52, 59];
const lightMetrics: Array<{ icon: LucideIcon; value: string; label: string }> = [
  { icon: UsersRound, value: "1,000", label: "ITEMS MASTERED" }, { icon: BrainCircuit, value: "1.252", label: "LIVE THETA" }, { icon: UploadCloud, value: "600", label: "SOURCES PARSED" },
  { icon: Clock3, value: "3,550", label: "SECONDS LOGGED" }, { icon: ArrowUpRight, value: "3,550", label: "TRAP PATHS" }, { icon: Target, value: "100%", label: "CALIBRATED" }
];
const menu = [
  [Grid2X2, "Overview"], [Gauge, "Live drill"], [UploadCloud, "Question intake"], [LineChart, "Diagnostics"], [BookOpen, "Reference"]
] as const;

function MiniLine({ color = "#7667ef" }: { color?: string }) {
  return <svg className="chart-line" viewBox="0 0 300 90" aria-hidden="true"><path d="M0 77 C23 72, 27 52, 52 63 S73 77, 89 51 S110 29, 129 50 S150 66, 171 43 S194 15, 213 36 S241 56, 258 33 S279 20, 300 42" fill="none" stroke={color} strokeWidth="3" /><path d="M0 89 L0 77 C23 72, 27 52, 52 63 S73 77, 89 51 S110 29, 129 50 S150 66, 171 43 S194 15, 213 36 S241 56, 258 33 S279 20, 300 42 L300 90Z" fill={`url(#fill-${color.slice(1)})`} opacity=".22" /><defs><linearGradient id={`fill-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={color} /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs></svg>;
}

function LightDashboard({ switchTheme }: { switchTheme: () => void }) {
  const [active, setActive] = useState("Overview");
  return <div className="tj-dashboard dashboard-light">
    <aside className="dash-light-sidebar">
      <Link className="dash-brand" href="/"><span><GraduationCap size={21} /></span><b>TargetJEE</b><em>Engine</em></Link>
      <span className="dash-section-label">NAVIGATION</span>
      <nav>{menu.map(([Icon, label]) => <button key={label} className={active === label ? "dash-side-item active" : "dash-side-item"} onClick={() => setActive(label)}><Icon size={16} /> <span>{label}</span>{label === "Overview" && <ChevronDown size={14} />}</button>)}</nav>
      <span className="dash-section-label secondary">SYSTEM</span>
      <button className="dash-side-item"><Settings2 size={16} /> <span>Calibration</span></button>
      <button className="dash-side-item"><HelpCircle size={16} /> <span>Support</span></button>
      <div className="dash-sidebar-bottom"><div className="dash-status-dot" /> Secure session logging <span>v1.0</span></div>
    </aside>
    <section className="dash-light-main">
      <header className="dash-light-header"><button className="dash-menu-button"><Menu size={20} /></button><div className="dash-header-path"><span>Adaptive level</span><b>Level 07</b></div><div className="dash-head-spacer" /><button className="dash-alert"><Bell size={18} /><i>3</i></button><button className="dash-user"><span>AS</span><div><b>Aarav Singh</b><small>JEE aspirant</small></div><ChevronDown size={14} /></button><button onClick={switchTheme} className="dash-theme-toggle" aria-label="Switch to dark dashboard"><Moon size={16} /></button></header>
      <div className="dash-light-crumb"><b>Dashboard</b><span>/</span><span>Practice intelligence</span><span>/</span><strong>Overview</strong></div>
      <main className="dash-light-content">
        <div className="dash-title-row"><div><span className="dash-overline">TODAY / 11 NOVEMBER</span><h1>Good evening, Aarav.</h1><p>Read the pressure signal before your next attempt.</p></div><Link href="/simulator" className="dash-start-button">Launch timed drill <ArrowUpRight size={16} /></Link></div>
        <div className="dash-light-grid-top">
          <article className="dash-metric-matrix">{lightMetrics.map(({ icon: ItemIcon, value, label }) => <div key={label}><ItemIcon size={25} /><b>{value}</b><span>{label}</span></div>)}</article>
          <article className="dash-light-sales-card"><div className="dash-card-top"><b>Department wise monthly readiness report</b><MoreHorizontal size={18} /></div><div className="dash-chart-kpis"><div><strong>21,356.46</strong><span>Calibrated responses</span></div><div><strong>1935.6</strong><span>Avg. decision seconds</span></div></div><div className="dash-mixed-chart"><div className="dash-y-axis"><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span></div><MiniLine color="#b6cdfd" /><div className="dash-bars">{scoreBars.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></div><div className="dash-chart-labels"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span></div><div className="dash-chart-legend"><span><i /> Item score</span><span><i /> Time average</span></div></article>
        </div>
        <div className="dash-light-grid-bottom"><article className="dash-stat-card conversion"><strong>53.94%</strong><b>Confidence alignment</b><p>Reported confidence divided by observed decision quality.</p><MiniLine color="#7264f4" /></article><article className="dash-stat-card delivery"><strong>1432</strong><b>Questions delivered</b><p>Source-validated questions have entered the simulator.</p><div className="dash-delivery-values"><span><b>130</b> May</span><span><b>251</b> June</span><span><b>235</b> July</span></div></article><article className="dash-diagnostic-board"><div><span>LIVE SIGNAL</span><b>Pressure index</b></div><strong>42<small>/ 100</small></strong><p>Stable. You retain an estimated 88% of baseline ability inside the present item budget.</p><Link href="/simulator">Inspect live theta <ArrowUpRight size={14} /></Link></article></div>
      </main>
    </section>
  </div>;
}

function DarkDashboard({ switchTheme }: { switchTheme: () => void }) {
  return <div className="tj-dashboard dashboard-dark">
    <header className="dash-dark-header"><Link href="/" className="dark-symbol"><GraduationCap size={20} /></Link><span className="dark-header-rule" /><div className="dark-search"><Search size={16} /><span>Type to search...</span><kbd>⌘K</kbd></div><div className="dark-head-actions"><Activity size={17} /><button><Bell size={16} /><i /></button><Sun size={17} /><button className="dark-profile">AS<i /></button><button className="dark-theme-button" onClick={switchTheme} aria-label="Switch to light dashboard"><Sun size={16} /></button></div></header>
    <main className="dash-dark-main"><div className="dark-dashboard-title"><div><span>COMMAND CENTER / TARGETJEE ENGINE</span><h1>High-pressure performance, made visible.</h1></div><Link href="/simulator">Start a live drill <ArrowUpRight size={16} /></Link></div><section className="dark-card-grid"><article className="dark-card profit-card"><div className="dark-card-title"><strong>88.5k <small>−18%</small></strong><span>Total focus minutes</span></div><div className="dark-split-bars">{[65, 55, 75, 78, 47].map((height, index) => <div key={index}><i style={{ height: `${height * .55}%` }} /><b style={{ height: `${height * .45}%` }} /></div>)}</div></article><article className="dark-card order-card"><div className="dark-card-title"><strong>Order</strong><span>Last week</span></div><div className="dark-response-bars">{responseBars.map((height, index) => <div key={index}><i /><b style={{ height: `${height}%` }} /></div>)}</div><div className="dark-card-bottom"><b>124K</b><span>+12.6%</span></div></article><article className="dark-card line-card"><div className="dark-card-title"><strong>Ability signal</strong><span>Last month</span></div><MiniLine color="#08c88e" /><div className="dark-card-bottom"><b>624K</b><span>+12.6%</span></div></article><article className="dark-card reach-card"><div className="dark-card-title"><strong>User reach</strong><span>Last week</span></div><div className="dark-donut"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" /><circle className="value" cx="50" cy="50" r="38" /></svg><b>500<small>Visitors</small></b></div><div className="dark-card-bottom"><b>32K</b><span>+12%</span></div></article><article className="dark-card mini-card income-card"><div className="dark-icon mint"><Gauge size={17} /></div><div className="dark-card-title"><strong>Total ability</strong><span>Last week</span></div><b className="dark-money">+4.673</b><small className="dark-up">+25.2%</small></article><article className="dark-card mini-card expense-card"><div className="dark-icon blue"><FileText size={17} /></div><div className="dark-card-title"><strong>Time deficit</strong><span>Last month</span></div><b className="dark-money">1.28K</b><small className="dark-down">−12.2%</small></article></section><section className="dark-lower-grid"><article className="dark-card transaction-card"><div className="dark-card-title"><strong>Total transaction</strong><MoreHorizontal size={17} /></div><div className="dark-heatmap">{Array.from({ length: 30 }, (_, index) => <i key={index} style={{ opacity: .12 + ((index * 7) % 10) / 12 }} />)}</div></article><article className="dark-card report-card"><div className="dark-card-title"><strong>Report</strong><MoreHorizontal size={17} /></div><div className="dark-report-lines"><i /><i /><i /><i /></div></article><article className="dark-card sales-card"><div className="dark-icon mint"><LineChart size={17} /></div><div className="dark-card-title"><strong>Total theta gain</strong><button>Details</button></div><strong className="dark-sales-number">+0.72σ</strong></article></section></main>
  </div>;
}

export function TargetJeeDashboard() {
  const [theme, setTheme] = useState<Theme>("light");
  return theme === "light" ? <LightDashboard switchTheme={() => setTheme("dark")} /> : <DarkDashboard switchTheme={() => setTheme("light")} />;
}
