"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatRelativeTime } from "@/lib/format";
import Link from "next/link";

/**
 * Operational Briefing — primary readable X/OSINT wire.
 * Requires X_BEARER_TOKEN on Convex for polling.
 */
export function XOsintFeed() {
  const status = useQuery(api.xFeed.status);
  const channels = useQuery(api.xFeed.listChannels);
  const accounts = useQuery(api.xFeed.listAccounts);
  const [channel, setChannel] = useState<string>("all");
  const [handleFilter, setHandleFilter] = useState<string>("");
  const [minSignal, setMinSignal] = useState(0);
  const [newHandle, setNewHandle] = useState("");
  const [newChannel, setNewChannel] = useState("global");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showManage, setShowManage] = useState(false);

  const posts = useQuery(api.xFeed.listPosts, {
    feedChannel: channel === "all" ? undefined : channel,
    handle: handleFilter || undefined,
    minSignal,
    limit: 50,
  });

  const requestPoll = useMutation(api.xFeed.requestPoll);
  const addAccount = useMutation(api.xFeed.addAccount);
  const removeAccount = useMutation(api.xFeed.removeAccount);
  const seedDefaults = useMutation(api.xFeed.seedDefaults);
  const setEnabled = useMutation(api.xFeed.setAccountEnabled);

  const channelOptions = useMemo(() => {
    const base = [{ channel: "all", accountCount: 0 }];
    return [...base, ...(channels ?? [])];
  }, [channels]);

  const onPoll = async () => {
    setErr(null);
    setMsg(null);
    try {
      await requestPoll({});
      setMsg("Briefing refresh scheduled…");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Poll failed");
    }
  };

  const onAdd = async () => {
    setErr(null);
    setMsg(null);
    try {
      await addAccount({
        handle: newHandle,
        feedChannel: newChannel,
        tags: ["custom", "osint"],
      });
      setNewHandle("");
      setMsg(`Tracking @${newHandle.replace(/^@/, "")}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Add failed");
    }
  };

  return (
    <section
      className="w-full flex flex-col bg-[#0c1018]"
      aria-label="Operational Briefing"
    >
      {/* Flashing red Operational Briefing header */}
      <div className="gsm-op-briefing-header px-4 py-2.5 border-b border-[var(--critical)] flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2.5">
          <span className="gsm-op-briefing-pulse" aria-hidden />
          <div className="min-w-0">
            <h2 className="gsm-op-briefing-title text-sm sm:text-base font-bold uppercase tracking-[0.12em] font-mono leading-tight">
              Operational Briefing
            </h2>
            <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
              {status
                ? `${status.enabledCount} live sources · auto 30m while open`
                : "Connecting…"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void onPoll()}
          className="shrink-0 text-xs px-3 py-1.5 rounded border border-[var(--critical)] text-[var(--critical)] hover:bg-[var(--critical-wash)] font-semibold"
        >
          Pull now
        </button>
      </div>

      {/* Compact filters */}
      <div className="px-3 py-2 border-b border-[var(--border)] flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-1">
          {channelOptions.map((c) => (
            <button
              key={c.channel}
              type="button"
              onClick={() => {
                setChannel(c.channel);
                setHandleFilter("");
              }}
              className={`px-2 py-1 rounded border font-mono uppercase text-[11px] ${
                channel === c.channel
                  ? "border-[var(--critical)] bg-[var(--critical-wash)] text-[var(--critical)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              {c.channel}
              {c.accountCount > 0 ? ` (${c.accountCount})` : ""}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 text-[var(--text-muted)] text-xs flex-1 min-w-[140px]">
            <span className="font-mono text-[10px] uppercase shrink-0">
              Signal
            </span>
            <input
              type="range"
              min={0}
              max={80}
              step={5}
              value={minSignal}
              onChange={(e) => setMinSignal(Number(e.target.value))}
              className="flex-1 accent-[var(--critical)]"
            />
            <span className="font-mono w-6 text-right text-[11px]">
              {minSignal}
            </span>
          </label>
          <button
            type="button"
            onClick={() => setShowManage((v) => !v)}
            className="text-[11px] text-[var(--text-faint)] hover:text-[var(--text)] underline-offset-2 hover:underline"
          >
            {showManage ? "Hide sources" : "Manage sources"}
          </button>
        </div>
        {(accounts ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto gsm-scroll">
            <button
              type="button"
              onClick={() => setHandleFilter("")}
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                !handleFilter
                  ? "bg-[var(--critical-wash)] text-[var(--critical)]"
                  : "text-[var(--text-faint)] hover:text-[var(--text)]"
              }`}
            >
              @all
            </button>
            {(accounts ?? [])
              .filter((a) => a.enabled)
              .map((a) => (
                <button
                  key={a.handle}
                  type="button"
                  onClick={() => setHandleFilter(a.handle)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                    handleFilter === a.handle
                      ? "bg-[var(--critical-wash)] text-[var(--critical)]"
                      : "text-[var(--text-faint)] hover:text-[var(--text)]"
                  }`}
                  title={a.lastError ?? a.feedChannel}
                >
                  @{a.handle}
                </button>
              ))}
          </div>
        )}
      </div>

      {showManage && (
        <div className="px-3 py-2 border-b border-[var(--border)] flex flex-col gap-1.5 bg-[#0a0e14]">
          <div className="flex gap-1">
            <input
              value={newHandle}
              onChange={(e) => setNewHandle(e.target.value)}
              placeholder="@handle"
              className="flex-1 min-w-0 px-2 py-1.5 rounded bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)]"
            />
            <input
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
              placeholder="channel"
              className="w-24 px-2 py-1.5 rounded bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)]"
            />
            <button
              type="button"
              onClick={() => void onAdd()}
              className="px-3 py-1.5 rounded bg-[var(--critical)] text-white text-sm font-semibold"
            >
              Add
            </button>
          </div>
          <div className="flex gap-3 text-[11px]">
            <button
              type="button"
              onClick={async () => {
                const r = await seedDefaults({});
                setMsg(`Seeded ${r.added} accounts`);
              }}
              className="text-[var(--accent)] hover:underline"
            >
              Seed defaults
            </button>
            <Link
              href="/settings"
              className="text-[var(--text-faint)] hover:text-[var(--text)]"
            >
              Settings
            </Link>
          </div>
          {(accounts ?? []).length > 0 && (
            <ul className="max-h-24 overflow-y-auto gsm-scroll space-y-0.5">
              {(accounts ?? []).map((a) => (
                <li
                  key={a._id}
                  className="flex items-center gap-2 text-[11px] px-0.5"
                >
                  <button
                    type="button"
                    className={
                      a.enabled ? "text-[var(--ok)]" : "text-[var(--text-faint)]"
                    }
                    onClick={() =>
                      void setEnabled({
                        handle: a.handle,
                        enabled: !a.enabled,
                      })
                    }
                  >
                    {a.enabled ? "●" : "○"}
                  </button>
                  <span className="font-mono">@{a.handle}</span>
                  <span className="text-[var(--text-faint)]">{a.feedChannel}</span>
                  <button
                    type="button"
                    className="ml-auto text-[var(--critical)] hover:underline"
                    onClick={() => void removeAccount({ handle: a.handle })}
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {msg && (
            <p className="text-[11px] text-[var(--ok)]" role="status">
              {msg}
            </p>
          )}
          {err && (
            <p className="text-[11px] text-[var(--critical)]" role="alert">
              {err}
            </p>
          )}
          {status?.lastPoll?.errorSummary && (
            <p className="text-[11px] text-[var(--high)] leading-snug">
              {status.lastPoll.errorSummary}
            </p>
          )}
        </div>
      )}

      {/* Larger readable posts */}
      <div>
        {posts === undefined && (
          <p className="p-5 text-base text-[var(--text-muted)]">
            Loading briefing…
          </p>
        )}
        {posts && posts.length === 0 && (
          <div className="p-5 text-base text-[var(--text-muted)] space-y-2">
            <p>No posts in this briefing filter.</p>
            <p className="text-sm text-[var(--text-faint)]">
              Manage sources → Seed defaults → Pull now.
            </p>
          </div>
        )}
        <ul className="divide-y divide-[var(--border)]">
          {posts?.map((p) => (
            <li
              key={p._id}
              className="px-4 py-3.5 hover:bg-[var(--bg-hover)]/80 transition-colors"
            >
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold font-mono text-[var(--critical)] hover:underline"
                >
                  @{p.handle}
                </a>
                <span className="text-xs font-mono text-[var(--text-faint)] shrink-0">
                  sig {p.signalScore} · {formatRelativeTime(p.postedAt)}
                </span>
              </div>
              <p className="text-[14px] sm:text-[15px] leading-relaxed text-[var(--text)] whitespace-pre-wrap break-words">
                {p.text}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--text-faint)]">
                <span className="uppercase text-[var(--high)] tracking-wide">
                  {p.feedChannel}
                </span>
                {p.inferredRegion && <span>· {p.inferredRegion}</span>}
                {p.tags.slice(0, 3).map((t) => (
                  <span key={t} className="opacity-70">
                    #{t}
                  </span>
                ))}
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-[var(--accent)] hover:underline text-sm"
                >
                  Open on X ↗
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
