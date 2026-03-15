const express = require("express");
const axios = require("axios");
const router = express.Router();
const { keycloak } = require("../config/keycloak");

// Protected route — returns the decoded access token claims
router.get("/me", keycloak.protect(), (req, res) => {
    const tokenContent = req.kauth.grant.access_token.content;
    res.json(tokenContent);
});

// Protected route — proxies to Keycloak's userinfo endpoint for full profile
router.get("/userinfo", keycloak.protect(), async (req, res) => {
    try {
        const accessToken = req.kauth.grant.access_token.token;
        const keycloakConfig = require("../../keycloak.json");
        const userInfoUrl = `${keycloakConfig["auth-server-url"]}realms/${keycloakConfig.realm}/protocol/openid-connect/userinfo`;

        const response = await axios.get(userInfoUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        res.json(response.data);
    } catch (error) {
        console.error("Failed to fetch userinfo:", error.message);
        res.status(502).json({
            error: "Failed to fetch user info from Keycloak",
        });
    }
});

module.exports = router;
