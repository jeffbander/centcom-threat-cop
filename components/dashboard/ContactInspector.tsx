"use client";

import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isSafeHttpsUrl } from "@/lib/validation";
import { useDashboard } from "./DashboardContext";

type Cam = {
  id: string;
  name: string;
  operator: string;
  distanceKm: number;
  pageUrl: string;
  stillUrl: string | null;
  note: string;
};

export function ContactInspector() {
  const { selectedContact, setContactTrack } = useDashboard();
  const inspect = useAction(api.inspect.contact);
  const [loading, setLoading] = useState(false);
  const [trackLen, setTrackLen] = useState(0);
  const [trackProvenance, setTrackProvenance] = useState("");
  const [cameras, setCameras] = useState<Cam[]>([]);
  const [cameraNote, setCameraNote] = useState("");

  useEffect(() => {
    if (!selectedContact) {
      setContactTrack(null);
      setTrackLen(0);
      setCameras([]);
      return;
    }
    const id = selectedContact.id;
    let cancelled = false;
    setLoading(true);
    void inspect({
      kind: selectedContact.kind,
      contactId: selectedContact.id,
      latitude: selectedContact.latitude,
      longitude: selectedContact.longitude,
    })
      .then((res) => {
        if (cancelled || id !== selectedContact.id) return;
        setTrackLen(res.track.length);
        setTrackProvenance(res.trackProvenance);
        setCameras(res.cameras);
        setCameraNote(res.cameraNote);
        setContactTrack(
          res.track.length > 1
            ? { contactId: id, points: res.track }
            : { contactId: id, points: res.track },
        );
      })
      .catch(() => {
        if (cancelled) return;
        setTrackProvenance("inspect failed");
        setCameras([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    selectedContact?.id,
    selectedContact?.kind,
    selectedContact?.latitude,
    selectedContact?.longitude,
    inspect,
    setContactTrack,
    selectedContact,
  ]);

  if (!selectedContact) return null;

  return (
    <div className="mt-2 border-t border-[var(--border)] pt-2 space-y-2">
      <div>
        <p className="text-[9px] font-mono uppercase tracking-wide text-[var(--text-faint)]">
          24h track
        </p>
        {loading ? (
          <p className="text-[11px] text-[var(--text-muted)]">Pulling track…</p>
        ) : (
          <p className="text-[11px] text-[var(--text)]">
            {trackLen > 1
              ? `${trackLen} positions drawn on the map.`
              : trackLen === 1
                ? "Only the current position is stored so far."
                : "No stored/live track yet."}{" "}
            <span className="text-[var(--text-faint)]">{trackProvenance}</span>
          </p>
        )}
      </div>
      <div>
        <p className="text-[9px] font-mono uppercase tracking-wide text-[var(--text-faint)]">
          Public cameras within 50 km
        </p>
        {cameras.length === 0 ? (
          <p className="text-[11px] text-[var(--text-muted)]">
            {loading
              ? "Looking up public listings…"
              : "No public OSM / NPS / USGS / NOAA webcam listed within 50 km."}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5 mt-1">
            {cameras.map((c) => (
              <li key={c.id} className="text-[11px]">
                <span className="font-medium text-[var(--text)]">{c.name}</span>
                <span className="text-[var(--text-faint)]">
                  {" "}
                  · {c.distanceKm.toFixed(0)} km · {c.operator}
                </span>
                {isSafeHttpsUrl(c.pageUrl) ? (
                  <a
                    href={c.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[var(--accent)] hover:underline truncate"
                  >
                    Open public camera page
                  </a>
                ) : null}
                <span className="block text-[10px] text-[var(--text-faint)]">
                  {c.note}
                </span>
              </li>
            ))}
          </ul>
        )}
        {cameraNote ? (
          <p className="mt-1 text-[10px] text-[var(--text-faint)]">{cameraNote}</p>
        ) : null}
      </div>
    </div>
  );
}
