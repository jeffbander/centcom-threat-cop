"use client";

export default function CopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#050a12] px-6 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#22c55e]">
        UNCLASSIFIED // FOR OFFICIAL USE ONLY
      </p>
      <h1 className="text-lg font-semibold text-[#e8eef6]">
        COP session interrupted
      </h1>
      <p className="max-w-md text-sm text-[#94a3b8]">
        {error.message || "A console error halted the operating picture."} Sign
        in again if the session dropped, then reload.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-3 py-1.5 rounded border border-[#334155] text-[#e8eef6] hover:bg-[#1a2330] font-mono text-sm"
      >
        Re-establish link
      </button>
    </div>
  );
}
