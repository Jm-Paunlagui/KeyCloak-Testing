const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const router = express.Router();
const { requireAuth } = require("../config/keycloak");

const keycloakConfig = require("../../keycloak.json");

const KC_BASE = `${keycloakConfig["auth-server-url"]}realms/${keycloakConfig.realm}/protocol/openid-connect`;
const CLIENT_ID = keycloakConfig.resource;

// ── OAuth2 Authorization Code Flow (same as keycloak-js but server-side) ──

// Step 1: Redirect the browser to Keycloak's login page
router.get("/login", (req, res) => {
    // The caller can pass ?redirect_uri=... to control where the code comes back
    const redirectUri =
        req.query.redirect_uri ||
        `${req.protocol}://${req.get("host")}/api/callback`;

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

// Step 2: Exchange the authorization code for tokens
router.get("/callback", async (req, res) => {
    const { code, redirect_uri } = req.query;

    if (!code) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Missing 'code' query parameter",
        });
    }

    const callbackUri =
        redirect_uri || `${req.protocol}://${req.get("host")}/api/callback`;

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

        res.json(tokenResponse.data);
    } catch (error) {
        const status = error.response?.status || 502;
        const detail = error.response?.data || error.message;
        console.error("Token exchange failed:", detail);
        res.status(status).json({
            error: "Token exchange failed",
            details: detail,
        });
    }
});

// Refresh an access token
router.post("/refresh", async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Missing 'refresh_token' in request body",
        });
    }

    try {
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

// Logout — end the Keycloak session
router.post("/logout", async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Missing 'refresh_token' in request body",
        });
    }

    try {
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

// Protected route — returns the decoded access token claims
router.get("/me", requireAuth, (req, res) => {
    res.json(req.tokenPayload);
});

// Protected route — proxies to Keycloak's userinfo endpoint for full profile
router.get("/userinfo", requireAuth, async (req, res) => {
    try {
        const accessToken = req.headers.authorization.slice(7);
        const userInfoUrl = `${keycloakConfig["auth-server-url"]}realms/${keycloakConfig.realm}/protocol/openid-connect/userinfo`;

        const response = await axios.get(userInfoUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        res.json(response.data);
    } catch (error) {
        console.error("Failed to fetch userinfo:", error.message);
        res.status(502).json({
            error: "Bad Gateway",
            message: "Failed to fetch user info from Keycloak",
        });
    }
});

module.exports = router;
