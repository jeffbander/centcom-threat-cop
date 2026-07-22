"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { CentcomSeal, DoDStyleBanner } from "./CentcomSeal";

type StepStatus = "pending" | "active" | "done" | "warn";

type Step = {
  id: string;
  label: string;
  detail: string;
  status: StepStatus;
};

const STEP_DEFS: Array<{ id: string; label: string; detail: string; ms: number }> = [
  {
    id: "net",
    label: "Secure network path",
    detail: "TLS 1.3 · mutual auth · session isolation",
    ms: 900,
  },
  {
    id: "bio",
    label: "Biometric capture in progress",
    detail: "Facial geometry · device posture · liveness check",
    ms: 1600,
  },
  {
    id: "geo",
    label: "Location scan",
    detail: "Geofence validation · terminal coordinates · hop analysis",
    ms: 1400,
  },
  {
    id: "id",
    label: "Identity verification",
    detail: "Credential binding · privilege attestation · continuous auth",
    ms: 1500,
  },
  {
    id: "policy",
    label: "Policy & classification gate",
    detail: "CUI / SENSITIVE handling · need-to-know · audit trail",
    ms: 1100,
  },
  {
    id: "sat",
    label: "Direct satellite link handshake",
    detail: "Uplink ready · encryption suite engaged · stand by",
    ms: 1200,
  },
];

function statusIcon(s: StepStatus) {
  if (s === "done") return "■";
  if (s === "active") return "▶";
  if (s === "warn") return "!";
  return "□";
}

/**
 * Full-screen government-style access portal before the Threat COP.
 * Presentation UX only — does not capture real biometrics.
 */
export function SecureAccessGate({ onComplete }: { onComplete: () => void }) {
  const { user } = useUser();
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [clock, setClock] = useState(() => new Date().toISOString());
  const [progress, setProgress] = useState(0);
  const [scanLine, setScanLine] = useState(0);

  const operator =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.username ||
    "AUTHORIZED OPERATOR";

  const steps: Step[] = useMemo(() => {
    return STEP_DEFS.map((d, i) => ({
      id: d.id,
      label: d.label,
      detail: d.detail,
      status:
        i < stepIndex ? "done" : i === stepIndex && !done ? "active" : "pending",
    }));
  }, [stepIndex, done]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setClock(new Date().toISOString().replace("T", " ").slice(0, 19) + "Z");
      setScanLine((n) => (n + 1) % 100);
    }, 80);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (done) return;
    let cancelled = false;
    let i = 0;
    let timer: number;

    const run = () => {
      if (cancelled) return;
      if (i >= STEP_DEFS.length) {
        setDone(true);
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
  }, [done]);

  return (
    <div className="gsm-secure-gate min-h-screen flex flex-col text-[var(--text)]">
      {/* Top classification banner */}
      <div className="gsm-class-banner bg-[#5c1a1a] text-[#ffcccc] text-center text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em] py-1.5 border-b-2 border-[#c9a227]">
        ★ Sensitive // Controlled Unclassified Information // Not For Public Release ★
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-3xl mx-auto w-full">
        <DoDStyleBanner className="mb-6" />

        <div className="relative mb-6">
          <CentcomSeal size={140} className="gsm-secure-seal" />
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden rounded-full"
            aria-hidden
          >
            <div
              className="gsm-bio-scan absolute left-0 right-0 h-0.5 bg-[var(--ok)]/80 shadow-[0_0_12px_#22c55e]"
              style={{ top: `${scanLine}%` }}
            />
          </div>
        </div>

        <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a227] font-mono mb-2">
          Secure government access portal
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-[#f5e6a8] tracking-tight mb-2">
          You are about to access a sensitive system
        </h1>
        <p className="text-center text-sm text-[var(--text-muted)] max-w-xl mb-6 leading-relaxed">
          This terminal is operating inside a monitored enclave. Unauthorized
          access, redistribution, or reverse engineering is prohibited and may
          result in administrative, civil, or criminal penalties.
        </p>

        {/* Warning grid */}
        <div className="w-full grid sm:grid-cols-2 gap-2 mb-6 text-[11px] font-mono">
          {[
            "WARNING: Biometrics are being captured",
            "WARNING: Location is being scanned",
            "WARNING: Session is continuously audited",
            "WARNING: Identity verification in progress",
            "NOTICE: All keystrokes may be logged",
            "NOTICE: Stand by for clearance confirmation",
          ].map((w) => (
            <div
              key={w}
              className="border border-[#c9a227]/50 bg-[#1a1408] px-3 py-2 text-[#f5d76e] flex items-start gap-2"
            >
              <span className="text-[var(--critical)] shrink-0">▲</span>
              <span>{w}</span>
            </div>
          ))}
        </div>

        {/* Operator line */}
        <div className="w-full border border-[var(--border)] bg-black/40 px-4 py-3 mb-4 font-mono text-xs">
          <div className="flex flex-wrap justify-between gap-2">
            <span>
              <span className="text-[var(--text-faint)]">SUBJECT: </span>
              <span className="text-[var(--accent)]">{operator}</span>
            </span>
            <span className="text-[var(--text-faint)] tabular-nums">{clock}</span>
          </div>
          <div className="mt-1 text-[var(--text-faint)]">
            CLEARANCE REQUEST: THREAT COP // CENTCOM AOR // READ-ONLY OPS
          </div>
        </div>

        {/* Progress */}
        <div className="w-full mb-4">
          <div className="flex justify-between text-[10px] font-mono text-[var(--text-faint)] mb-1">
            <span>VERIFICATION SEQUENCE</span>
            <span className="text-[var(--ok)]">{progress}%</span>
          </div>
          <div className="h-2 bg-black/60 border border-[var(--border)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1e4d8c] via-[var(--ok)] to-[#c9a227] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <ul className="w-full space-y-2 mb-8 font-mono text-xs">
          {steps.map((s) => (
            <li
              key={s.id}
              className={`flex gap-3 px-3 py-2 border ${
                s.status === "active"
                  ? "border-[var(--ok)] bg-[var(--ok)]/10"
                  : s.status === "done"
                    ? "border-[var(--border)] bg-black/30 text-[var(--text-muted)]"
                    : "border-[var(--border)]/50 opacity-50"
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
                  {s.status === "active" ? "…" : s.status === "done" ? " — OK" : ""}
                </p>
                <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
                  {s.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {!done ? (
          <p className="text-sm font-mono text-[#c9a227] uppercase tracking-[0.2em] animate-pulse">
            Stand by — verifying your identity
          </p>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full max-w-md">
            <p className="text-sm font-mono text-[var(--ok)] uppercase tracking-[0.15em]">
              Clearance granted · enclave ready
            </p>
            <button
              type="button"
              onClick={onComplete}
              className="w-full py-3 px-6 font-bold uppercase tracking-[0.2em] text-sm
                bg-[#c9a227] text-[#0a0a08] border-2 border-[#f5e6a8]
                hover:bg-[#f5e6a8] transition-colors shadow-[0_0_24px_rgba(201,162,39,0.35)]"
            >
              Enter Threat COP — Sensitive System
            </button>
            <p className="text-[10px] text-center text-[var(--text-faint)] max-w-sm">
              By continuing you acknowledge continuous monitoring. Biometric and
              location checks are presented for access control UX; no biometric
              templates are stored by this application.
            </p>
          </div>
        )}
      </div>

      <div className="gsm-class-banner bg-[#5c1a1a] text-[#ffcccc] text-center text-[10px] font-bold uppercase tracking-[0.2em] py-1.5 border-t-2 border-[#c9a227]">
        ★ End of sensitive access portal · U.S. Central Command Threat COP ★
      </div>
    </div>
  );
}
