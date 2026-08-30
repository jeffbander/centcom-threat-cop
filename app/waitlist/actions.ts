"use server";

export type AccessRequestState = {
  ok: boolean;
  message: string;
};

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function submitAccessRequest(
  _prev: AccessRequestState | null,
  formData: FormData,
): Promise<AccessRequestState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const attested = formData.get("attested") === "on";

  if (!attested) {
    return {
      ok: false,
      message: "You must certify the personnel security attestation before submitting.",
    };
  }
  if (!isEmail(email)) {
    return { ok: false, message: "Enter a valid work email address." };
  }

  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) {
    return { ok: false, message: "Access request service is not configured." };
  }

  try {
    const res = await fetch("https://api.clerk.com/v1/waitlist_entries", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email_address: email, notify: true }),
    });
    const body = await res.text();
    if (res.ok) {
      return {
        ok: true,
        message:
          "Request received. You will receive email only after an administrator approves you in Clerk. Do not attempt to sign in until then.",
      };
    }
    if (res.status === 409 || /already|exists|duplicate/i.test(body)) {
      return {
        ok: true,
        message:
          "This email is already on the waitlist. An administrator must still approve it in Clerk before you can sign in.",
      };
    }
    return {
      ok: false,
      message:
        "Could not record this request. In the Clerk Dashboard, set Access mode to Waitlist, then try again.",
    };
  } catch {
    return { ok: false, message: "Could not reach the access request service." };
  }
}
