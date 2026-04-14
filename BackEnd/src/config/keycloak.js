/**
 * @file keycloak.js
 * @description Sets up the Keycloak "bodyguard" for our Express app.
 *
 * Think of Keycloak like a bouncer at a club door.
 * - The **session store** is the bouncer's clipboard — it remembers who already
 *   showed their ID so they don't have to show it again every second.
 * - The **Keycloak instance** is the actual bouncer — it checks every request
 *   and decides "are you allowed in or not?"
 * - **requireAuth** is the velvet rope you put in front of any route you want
 *   to protect. Attach it to a route and only people with a valid token get
 *   through; everyone else gets a 401 Unauthorized.
 *
 * @module config/keycloak
 */

const session = require("express-session");
const Keycloak = require("keycloak-connect");
const path = require("path");

// ─── Session Store ────────────────────────────────────────────────────────────
/**
 * In-memory store that keeps track of active sessions.
 *
 * Imagine a sticky-note pad on the bouncer's desk. Each sticky note says
 * "this person already checked in". It lives only in RAM, so it resets
 * whenever the server restarts — fine for development, but swap this out
 * for a Redis or DB-backed store in production.
 *
 * @type {session.MemoryStore}
 */
const memoryStore = new session.MemoryStore();

// ─── Keycloak Instance ────────────────────────────────────────────────────────
/**
 * The main Keycloak adapter instance.
 *
 * We hand it:
 *  1. `{ store: memoryStore }` — so it can park session data on our sticky-note
 *     pad above.
 *  2. The path to `keycloak.json` — the config file that tells it *which* realm
 *     and *which* client to talk to on the Keycloak server.
 *
 * @type {Keycloak.Keycloak}
 */
const keycloak = new Keycloak(
    { store: memoryStore },
    path.join(__dirname, "..", "..", "keycloak.json"),
);

// ─── requireAuth Middleware ───────────────────────────────────────────────────
/**
 * Express middleware that protects a route behind a valid Bearer token.
 *
 * Drop this in front of any route handler you want to lock down:
 *
 * ```js
 * router.get("/secret", requireAuth, (req, res) => { ... });
 * ```
 *
 * What it does, step by step:
 *  1. Grabs the `Authorization: Bearer <token>` header from the request.
 *  2. Sends the token to Keycloak to verify it hasn't expired or been tampered
 *     with (like a nightclub scanner checking a QR code).
 *  3. If the token is **valid** → decodes the JWT payload, attaches it to
 *     `req.tokenPayload`, then calls `next()` so the real route handler runs.
 *  4. If the token is **missing or invalid** → immediately responds with
 *     `401 Unauthorized` and a plain-English error message.
 *
 * @param {import('express').Request}  req  - Incoming HTTP request.
 * @param {import('express').Response} res  - Outgoing HTTP response.
 * @param {import('express').NextFunction} next - Passes control to the next handler.
 * @returns {void}
 */
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // No Authorization header at all → kick them out immediately.
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Unauthorized",
            message:
                "Missing or malformed Authorization header. " +
                'Expected format: "Bearer <token>".',
        });
    }

    const rawToken = authHeader.slice(7); // strip "Bearer " prefix

    // Ask Keycloak to verify the token. The adapter returns a Grant object on
    // success, or throws/calls next(err) on failure.
    keycloak
        .grantManager.obtainDirectly
        ? (() => {
              // Use the lower-level verifyToken so we can stay stateless (bearer-only).
              keycloak.grantManager.createGrant({ access_token: rawToken })
                  .then((grant) =>
                      keycloak.grantManager.validateGrant(grant),
                  )
                  .then((grant) => {
                      // Attach the decoded claims so downstream handlers can read them.
                      req.tokenPayload = grant.access_token.content;
                      next();
                  })
                  .catch(() => {
                      res.status(401).json({
                          error: "Unauthorized",
                          message: "Token is invalid or has expired.",
                      });
                  });
          })()
        : (() => {
              keycloak.grantManager.createGrant({ access_token: rawToken })
                  .then((grant) =>
                      keycloak.grantManager.validateGrant(grant),
                  )
                  .then((grant) => {
                      req.tokenPayload = grant.access_token.content;
                      next();
                  })
                  .catch(() => {
                      res.status(401).json({
                          error: "Unauthorized",
                          message: "Token is invalid or has expired.",
                      });
                  });
          })();
};

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
    /** The configured Keycloak adapter (needed by server.js for middleware). */
    keycloak,
    /** The session memory store (passed to express-session in server.js). */
    memoryStore,
    /**
     * Plug-and-play route guard. Import and use as middleware on any route
     * that requires a logged-in user.
     */
    requireAuth,
};