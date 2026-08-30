"use client";

export function ClassificationStrip({
  position,
}: {
  position: "top" | "bottom";
}) {
  return (
    <div
      className={`gsm-class-strip ${
        position === "top" ? "border-b" : "border-t"
      }`}
      role="note"
    >
      <span>UNCLASSIFIED</span>
      <span className="opacity-50">//</span>
      <span>FOR OFFICIAL USE ONLY</span>
      <span className="hidden sm:inline opacity-60 ml-auto">
        CUI // REL TO PARTNERS
      </span>
    </div>
  );
}
