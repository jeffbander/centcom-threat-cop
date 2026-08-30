"use client";

import { use } from "react";
import Link from "next/link";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  type Category,
  type Severity,
} from "@/lib/constants";
import { formatAbsolute, formatRelativeTime } from "@/lib/format";
import { isSafeHttpsUrl } from "@/lib/validation";
import { trackProductEvent } from "@/lib/analytics";

export default function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center text-[var(--text-muted)]">
          Checking session…
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <p className="text-[var(--text-muted)]">
            Sign in to view this event.
          </p>
          <SignInButton mode="modal">
            <button className="px-4 py-2 rounded bg-[var(--accent-dim)] text-[#0b0f14] font-semibold">
              Sign in
            </button>
          </SignInButton>
        </div>
      </Unauthenticated>
      <Authenticated>
        <EventContent eventId={eventId} />
      </Authenticated>
    </>
  );
}

function EventContent({ eventId }: { eventId: string }) {
  // Validate Convex id shape loosely; invalid ids return null from query.
  const id = eventId as Id<"events">;
  const detail = useQuery(api.events.getById, { eventId: id });
  const toggleBookmark = useMutation(api.bookmarks.toggle);
  const track = useMutation(api.analytics.track);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="font-semibold hover:text-[var(--accent)] shrink-0">
            CENTCOM · Threat COP
          </Link>
          <span className="text-[var(--text-faint)]">/</span>
          <span className="text-[var(--text-muted)] truncate">Event</span>
        </div>
        <UserButton />
      </header>
      <main className="flex-1 max-w-2xl w-full mx-auto p-6">
        {detail === undefined && (
          <p className="text-[var(--text-muted)]">Loading event…</p>
        )}
        {detail === null && (
          <div role="alert" className="text-[var(--critical)]">
            <h1 className="text-xl font-bold">Event not found</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              This link may be invalid, or the event is no longer available.
            </p>
            <Link href="/" className="inline-block mt-4 text-[var(--accent)] hover:underline">
              Back to dashboard
            </Link>
          </div>
        )}
        {detail && (
          <article className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-balance">{detail.headline}</h1>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 rounded border border-[var(--border)]">
                {CATEGORY_LABELS[detail.category as Category]}
              </span>
              <span className={`px-2 py-0.5 rounded border sev-${detail.severity}`}>
                {SEVERITY_LABELS[detail.severity as Severity]}
              </span>

            </div>
            <p className="text-sm text-[var(--text)]">{detail.summary}</p>

            <p className="text-sm text-[var(--text-muted)]">
              {detail.region} · {formatAbsolute(detail.occurredAt)} (
              {formatRelativeTime(detail.occurredAt)})
            </p>
            <p className="text-sm text-[var(--text-muted)]">{detail.rankExplanation}</p>
            <section>
              <h2 className="text-sm font-semibold mb-2">Sources</h2>
              <ul className="flex flex-col gap-2">
                {detail.sources.map((s) => (
                  <li key={s._id} className="text-sm border border-[var(--border)] rounded p-3">
                    <p className="font-medium">{s.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {s.publisher} · {s.verificationStatus}
                    </p>
                    {isSafeHttpsUrl(s.sourceUrl) ? (
                      <a
                        href={s.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent)] text-xs break-all hover:underline"
                        onClick={() => {
                          trackProductEvent({ name: "source_link_followed" });
                          void track({ name: "source_link_followed" });
                        }}
                      >
                        {s.sourceUrl}
                      </a>
                    ) : (
                      <span className="text-xs text-[var(--text-faint)]">
                        Link unavailable
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
            <button
              type="button"
              className="self-start px-3 py-1.5 text-sm rounded border border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
              onClick={async () => {
                await toggleBookmark({ eventId: detail._id });
                trackProductEvent({ name: "event_bookmarked" });
                void track({ name: "event_bookmarked" });
              }}
            >
              {detail.bookmarked ? "Remove bookmark" : "Bookmark"}
            </button>
          </article>
        )}
      </main>
    </div>
  );
}
