"use client";

import Link from "next/link";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CATEGORY_LABELS, SEVERITY_LABELS, type Category, type Severity } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";

export default function BookmarksPage() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center text-[var(--text-muted)]">
          Checking session…
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <p className="text-[var(--text-muted)]">Sign in to view bookmarks.</p>
          <SignInButton mode="modal">
            <button className="px-4 py-2 rounded bg-[var(--accent-dim)] text-[#0b0f14] font-semibold">
              Sign in
            </button>
          </SignInButton>
        </div>
      </Unauthenticated>
      <Authenticated>
        <BookmarksContent />
      </Authenticated>
    </>
  );
}

function BookmarksContent() {
  const events = useQuery(api.bookmarks.list);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold hover:text-[var(--accent)]">
            CENTCOM · Threat COP
          </Link>
          <span className="text-[var(--text-faint)]">/</span>
          <span className="text-[var(--text-muted)]">Bookmarks</span>
        </div>
        <UserButton />
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Your bookmarks</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Private to your account. Not shared with other operators.
        </p>
        {events === undefined && (
          <p className="text-[var(--text-muted)]">Loading…</p>
        )}
        {events && events.length === 0 && (
          <p className="text-[var(--text-muted)]">
            No bookmarks yet. Open an event from the dashboard and bookmark it.
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {events?.map((e) => (
            <li
              key={e._id}
              className="border border-[var(--border)] rounded-[var(--radius)] bg-[var(--bg-panel)] p-4"
            >
              <Link
                href={`/event/${e._id}`}
                className="font-semibold text-[var(--text)] hover:text-[var(--accent)]"
              >
                {e.headline}
              </Link>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {CATEGORY_LABELS[e.category as Category]} ·{" "}
                {SEVERITY_LABELS[e.severity as Severity]} · {e.region} ·{" "}
                {formatRelativeTime(e.occurredAt)}
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-2 line-clamp-2">
                {e.summary}
              </p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
