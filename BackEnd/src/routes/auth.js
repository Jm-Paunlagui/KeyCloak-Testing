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
 */
const keycloakConfig = require("../../keycloak.json");

/**
 * Base URL for every Keycloak OpenID-Connect endpoint in the configured realm.
 * @constant {string}
 */
const KC_BASE = `${keycloakConfig["auth-server-url"]}realms/${keycloakConfig.realm}/protocol/openid-connect`;

/**
 * The OAuth2 client ID registered in Keycloak.
 * @constant {string}
 */
const CLIENT_ID = keycloakConfig.resource;

/**
 * Frontend origin — where to redirect after callback.
 * Falls back to env CLIENT_BASE_URL, or builds from request if not set.
 */
const FRONTEND_URL = process.env.CLIENT_BASE_URL;

// Cookie options — httpOnly so JavaScript can't steal tokens
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: "none", // cross-origin between frontend and backend
    path: "/",
};

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
    const redirectUri = `${req.protocol}://${req.get("host")}/api/callback`;
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
// Keycloak redirects here after login. Exchanges the code for tokens,
// stores them in httpOnly cookies, then redirects back to the frontend.
router.get("/callback", async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Missing 'code' query parameter",
        });
    }

    const callbackUri = `${req.protocol}://${req.get("host")}/api/callback`;

    try {
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
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            },
        );

        const { access_token, refresh_token, expires_in, refresh_expires_in } =
            tokenResponse.data;

        // Store tokens in secure httpOnly cookies — JS can't touch these
        res.cookie("access_token", access_token, {
            ...COOKIE_OPTIONS,
            maxAge: expires_in * 1000,
        });
        res.cookie("refresh_token", refresh_token, {
            ...COOKIE_OPTIONS,
            maxAge: refresh_expires_in * 1000,
        });

        // Redirect back to frontend with a flag so it knows to check the session
        const frontendUrl =
            FRONTEND_URL ||
            req.headers.referer ||
            `${req.protocol}://${req.get("host")}`;
        res.redirect(`${frontendUrl}?backend_auth=success`);
    } catch (error) {
        const detail = error.response?.data || error.message;
        console.error("Token exchange failed:", detail);
        const frontendUrl =
            FRONTEND_URL ||
            req.headers.referer ||
            `${req.protocol}://${req.get("host")}`;
        res.redirect(`${frontendUrl}?backend_auth=error`);
    }
});

// ─── GET /api/session ─────────────────────────────────────────────────────────
// Returns the current user's data from the cookie-stored tokens.
// The frontend calls this after redirect to get the user info.
router.get("/session", async (req, res) => {
    const accessToken = req.cookies?.access_token;
    const refreshToken = req.cookies?.refresh_token;

    if (!accessToken) {
        return res.status(401).json({ authenticated: false });
    }

    try {
        // Decode the token to get claims (the requireAuth middleware validates
        // against Keycloak's JWKS, but here we also want to use the token to
        // fetch userinfo — so we validate by calling Keycloak's userinfo endpoint)
        const userInfoUrl = `${KC_BASE}/userinfo`;

        const response = await axios.get(userInfoUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        // Also decode token for roles/claims
        const base64Payload = accessToken.split(".")[1];
        const tokenPayload = JSON.parse(
            Buffer.from(base64Payload, "base64").toString("utf-8"),
        );

        res.json({
            authenticated: true,
            userInfo: response.data,
            tokenClaims: tokenPayload,
            hasRefreshToken: !!refreshToken,
        });
    } catch (error) {
        // Token might be expired — try to refresh
        if (refreshToken && error.response?.status === 401) {
            try {
                const refreshResponse = await axios.post(
                    `${KC_BASE}/token`,
                    new URLSearchParams({
                        grant_type: "refresh_token",
                        client_id: CLIENT_ID,
                        refresh_token: refreshToken,
                    }),
                    {
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                    },
                );

                const {
                    access_token,
                    refresh_token: newRefresh,
                    expires_in,
                    refresh_expires_in,
                } = refreshResponse.data;

                // Update cookies
                res.cookie("access_token", access_token, {
                    ...COOKIE_OPTIONS,
                    maxAge: expires_in * 1000,
                });
                res.cookie("refresh_token", newRefresh, {
                    ...COOKIE_OPTIONS,
                    maxAge: refresh_expires_in * 1000,
                });

                // Retry userinfo with fresh token
                const retryResponse = await axios.get(`${KC_BASE}/userinfo`, {
                    headers: { Authorization: `Bearer ${access_token}` },
                });

                const base64Payload = access_token.split(".")[1];
                const tokenPayload = JSON.parse(
                    Buffer.from(base64Payload, "base64").toString("utf-8"),
                );

                return res.json({
                    authenticated: true,
                    userInfo: retryResponse.data,
                    tokenClaims: tokenPayload,
                    hasRefreshToken: true,
                });
            } catch (refreshErr) {
                // Refresh also failed — session is truly dead
                res.clearCookie("access_token", COOKIE_OPTIONS);
                res.clearCookie("refresh_token", COOKIE_OPTIONS);
                return res.status(401).json({ authenticated: false });
            }
        }

        res.clearCookie("access_token", COOKIE_OPTIONS);
        res.clearCookie("refresh_token", COOKIE_OPTIONS);
        return res.status(401).json({ authenticated: false });
    }
});

// ─── POST /api/backend-logout ─────────────────────────────────────────────────
// Logs out the cookie-based session — revokes tokens at Keycloak and clears cookies.
router.post("/backend-logout", async (req, res) => {
    const refreshToken = req.cookies?.refresh_token;

    if (refreshToken) {
        try {
            await axios.post(
                `${KC_BASE}/logout`,
                new URLSearchParams({
                    client_id: CLIENT_ID,
                    refresh_token: refreshToken,
                }),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                },
            );
        } catch (err) {
            console.error(
                "Keycloak logout failed:",
                err.response?.data || err.message,
            );
        }
    }

    res.clearCookie("access_token", COOKIE_OPTIONS);
    res.clearCookie("refresh_token", COOKIE_OPTIONS);
    res.json({ message: "Logged out successfully" });
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
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
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
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
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
