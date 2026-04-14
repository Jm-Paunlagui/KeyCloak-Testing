/**
 * @file auth.js
 * @description Full OAuth2 Authorization Code Flow + protected resource routes.
 *
 * ─── THE BIG PICTURE ────────────────────────────────────────────────────────
 *
 * Think of this whole file like getting into a theme park:
 *
 *  1. /login      → The ticket booth hands you a voucher (authorization code URL).
 *  2. /callback   → You bring the voucher back and swap it for a real wristband
 *                   (access token + refresh token).
 *  3. /refresh    → Your wristband is about to expire; the booth swaps it for a
 *                   fresh one without you having to log in again.
 *  4. /logout     → You hand your wristband back and leave the park.
 *  5. /me         → A ride operator glances at your wristband and reads your name
 *                   off it — no extra check needed.
 *  6. /userinfo   → A ride operator calls HQ to confirm everything about you — a
 *                   bit slower but always 100% fresh from the source.
 *
 * ─── AUTH FLOW DIAGRAM ──────────────────────────────────────────────────────
 *
 *   Browser                Our API (/api)          Keycloak
 *   ───────                ──────────────          ────────
 *     │                           │                    │
 *     │── GET /login ────────▶    │                    │
 *     │◀─ { login_url } ──────    │                    │
 *     │                           │                    │
 *     │── Redirect to login_url ──────────────────────▶│
 *     │◀─ Redirect to /callback?code=XYZ ──────────────│
 *     │                           │                    │
 *     │── GET /callback?code=XYZ ─────────────────────▶│
 *     │                           │─── POST /token ───▶│
 *     │                           │◀─ { access_token,  │
 *     │                           │    refresh_token } │
 *     │◀─ { tokens } ─────────────│                    │
 *     │                           │                    │
 *     │── POST /refresh ──────▶   │                    │
 *     │                           │── POST /token ────▶│
 *     │◀─ { new tokens } ─────────│                    │
 *     │                           │                    │
 *     │── POST /logout ───────▶   │                    │
 *     │                           │── POST /logout ───▶│
 *     │◀─ { message: "ok" } ──────│                    │
 *
 * Base path (mounted in server.js): /api
 *
 * @module routes/auth
 */

const express = require("express");
const axios = require("../config/keycloakAxios");
const crypto = require("crypto");
const router = express.Router();
const { requireAuth } = require("../config/keycloak");

/**
 * Keycloak realm configuration loaded from keycloak.json.
 *
 * @type {{ realm: string, "auth-server-url": string, resource: string }}
 *
 * @example
 * {
 *   "realm": "dev",
 *   "auth-server-url": "http://localhost:8080/",
 *   "resource": "react-client"
 * }
 */
const keycloakConfig = require("../../keycloak.json");

/**
 * Base URL for every Keycloak OpenID-Connect endpoint in the configured realm.
 *
 * All the important Keycloak URLs (/auth, /token, /userinfo, /logout) live
 * under this path, so we build it once and reuse it everywhere below.
 *
 * @example "http://localhost:8080/realms/dev/protocol/openid-connect"
 *
 * @constant {string}
 */
const KC_BASE = `${keycloakConfig["auth-server-url"]}realms/${keycloakConfig.realm}/protocol/openid-connect`;

/**
 * The OAuth2 client ID registered in Keycloak (the "resource" field in keycloak.json).
 * Sent with every token-related request so Keycloak knows which application is asking.
 *
 * @constant {string}
 */
const CLIENT_ID = keycloakConfig.resource;

// ─────────────────────────────────────────────────────────────────────────────
// OAuth2 Authorization Code Flow
// ─────────────────────────────────────────────────────────────────────────────

// ─── GET /api/login ───────────────────────────────────────────────────────────
/**
 * Step 1 of the OAuth2 Authorization Code Flow.
 * Builds and returns the Keycloak login URL that the client should redirect to.
 *
 * We do NOT redirect the browser ourselves here — we return the URL as JSON so
 * the front-end (React, mobile app, etc.) can decide when and how to navigate.
 * This keeps our API stateless and reusable across different client types.
 *
 * What gets built:
 *  - `client_id`     — tells Keycloak which application is starting the login.
 *  - `response_type` — "code" means we want an authorization code back, not a
 *                      token directly (Authorization Code flow is safer than Implicit).
 *  - `scope`         — "openid" requests a standard OIDC ID token alongside the
 *                      access token.
 *  - `redirect_uri`  — where Keycloak should send the user after they log in.
 *                      Must match a URI registered in the Keycloak client settings.
 *  - `state`         — a random one-time value the client should echo back on
 *                      /callback to prove the response is not a CSRF forgery.
 *
 * @route   GET /api/login
 * @access  Public — no token required.
 *
 * @param {import('express').Request}  req                      - Incoming request.
 * @param {string}                    [req.query.redirect_uri]  - Optional override for
 *   the URI Keycloak redirects to after login. Defaults to this server's /api/callback.
 * @param {import('express').Response} res                      - Responds with login metadata.
 *
 * @returns {void} JSON with the login URL, state token, and redirect URI.
 *
 * @example
 * // Request
 * GET /api/login
 * // — or with custom redirect —
 * GET /api/login?redirect_uri=https://myapp.com/auth/callback
 *
 * // Response 200 OK
 * {
 *   "login_url": "http://localhost:8080/realms/dev/protocol/openid-connect/auth?client_id=react-client&response_type=code&scope=openid&redirect_uri=...&state=a3f9...",
 *   "state": "a3f9c2b1...",
 *   "redirect_uri": "http://localhost:5555/api/callback"
 * }
 *
 * // Recommended client-side usage (React):
 * // const { login_url, state } = await fetch('/api/login').then(r => r.json());
 * // sessionStorage.setItem('oauth_state', state); // save for CSRF check later
 * // window.location.href = login_url;             // send the browser to Keycloak
 */
router.get("/login", (req, res) => {
    // Allow the caller to override where Keycloak should send the user back
    // after a successful login. Falls back to this server's /callback endpoint.
    const redirectUri =
        req.query.redirect_uri ||
        `${req.protocol}://${req.get("host")}/api/callback`;

    // Cryptographically random state string — 16 bytes = 32 hex chars.
    // The client stores this and validates it when /callback fires to confirm
    // the response genuinely originated from our /login request (anti-CSRF).
    const state = crypto.randomBytes(16).toString("hex");

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: "code",
        scope: "openid",
        redirect_uri: redirectUri,
        state,
    });

    res.json({
        login_url: `${KC_BASE}/auth?${params}`,
        state,
        redirect_uri: redirectUri,
    });
});

// ─── GET /api/callback ────────────────────────────────────────────────────────
/**
 * Step 2 of the OAuth2 Authorization Code Flow.
 * Exchanges the short-lived authorization code for real tokens.
 *
 * After the user logs in on Keycloak's page, Keycloak redirects the browser
 * back here with a one-time `code` in the query string. That code is useless
 * on its own — it must be swapped server-to-server for actual tokens via
 * Keycloak's /token endpoint.
 *
 * Why a code instead of tokens directly?
 *   The code travels through the browser URL bar (visible, logged in history).
 *   Tokens are far more sensitive, so we keep the final exchange server-side
 *   where the browser never sees the raw tokens.
 *
 * Keycloak returns on success:
 *  - `access_token`       — short-lived JWT (minutes). Send as Bearer on every
 *                           protected API call.
 *  - `refresh_token`      — longer-lived opaque token (hours/days). Feed to
 *                           /refresh to get new access tokens without re-login.
 *  - `id_token`           — JWT with basic identity claims (name, email, etc.).
 *  - `expires_in`         — seconds until the access token expires.
 *  - `refresh_expires_in` — seconds until the refresh token expires.
 *  - `token_type`         — always "Bearer".
 *
 * @route   GET /api/callback
 * @access  Public — called automatically by Keycloak's redirect; no Bearer token needed.
 *
 * @param {import('express').Request}  req                     - Incoming request.
 * @param {string}                     req.query.code          - One-time authorization code from Keycloak. Required.
 * @param {string}                    [req.query.redirect_uri] - Must exactly match the URI sent in /login;
 *   defaults to this endpoint's own URL if omitted.
 * @param {import('express').Response} res                     - Responds with the full Keycloak token set.
 *
 * @returns {Promise<void>}
 *
 * @example
 * // Keycloak redirects here automatically — the client just needs to handle it:
 * GET /api/callback?code=eyJhbGci...&state=a3f9c2b1...&session_state=abc123
 *
 * // Response 200 OK
 * {
 *   "access_token":       "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "expires_in":         300,
 *   "refresh_expires_in": 1800,
 *   "refresh_token":      "eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIi...",
 *   "token_type":         "Bearer",
 *   "id_token":           "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "scope":              "openid profile email"
 * }
 *
 * // Response 400 Bad Request (code missing)
 * { "error": "Bad Request", "message": "Missing 'code' query parameter" }
 *
 * // Response 400 from Keycloak (code already used or expired — codes last ~60s)
 * { "error": "Token exchange failed", "details": { "error": "invalid_grant", ... } }
 *
 * // Response 502 Bad Gateway (Keycloak is unreachable)
 * { "error": "Token exchange failed", "details": "..." }
 */
router.get("/callback", async (req, res) => {
    const { code, redirect_uri } = req.query;

    if (!code) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Missing 'code' query parameter",
        });
    }

    // The redirect_uri sent here MUST exactly match the one used in /login —
    // Keycloak enforces this as a security check. If the caller does not pass
    // it explicitly, reconstruct the default value that /login would have used.
    const callbackUri =
        redirect_uri || `${req.protocol}://${req.get("host")}/api/callback`;

    try {
        // Server-to-server POST to Keycloak's /token endpoint.
        // Keycloak checks: is the code valid? unused? not expired (~60s window)?
        // If yes, it invalidates the code and returns the token set.
        const tokenResponse = await axios.post(
            `${KC_BASE}/token`,
            new URLSearchParams({
                grant_type: "authorization_code",
                client_id: CLIENT_ID,
                code,
                redirect_uri: callbackUri,
            }),
            {
                headers: {
                    // Keycloak's /token endpoint requires form-encoded body, NOT JSON.
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            },
        );

        res.json(tokenResponse.data);
    } catch (error) {
        // Preserve Keycloak's own HTTP status (e.g. 400 for an expired code)
        // rather than always sending 500, so clients can react appropriately.
        const status = error.response?.status || 502;
        const detail = error.response?.data || error.message;
        console.error("Token exchange failed:", detail);
        res.status(status).json({
            error: "Token exchange failed",
            details: detail,
        });
    }
});

// ─── POST /api/refresh ────────────────────────────────────────────────────────
/**
 * Silently refreshes an expired (or soon-to-expire) access token.
 *
 * Access tokens are intentionally short-lived (~5 min in default Keycloak config).
 * Instead of forcing the user to log in again every 5 minutes, the client holds
 * onto the refresh token and calls this endpoint to get a new access token
 * silently in the background — the user never notices.
 *
 * When should the client call this?
 *  - Reactively: an API call returns 401 → attempt a refresh → retry the call.
 *  - Proactively: read `expires_in` from /callback and schedule a refresh ~30s
 *    before expiry using setTimeout / a background worker.
 *
 * ⚠️  Refresh tokens expire too (hours or days, set in Keycloak realm settings).
 *     If the refresh token is also expired, Keycloak returns 400 "invalid_grant".
 *     Treat that as "session fully expired — redirect the user to /login."
 *
 * ⚠️  Keycloak rotates refresh tokens by default — each use issues a NEW refresh
 *     token and invalidates the old one. Always save the latest refresh_token
 *     from the response body.
 *
 * @route   POST /api/refresh
 * @access  Public — the refresh token IS the credential; no Bearer header needed.
 *
 * @param {import('express').Request}  req                    - Incoming request.
 * @param {string}                     req.body.refresh_token - Current refresh token. Required.
 * @param {import('express').Response} res                    - Responds with a fresh token set.
 *
 * @returns {Promise<void>}
 *
 * @example
 * // Request
 * POST /api/refresh
 * Content-Type: application/json
 * { "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIi..." }
 *
 * // Response 200 OK — same shape as /callback response
 * {
 *   "access_token":  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "expires_in":    300,
 *   "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIi...",
 *   "token_type":    "Bearer"
 * }
 *
 * // Response 400 Bad Request (field missing)
 * { "error": "Bad Request", "message": "Missing 'refresh_token' in request body" }
 *
 * // Response 400 from Keycloak (token expired / already rotated / revoked)
 * { "error": "Token refresh failed", "details": { "error": "invalid_grant", ... } }
 *
 * // Response 502 Bad Gateway (Keycloak unreachable)
 * { "error": "Token refresh failed", "details": "..." }
 */
router.post("/refresh", async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Missing 'refresh_token' in request body",
        });
    }

    try {
        // The "refresh_token" grant type tells Keycloak: validate this refresh
        // token, rotate it (issue a new one), and hand back a fresh access token.
        const tokenResponse = await axios.post(
            `${KC_BASE}/token`,
            new URLSearchParams({
                grant_type: "refresh_token",
                client_id: CLIENT_ID,
                refresh_token,
            }),
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            },
        );

        res.json(tokenResponse.data);
    } catch (error) {
        const status = error.response?.status || 502;
        const detail = error.response?.data || error.message;
        console.error("Token refresh failed:", detail);
        res.status(status).json({
            error: "Token refresh failed",
            details: detail,
        });
    }
});

// ─── POST /api/logout ─────────────────────────────────────────────────────────
/**
 * Ends the user's Keycloak session and permanently invalidates their tokens.
 *
 * This is NOT just "delete the token on the client side" — it calls Keycloak's
 * backchannel logout endpoint which:
 *  1. Invalidates the refresh token server-side so it can never be used again.
 *  2. Kills the Keycloak SSO session — if the user was signed into multiple apps
 *     via Single Sign-On, Keycloak can fan-out logout notifications to all of them.
 *
 * Why do we need the refresh_token to log out?
 *   Keycloak uses it to identify which session to terminate. A user can have
 *   multiple active sessions (different browsers, devices); without the token
 *   Keycloak would not know which one to kill.
 *
 * After calling this, the client should:
 *  1. Discard the access_token from memory / React state.
 *  2. Delete the refresh_token from wherever it was stored (localStorage, cookie).
 *  3. Redirect to the login page or a "you have been logged out" screen.
 *
 * @route   POST /api/logout
 * @access  Public — the refresh token IS the credential; no Bearer header needed.
 *
 * @param {import('express').Request}  req                    - Incoming request.
 * @param {string}                     req.body.refresh_token - Refresh token to revoke. Required.
 * @param {import('express').Response} res                    - Responds with a confirmation message.
 *
 * @returns {Promise<void>}
 *
 * @example
 * // Request
 * POST /api/logout
 * Content-Type: application/json
 * { "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIi..." }
 *
 * // Response 200 OK
 * { "message": "Logged out successfully" }
 *
 * // Response 400 Bad Request (field missing)
 * { "error": "Bad Request", "message": "Missing 'refresh_token' in request body" }
 *
 * // Response 502 Bad Gateway (Keycloak unreachable or rejected the revocation)
 * { "error": "Logout failed", "details": "..." }
 */
router.post("/logout", async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Missing 'refresh_token' in request body",
        });
    }

    try {
        // Keycloak's /logout endpoint expects a form-encoded body.
        // On success it returns 204 No Content — we translate that to a
        // friendly JSON message for the client.
        await axios.post(
            `${KC_BASE}/logout`,
            new URLSearchParams({
                client_id: CLIENT_ID,
                refresh_token,
            }),
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            },
        );

        res.json({ message: "Logged out successfully" });
    } catch (error) {
        const detail = error.response?.data || error.message;
        console.error("Logout failed:", detail);
        res.status(502).json({
            error: "Logout failed",
            details: detail,
        });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Protected Resource Routes  (valid Bearer token required on all routes below)
// ─────────────────────────────────────────────────────────────────────────────

// ─── GET /api/me ──────────────────────────────────────────────────────────────
/**
 * Returns the decoded claims baked inside the caller's access token.
 *
 * `requireAuth` already verified the token's signature and attached the decoded
 * payload to `req.tokenPayload`. This handler just returns that object — no
 * extra network call, no database lookup, pure in-memory speed.
 *
 * Use this for lightweight "who am I?" reads (rendering a nav bar, checking
 * roles before showing a UI section, etc.).
 *
 * Common claims:
 *  - `sub`                  — user's unique Keycloak UUID
 *  - `preferred_username`   — login name (e.g. "john.doe")
 *  - `email`                — email address
 *  - `name`                 — full display name
 *  - `realm_access.roles`   — realm-level roles granted to this user
 *  - `resource_access`      — per-client roles for fine-grained authorization
 *  - `exp`                  — Unix timestamp when this token expires
 *
 * /me vs /userinfo — quick decision guide:
 *  • Need it fast, roles are enough?          → /me
 *  • Need custom Keycloak attributes or
 *    guaranteed freshness?                    → /userinfo
 *
 * @route   GET /api/me
 * @access  Protected — requires `Authorization: Bearer <access_token>` header.
 *
 * @param {import('express').Request}  req - req.tokenPayload set by requireAuth.
 * @param {import('express').Response} res - Responds with decoded JWT claims.
 *
 * @example
 * // Request
 * GET /api/me
 * Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 * // Response 200 OK
 * {
 *   "sub": "a1b2c3d4-0000-0000-0000-000000000000",
 *   "preferred_username": "john.doe",
 *   "email": "john.doe@example.com",
 *   "realm_access": { "roles": ["user", "admin"] },
 *   "exp": 1713100000
 * }
 *
 * // Response 401 Unauthorized (missing / expired / invalid token)
 * { "error": "Unauthorized", "message": "Token is invalid or has expired." }
 */
router.get("/me", requireAuth, (req, res) => {
    res.json(req.tokenPayload);
});

// ─── GET /api/userinfo ────────────────────────────────────────────────────────
/**
 * Fetches the caller's full, canonical profile from Keycloak's /userinfo endpoint.
 *
 * Unlike /me which reads locally from the already-decoded token (snapshot at
 * login time), this route calls Keycloak in real time and says: "Give me
 * everything you know about the person who owns this token right now."
 *
 * Reasons to prefer this over /me:
 *  1. Custom user attributes (phone, department, employee ID) configured in
 *     Keycloak are often NOT mapped into the token but ARE returned here.
 *  2. Data is always live — an admin update to the user profile in Keycloak
 *     shows up immediately here; /me would still show stale data until the
 *     next token refresh.
 *  3. Standard OIDC compliance — some specs require using this endpoint rather
 *     than parsing the token directly.
 *
 * Flow:
 *  1. requireAuth verifies the token → sets req.tokenPayload.
 *  2. This handler strips the raw token string from the Authorization header.
 *  3. Calls Keycloak's /userinfo, forwarding the same Bearer token so Keycloak
 *     can validate ownership and look up the user's profile.
 *  4. Streams Keycloak's JSON response straight back to the caller.
 *
 * @route   GET /api/userinfo
 * @access  Protected — requires `Authorization: Bearer <access_token>` header.
 *
 * @param {import('express').Request}  req - req.headers.authorization must be set.
 * @param {import('express').Response} res - Proxies Keycloak's userinfo JSON.
 *
 * @returns {Promise<void>}
 *
 * @example
 * // Request
 * GET /api/userinfo
 * Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 * // Response 200 OK
 * {
 *   "sub":                "a1b2c3d4-0000-0000-0000-000000000000",
 *   "name":               "John Doe",
 *   "given_name":         "John",
 *   "family_name":        "Doe",
 *   "preferred_username": "john.doe",
 *   "email":              "john.doe@example.com",
 *   "email_verified":     true
 * }
 *
 * // Response 401 Unauthorized (missing / expired / invalid token)
 * { "error": "Unauthorized", "message": "Token is invalid or has expired." }
 *
 * // Response 502 Bad Gateway (Keycloak is down or returned an error)
 * { "error": "Bad Gateway", "message": "Failed to fetch user info from Keycloak" }
 */
router.get("/userinfo", requireAuth, async (req, res) => {
    try {
        // Strip the "Bearer " prefix to get the raw JWT string.
        const accessToken = req.headers.authorization.slice(7);

        // Construct the Keycloak userinfo URL from config so this works across
        // all environments without any hard-coded server addresses.
        const userInfoUrl =
            `${keycloakConfig["auth-server-url"]}` +
            `realms/${keycloakConfig.realm}/protocol/openid-connect/userinfo`;

        const response = await axios.get(userInfoUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        res.json(response.data);
    } catch (error) {
        // Log the real error server-side for debugging; never leak internal
        // details to the client — 502 tells them the problem is upstream.
        console.error("Failed to fetch userinfo:", error.message);
        res.status(502).json({
            error: "Bad Gateway",
            message: "Failed to fetch user info from Keycloak",
        });
    }
});

module.exports = router;