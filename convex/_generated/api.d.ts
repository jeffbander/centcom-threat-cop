/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as bookmarks from "../bookmarks.js";
import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as ingestion from "../ingestion.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_geo from "../lib/geo.js";
import type * as lib_normalize from "../lib/normalize.js";
import type * as lib_priority from "../lib/priority.js";
import type * as lib_validation from "../lib/validation.js";
import type * as lib_xSignal from "../lib/xSignal.js";
import type * as preferences from "../preferences.js";
import type * as providers_fetchOpenSources from "../providers/fetchOpenSources.js";
import type * as providers_openSources from "../providers/openSources.js";
import type * as providers_synthetic from "../providers/synthetic.js";
import type * as providers_xApi from "../providers/xApi.js";
import type * as providers_xFeedPoll from "../providers/xFeedPoll.js";
import type * as users from "../users.js";
import type * as xFeed from "../xFeed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  bookmarks: typeof bookmarks;
  crons: typeof crons;
  events: typeof events;
  ingestion: typeof ingestion;
  "lib/auth": typeof lib_auth;
  "lib/constants": typeof lib_constants;
  "lib/geo": typeof lib_geo;
  "lib/normalize": typeof lib_normalize;
  "lib/priority": typeof lib_priority;
  "lib/validation": typeof lib_validation;
  "lib/xSignal": typeof lib_xSignal;
  preferences: typeof preferences;
  "providers/fetchOpenSources": typeof providers_fetchOpenSources;
  "providers/openSources": typeof providers_openSources;
  "providers/synthetic": typeof providers_synthetic;
  "providers/xApi": typeof providers_xApi;
  "providers/xFeedPoll": typeof providers_xFeedPoll;
  users: typeof users;
  xFeed: typeof xFeed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
