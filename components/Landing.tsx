"use client";

import { useEffect, useMemo, useState } from "react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { CentcomSeal, DoDStyleBanner } from "./CentcomSeal";

type StepStatus = "pending" | "active" | "done";

const STEP_DEFS: Array<{
  id: string;
  label: string;
  detail: string;
  ms: number;
}> = [
  {
    id: "net",
    label: "Secure network path",
    detail: "TLS 1.3 · mutual auth · enclave isolation",
    ms: 700,
  },
  {
    id: "bio",
    label: "Biometric capture in progress",
    detail: "Facial geometry · liveness · device posture",
    ms: 1200,
  },
  {
    id: "geo",
    label: "Location is being scanned",
    detail: "Geofence · terminal fix · hop analysis",
    ms: 1000,
  },
  {
    id: "id",
    label: "Verifying your identity",
    detail: "Credential bind · privilege attestation",
    ms: 1100,
  },
  {
    id: "policy",
    label: "Classification gate",
    detail: "SENSITIVE / CUI · need-to-know · audit",
    ms: 900,
  },
  {
    id: "sat",
    label: "Direct satellite link handshake",
    detail: "Uplink · encryption suite · stand by",
    ms: 1000,
  },
];

const WARNINGS = [
  "WARNING: BIOMETRICS ARE BEING CAPTURED",
  "WARNING: LOCATION IS BEING SCANNED",
  "WARNING: CONTINUOUS SESSION AUDIT ACTIVE",
  "WARNING: IDENTITY VERIFICATION IN PROGRESS",
  "WARNING: UNAUTHORIZED ACCESS IS A FEDERAL OFFENSE",
  "WARNING: ALL ACTIVITY IS MONITORED AND LOGGED",
  "NOTICE: KEYSTROKES MAY BE RECORDED",
  "NOTICE: STAND BY FOR CLEARANCE CONFIRMATION",
  "NOTICE: REMOVABLE MEDIA IS PROHIBITED",
  "NOTICE: PHOTOGRAPHY OF THIS TERMINAL IS FORBIDDEN",
  "ALERT: INSIDER THREAT MONITORING ENGAGED",
  "ALERT: ZERO-TRUST CONTINUOUS VALIDATION ON",
];

const TELEMETRY_SEED = [
  { k: "ENC", v: "AES-256-GCM" },
  { k: "LINK", v: "SATCOM-3" },
  { k: "NODE", v: "CC-AOR-07" },
  { k: "THREAT", v: "ORANGE" },
  { k: "FW", v: "ACTIVE" },
  { k: "IDS", v: "ARMED" },
  { k: "VPN", v: "LOCKED" },
  { k: "HSM", v: "ONLINE" },
];

const LOG_LINES = [
  "AUTH_GATE: inbound probe discarded — rate limit",
  "BIOMETRICS: facial mesh sample 01… OK",
  "GEO: terminal coordinate fix pending…",
  "GEO: multi-source location correlation…",
  "PKI: certificate chain validated",
  "POLICY: CUI handling rules loaded",
  "SAT: handshake nonce exchanged",
  "IDS: anomaly score 0.04 — nominal",
  "AUDIT: session recorder attached",
  "ZERO_TRUST: continuous re-auth schedule set",
  "NET: TLS 1.3 suite negotiated",
  "OPSEC: clipboard quarantine enabled",
];

function statusIcon(s: StepStatus) {
  if (s === "done") return "■";
  if (s === "active") return "▶";
  return "□";
}

function randHex(n: number) {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s.toUpperCase();
}

/**
 * Dramatic military home / login portal.
 * Presentation only — original seals, not official DoD trademarks.
 */
export function Landing() {
  const [stepIndex, setStepIndex] = useState(0);
  const [seqDone, setSeqDone] = useState(false);
  const [clock, setClock] = useState(() => new Date().toISOString());
  const [progress, setProgress] = useState(0);
  const [scanLine, setScanLine] = useState(0);
  const [tick, setTick] = useState(0);
  const [logs, setLogs] = useState<string[]>(() => LOG_LINES.slice(0, 4));
  const [cpu, setCpu] = useState(34);
  const [net, setNet] = useState(62);
  const [lat, setLat] = useState(0);
  const [lon, setLon] = useState(0);
  const [sessionId] = useState(() => `SES-${randHex(4)}-${randHex(4)}`);

  const steps = useMemo(() => {
    return STEP_DEFS.map((d, i) => ({
      ...d,
      status: (i < stepIndex
        ? "done"
        : i === stepIndex && !seqDone
          ? "active"
          : "pending") as StepStatus,
    }));
  }, [stepIndex, seqDone]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setClock(new Date().toISOString().replace("T", " ").slice(0, 19) + "Z");
      setScanLine((n) => (n + 1) % 100);
      setTick((t) => t + 1);
      setCpu((c) => Math.min(92, Math.max(18, c + (Math.random() * 10 - 5))));
      setNet((n) => Math.min(98, Math.max(20, n + (Math.random() * 12 - 6))));
      setLat(25 + Math.sin(Date.now() / 8000) * 0.02);
      setLon(45 + Math.cos(Date.now() / 9000) * 0.03);
    }, 90);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLogs((prev) => {
        const line = `${new Date().toISOString().slice(11, 19)}Z  ${LOG_LINES[Math.floor(Math.random() * LOG_LINES.length)]}  [${randHex(6)}]`;
        return [line, ...prev].slice(0, 12);
      });
    }, 1400);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (seqDone) return;
    let cancelled = false;
    let i = 0;
    let timer: number;
    const run = () => {
      if (cancelled) return;
      if (i >= STEP_DEFS.length) {
        setSeqDone(true);
        setProgress(100);
        return;
      }
      setStepIndex(i);
      setProgress(Math.round(((i + 0.5) / STEP_DEFS.length) * 100));
      timer = window.setTimeout(() => {
        i += 1;
        setProgress(Math.round((i / STEP_DEFS.length) * 100));
        run();
      }, STEP_DEFS[i].ms);
    };
    run();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [seqDone]);

  return (
    <div className="gsm-secure-gate gsm-mil-home min-h-screen flex flex-col text-[var(--text)] overflow-hidden">
      {/* Dual classification bars */}
      <div className="gsm-class-banner bg-[#7a1515] text-[#ffdddd] text-center text-[10px] sm:text-xs font-bold uppercase tracking-[0.28em] py-1 border-b border-[#c9a227] gsm-warn-flash">
        ★★★  SENSITIVE  //  CONTROLLED UNCLASSIFIED INFORMATION  //  NOT FOR PUBLIC RELEASE  ★★★
      </div>
      <div className="bg-[#1a1000] text-[#c9a227] text-center text-[9px] font-mono uppercase tracking-[0.18em] py-1 border-b border-[#c9a227]/40">
        U.S. CENTRAL COMMAND · AOR THREAT COP · ACCESS ENCLAVE · NODE CC-AOR-07 · {sessionId}
      </div>

      {/* Top status strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 bg-black/70 border-b border-[var(--border)] text-[9px] sm:text-[10px] font-mono">
        <span className="text-[var(--critical)] font-bold tracking-wider gsm-warn-flash">
          TC-ORANGE
        </span>
        <span className="text-[var(--ok)]">● LINK UP</span>
        <span className="text-[var(--ok)]">● ENC ACTIVE</span>
        <span className="text-[var(--high)]">● IDS ARMED</span>
        <span className="text-[var(--text-faint)] hidden sm:inline">
          FW DROP {1200 + (tick % 40)} · PKT/s {800 + (tick % 90)}
        </span>
        <span className="ml-auto tabular-nums text-[#c9a227]">{clock}</span>
      </div>

      {/* Main 3-column military console */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* LEFT — Telemetry */}
        <aside className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-[var(--border)] bg-black/40 p-3 font-mono text-[10px] overflow-y-auto gsm-scroll max-h-[40vh] lg:max-h-none">
          <p className="text-[#c9a227] uppercase tracking-[0.2em] mb-2 border-b border-[#c9a227]/30 pb-1">
            Telemetry · Security
          </p>
          <div className="space-y-2 mb-3">
            <Meter label="CPU LOAD" value={cpu} color="#38bdf8" />
            <Meter label="NET UTIL" value={net} color="#22c55e" />
            <Meter
              label="BIO MATCH"
              value={seqDone ? 99 : Math.min(99, 20 + stepIndex * 14)}
              color="#ef4444"
            />
            <Meter
              label="GEO CONF"
              value={seqDone ? 97 : Math.min(97, 15 + stepIndex * 13)}
              color="#f59e0b"
            />
            <Meter label="ENC STRENGTH" value={100} color="#c9a227" />
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {TELEMETRY_SEED.map((t) => (
              <div
                key={t.k}
                className="border border-[var(--border)] bg-[#0a1018] px-1.5 py-1"
              >
                <div className="text-[var(--text-faint)] text-[8px]">{t.k}</div>
                <div
                  className={
                    t.v === "ORANGE"
                      ? "text-[var(--high)] font-bold"
                      : "text-[var(--ok)]"
                  }
                >
                  {t.v}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[var(--text-faint)] text-[8px] uppercase mb-1">
            Terminal fix (scan)
          </p>
          <p className="text-[var(--accent)] tabular-nums text-[11px] mb-3">
            {lat.toFixed(5)}°N · {Math.abs(lon).toFixed(5)}°E
          </p>
          <p className="text-[var(--text-faint)] text-[8px] uppercase mb-1">
            Radar sweep
          </p>
          <div className="relative w-full aspect-square max-w-[160px] mx-auto border border-[var(--ok)]/40 rounded-full bg-black overflow-hidden gsm-radar">
            <div className="absolute inset-3 border border-[var(--ok)]/20 rounded-full" />
            <div className="absolute inset-8 border border-[var(--ok)]/15 rounded-full" />
            <div className="gsm-radar-sweep absolute inset-0 origin-center" />
            <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 bg-[var(--ok)] rounded-full shadow-[0_0_8px_#22c55e]" />
          </div>
        </aside>

        {/* CENTER — Warnings + auth */}
        <main className="lg:col-span-6 flex flex-col items-center px-3 sm:px-5 py-4 overflow-y-auto gsm-scroll">
          <DoDStyleBanner className="mb-4 scale-90 sm:scale-100" />

          <div className="relative mb-3">
            <CentcomSeal size={118} className="gsm-secure-seal" />
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden rounded-full"
              aria-hidden
            >
              <div
                className="absolute left-0 right-0 h-0.5 bg-[var(--ok)]/80 shadow-[0_0_12px_#22c55e]"
                style={{ top: `${scanLine}%` }}
              />
            </div>
          </div>

          <p className="text-[9px] uppercase tracking-[0.35em] text-[#c9a227] font-mono mb-1">
            Secure military access enclave
          </p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-[#f5e6a8] tracking-tight mb-2 text-balance">
            You are about to access a sensitive system
          </h1>
          <p className="text-center text-xs sm:text-sm text-[var(--text-muted)] max-w-lg mb-3 leading-relaxed">
            Monitored government-style enclave. Unauthorized access or
            redistribution is prohibited and may result in administrative, civil,
            or criminal penalties under applicable law.
          </p>

          {/* Dense warning wall */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-1 mb-3 text-[9px] sm:text-[10px] font-mono">
            {WARNINGS.map((w, i) => (
              <div
                key={w}
                className={`border px-2 py-1.5 flex items-start gap-1.5 ${
                  i % 3 === 0
                    ? "border-[var(--critical)]/70 bg-[var(--critical-wash)] text-[var(--critical)]"
                    : "border-[#c9a227]/45 bg-[#1a1408] text-[#f5d76e]"
                } ${i < 4 ? "gsm-warn-flash" : ""}`}
              >
                <span className="shrink-0">▲</span>
                <span>{w}</span>
              </div>
            ))}
          </div>

          <div className="w-full border border-[#c9a227]/40 bg-black/50 px-3 py-2 mb-3 font-mono text-[10px]">
            <div className="flex flex-wrap justify-between gap-2">
              <span>
                <span className="text-[var(--text-faint)]">SYSTEM </span>
                <span className="text-[#f5e6a8]">CENTCOM THREAT COP</span>
              </span>
              <span className="text-[var(--text-faint)] tabular-nums">{clock}</span>
            </div>
            <div className="text-[var(--text-faint)] mt-0.5">
              CLEARANCE · THREAT COP // CENTCOM AOR // SENSITIVE // {sessionId}
            </div>
          </div>

          <div className="w-full mb-2">
            <div className="flex justify-between text-[9px] font-mono text-[var(--text-faint)] mb-1">
              <span>PRE-AUTH VERIFICATION SEQUENCE</span>
              <span className="text-[var(--ok)]">{progress}%</span>
            </div>
            <div className="h-2 bg-black/70 border border-[var(--border)] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#1e4d8c] via-[var(--ok)] to-[#c9a227] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <ul className="w-full space-y-1 mb-4 font-mono text-[10px] sm:text-xs">
            {steps.map((s) => (
              <li
                key={s.id}
                className={`flex gap-2 px-2 py-1.5 border ${
                  s.status === "active"
                    ? "border-[var(--ok)] bg-[var(--ok)]/10"
                    : s.status === "done"
                      ? "border-[var(--border)] bg-black/30 text-[var(--text-muted)]"
                      : "border-[var(--border)]/40 opacity-45"
                }`}
              >
                <span
                  className={
                    s.status === "active"
                      ? "text-[var(--ok)] animate-pulse"
                      : s.status === "done"
                        ? "text-[var(--ok)]"
                        : "text-[var(--text-faint)]"
                  }
                >
                  {statusIcon(s.status)}
                </span>
                <div>
                  <p
                    className={
                      s.status === "active"
                        ? "text-[var(--ok)] font-semibold uppercase tracking-wide"
                        : "uppercase tracking-wide"
                    }
                  >
                    {s.label}
                    {s.status === "active"
                      ? "…"
                      : s.status === "done"
                        ? " — OK"
                        : ""}
                  </p>
                  <p className="text-[9px] text-[var(--text-faint)]">{s.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          {!seqDone ? (
            <p className="text-xs sm:text-sm font-mono text-[#c9a227] uppercase tracking-[0.2em] animate-pulse mb-4 text-center">
              Stand by — verifying your identity
            </p>
          ) : (
            <p className="text-xs sm:text-sm font-mono text-[var(--ok)] uppercase tracking-[0.15em] mb-3 text-center">
              Terminal ready · authenticate to proceed
            </p>
          )}

          <div
            className={`w-full max-w-md flex flex-col gap-2 transition-opacity duration-500 ${
              seqDone ? "opacity-100" : "opacity-35 pointer-events-none"
            }`}
          >
            <SignInButton mode="modal">
              <button
                type="button"
                className="w-full py-3.5 px-6 font-bold uppercase tracking-[0.18em] text-xs sm:text-sm
                  bg-[#c9a227] text-[#0a0a08] border-2 border-[#f5e6a8]
                  hover:bg-[#f5e6a8] transition-colors shadow-[0_0_28px_rgba(201,162,39,0.4)]"
              >
                Authenticate — Enter Threat COP
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                type="button"
                className="w-full py-2 px-6 text-[10px] font-mono uppercase tracking-[0.15em]
                  border border-[#c9a227]/50 text-[#c9a227] hover:bg-[#1a1408]"
              >
                Request access credentials
              </button>
            </SignUpButton>
            <p className="text-[9px] text-center text-[var(--text-faint)] leading-relaxed">
              Continuous monitoring acknowledged. Biometric/location UI is
              access-control presentation; no biometric templates are stored.
            </p>
          </div>
        </main>

        {/* RIGHT — Security log */}
        <aside className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-black/50 p-3 font-mono text-[9px] sm:text-[10px] overflow-hidden flex flex-col max-h-[36vh] lg:max-h-none">
          <p className="text-[var(--critical)] uppercase tracking-[0.2em] mb-2 border-b border-[var(--critical)]/40 pb-1 gsm-warn-flash">
            Security console · live
          </p>
          <div className="flex-1 overflow-hidden space-y-1.5 text-[var(--ok)]/90 leading-snug">
            {logs.map((line, i) => (
              <p
                key={`${line}-${i}`}
                className={i === 0 ? "text-[var(--ok)]" : "opacity-80"}
              >
                {line}
              </p>
            ))}
          </div>
          <div className="mt-3 border border-[var(--border)] bg-[#0a1018] p-2 space-y-1">
            <p className="text-[var(--text-faint)] uppercase text-[8px]">
              Threat posture
            </p>
            <p className="text-[var(--critical)] font-bold tracking-wider">
              CONDITION ORANGE
            </p>
            <p className="text-[var(--text-faint)]">
              Insider threat · elevated · continuous
            </p>
            <p className="text-[var(--high)] pt-1">
              LAST AUDIT EVENT · T-{String(tick % 99).padStart(2, "0")}s
            </p>
          </div>
        </aside>
      </div>

      {/* Bottom ticker */}
      <div className="border-t border-[#c9a227]/50 bg-black overflow-hidden">
        <div className="gsm-mil-ticker py-1.5 text-[10px] font-mono text-[#f5d76e] whitespace-nowrap">
          ▲ WARNING BIOMETRICS CAPTURED · ▲ LOCATION SCAN ACTIVE · ▲ SESSION
          AUDITED · ▲ ZERO-TRUST RE-AUTH · ▲ SATCOM UPLINK NOMINAL · ▲ CUI
          HANDLING RULES IN FORCE · ▲ UNAUTHORIZED ACCESS IS A CRIME · ▲ STAND
          BY FOR AUTHENTICATION ·{" "}
          {WARNINGS.join(" · ")} ·{" "}
        </div>
      </div>

      <div className="gsm-class-banner bg-[#5c1a1a] text-[#ffcccc] text-center text-[9px] font-bold uppercase tracking-[0.22em] py-1.5 border-t-2 border-[#c9a227]">
        ★ END SENSITIVE PORTAL · U.S. CENTRAL COMMAND THREAT COP · MILITARY UX ★
      </div>
    </div>
  );
}

function Meter({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const v = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div>
      <div className="flex justify-between text-[8px] mb-0.5">
        <span className="text-[var(--text-faint)]">{label}</span>
        <span style={{ color }} className="tabular-nums">
          {v}%
        </span>
      </div>
      <div className="h-1.5 bg-black border border-[var(--border)] overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${v}%`, background: color }}
        />
      </div>
    </div>
  );
}
