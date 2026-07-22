"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Landing } from "@/components/Landing";
import { Dashboard } from "@/components/dashboard/Dashboard";

/**
 * Home: secure government-style login portal when signed out.
 * Authenticated users enter the Threat COP directly.
 */
export default function HomePage() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-[#050a12] text-[#c9a227] font-mono text-sm uppercase tracking-[0.2em]">
          Establishing secure session…
        </div>
      </AuthLoading>
      <Unauthenticated>
        <Landing />
      </Unauthenticated>
      <Authenticated>
        <Dashboard />
      </Authenticated>
    </>
  );
}
