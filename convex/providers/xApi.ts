"use node";

/**
 * X API v2 client (app-only bearer).
 * Credentials: set X_BEARER_TOKEN on the Convex deployment (never NEXT_PUBLIC_*).
 */

const BASE = "https://api.x.com/2";
const TIMEOUT_MS = 12_000;

export type XApiPost = {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
  };
  author_id?: string;
};

export type XApiUser = {
  id: string;
  name: string;
  username: string;
};

function bearer(): string {
  const t = process.env.X_BEARER_TOKEN ?? process.env.TWITTER_BEARER_TOKEN;
  if (!t) {
    throw new Error(
      "X_BEARER_TOKEN not configured on Convex. Add an X API bearer token to enable OSINT account feeds.",
    );
  }
  return t;
}

async function xGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${bearer()}`,
        "User-Agent": "GlobalSituationMonitor/1.0 (MSWlab OSINT feed)",
      },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`X API ${res.status}: ${text.slice(0, 280)}`);
    }
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function isXApiConfigured(): boolean {
  return Boolean(process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN);
}

export async function lookupUserByUsername(
  username: string,
): Promise<XApiUser | null> {
  const data = await xGet<{ data?: XApiUser }>(
    `/users/by/username/${encodeURIComponent(username)}`,
    { "user.fields": "name,username" },
  );
  return data.data ?? null;
}

export async function fetchUserTimeline(
  userId: string,
  maxResults = 20,
): Promise<XApiPost[]> {
  const data = await xGet<{ data?: XApiPost[] }>(`/users/${userId}/tweets`, {
    max_results: String(Math.min(100, Math.max(5, maxResults))),
    "tweet.fields": "created_at,public_metrics,author_id",
    exclude: "replies",
  });
  return data.data ?? [];
}
