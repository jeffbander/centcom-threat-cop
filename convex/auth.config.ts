import { AuthConfig } from "convex/server";

/**
 * Clerk JWT template must be named "convex".
 * Set CLERK_JWT_ISSUER_DOMAIN on the Convex deployment to your Clerk Frontend API URL
 * (e.g. https://your-app.clerk.accounts.dev).
 *
 * Until set, use an empty providers list so local schema push still works;
 * authenticated Convex calls require a real issuer.
 */
const domain = process.env.CLERK_JWT_ISSUER_DOMAIN;

export default {
  providers: domain
    ? [
        {
          domain,
          applicationID: "convex",
        },
      ]
    : [],
} satisfies AuthConfig;
