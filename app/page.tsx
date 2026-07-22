"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Landing } from "@/components/Landing";
import { Dashboard } from "@/components/dashboard/Dashboard";

export default function HomePage() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center text-[var(--text-muted)]">
          Checking session…
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
