"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  PREFERRED_VIEWS,
  REGIONS,
  TIME_WINDOWS,
  TIME_WINDOW_LABELS,
  type Category,
  type PreferredView,
  type TimeWindow,
} from "@/lib/constants";

export default function SettingsPage() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center text-[var(--text-muted)]">
          Checking session…
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <p className="text-[var(--text-muted)]">Sign in to manage preferences.</p>
          <SignInButton mode="modal">
            <button className="px-4 py-2 rounded bg-[var(--accent-dim)] text-[#0b0f14] font-semibold">
              Sign in
            </button>
          </SignInButton>
        </div>
      </Unauthenticated>
      <Authenticated>
        <SettingsGate />
      </Authenticated>
    </>
  );
}

function SettingsGate() {
  const prefs = useQuery(api.preferences.get);
  if (prefs === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--text-muted)]">
        Loading preferences…
      </div>
    );
  }
  return <SettingsForm initial={prefs} />;
}

function SettingsForm({
  initial,
}: {
  initial: {
    selectedCategories: string[];
    selectedRegions: string[];
    timeWindow: string;
    preferredView: string;
  } | null;
}) {
  const user = useQuery(api.users.currentUser);
  const ensureUser = useMutation(api.users.ensureCurrentUser);
  const save = useMutation(api.preferences.save);

  const [categories, setCategories] = useState<Category[]>(
    () => (initial?.selectedCategories as Category[]) ?? [],
  );
  const [regions, setRegions] = useState<string[]>(
    () => initial?.selectedRegions ?? [],
  );
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(
    () => (initial?.timeWindow as TimeWindow) ?? "7d",
  );
  const [preferredView, setPreferredView] = useState<PreferredView>(
    () => (initial?.preferredView as PreferredView) ?? "split",
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void ensureUser({});
  }, [ensureUser]);

  const onSave = async () => {
    setError(null);
    setStatus(null);
    try {
      await save({
        selectedCategories: categories,
        selectedRegions: regions,
        timeWindow,
        preferredView,
      });
      setStatus("Preferences saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold hover:text-[var(--accent)]">
            CENTCOM · Threat COP
          </Link>
          <span className="text-[var(--text-faint)]">/</span>
          <span className="text-[var(--text-muted)]">Settings</span>
        </div>
        <UserButton />
      </header>
      <main className="flex-1 max-w-xl w-full mx-auto p-6 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Preferences</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Stored privately for{" "}
            <strong className="text-[var(--text)]">
              {user?.displayName ?? "you"}
            </strong>
            . Other users cannot read or change these values.
          </p>
        </div>

        <fieldset className="border border-[var(--border)] rounded p-4">
          <legend className="px-1 text-[11px] uppercase tracking-[0.14em] font-mono text-[var(--accent)]">
            Default categories
          </legend>
          <div className="flex flex-col gap-1 mt-2">
            {CATEGORIES.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={categories.includes(c)}
                  onChange={() =>
                    setCategories((prev) =>
                      prev.includes(c)
                        ? prev.filter((x) => x !== c)
                        : [...prev, c],
                    )
                  }
                />
                {CATEGORY_LABELS[c]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="border border-[var(--border)] rounded p-4">
          <legend className="px-1 text-[11px] uppercase tracking-[0.14em] font-mono text-[var(--accent)]">
            Default regions
          </legend>
          <div className="flex flex-col gap-1 mt-2 max-h-48 overflow-y-auto gsm-scroll">
            {REGIONS.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={regions.includes(r)}
                  onChange={() =>
                    setRegions((prev) =>
                      prev.includes(r)
                        ? prev.filter((x) => x !== r)
                        : [...prev, r],
                    )
                  }
                />
                {r}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="border border-[var(--border)] rounded p-4">
          <legend className="px-1 text-[11px] uppercase tracking-[0.14em] font-mono text-[var(--accent)]">
            Default time window
          </legend>
          <div className="flex flex-col gap-1 mt-2">
            {TIME_WINDOWS.map((tw) => (
              <label key={tw} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tw"
                  checked={timeWindow === tw}
                  onChange={() => setTimeWindow(tw)}
                />
                {TIME_WINDOW_LABELS[tw]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="border border-[var(--border)] rounded p-4 text-sm text-[var(--text-muted)]">
          <legend className="px-1 text-[11px] uppercase tracking-[0.14em] font-mono text-[var(--accent)]">
            AOR and thermals
          </legend>
          <p className="mt-2">
            <strong className="text-[var(--text)]">AOR</strong> is the area of
            responsibility — the watch box on the COP. Click the theater name to
            jump the map. Live event filters (category, severity, region, time)
            are under Settings on the COP, not this page.
          </p>
          <p className="mt-2">
            <strong className="text-[#f97316]">Thermals</strong> are NASA FIRMS
            heat pixels (fires, flares, explosions). Public heat, not targeting.
            FRP is megawatts. Click a MW value to inspect. 24h vs prior 24h is
            whether heat is up or down vs yesterday.
          </p>
        </fieldset>

        <fieldset className="border border-[var(--border)] rounded p-4">
          <legend className="px-1 text-[11px] uppercase tracking-[0.14em] font-mono text-[var(--accent)]">
            Preferred view
          </legend>
          <div className="flex flex-col gap-1 mt-2">
            {PREFERRED_VIEWS.map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm capitalize">
                <input
                  type="radio"
                  name="view"
                  checked={preferredView === v}
                  onChange={() => setPreferredView(v)}
                />
                {v}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={() => void onSave()}
          className="px-4 py-2 rounded bg-[var(--accent-dim)] text-[#0b0f14] font-semibold self-start"
        >
          Save preferences
        </button>
        {status && (
          <p className="text-sm text-[var(--ok)]" role="status">
            {status}
          </p>
        )}
        {error && (
          <p className="text-sm text-[var(--critical)]" role="alert">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
