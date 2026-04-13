const express = require("express");
const axios = require("axios");
const router = express.Router();
const { requireAuth } = require("../config/keycloak");

const keycloakConfig = require("../../keycloak.json");

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
