const jwt = require("jsonwebtoken");
const axios = require("axios");
const { createPublicKey } = require("crypto");

const keycloakConfig = require("../../keycloak.json");

const JWKS_URL = `${keycloakConfig["auth-server-url"]}realms/${keycloakConfig.realm}/protocol/openid-connect/certs`;

// JWKS cache — refreshed every 10 minutes
let cachedKeys = null;
let keysFetchedAt = 0;
const JWKS_CACHE_TTL = 10 * 60 * 1000;

async function getJwks() {
    const now = Date.now();
    if (cachedKeys && now - keysFetchedAt < JWKS_CACHE_TTL) {
        return cachedKeys;
    }
    const { data } = await axios.get(JWKS_URL);
    cachedKeys = data.keys;
    keysFetchedAt = now;
    return cachedKeys;
}

function jwkToPem(jwk) {
    return createPublicKey({ key: jwk, format: "jwk" }).export({
        type: "spki",
        format: "pem",
    });
}

async function verifyToken(token) {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) {
        throw new Error("Invalid token format");
    }

    const keys = await getJwks();
    const matchingKey = keys.find((k) => k.kid === decoded.header.kid);
    if (!matchingKey) {
        // kid not in cache — try a forced refresh once
        cachedKeys = null;
        const freshKeys = await getJwks();
        const retryKey = freshKeys.find((k) => k.kid === decoded.header.kid);
        if (!retryKey)
            throw new Error("No matching public key found for token");
        return jwt.verify(token, jwkToPem(retryKey), { algorithms: ["RS256"] });
    }

    return jwt.verify(token, jwkToPem(matchingKey), { algorithms: ["RS256"] });
}

/**
 * Express middleware — validates the Bearer token and attaches the decoded
 * payload to `req.tokenPayload`. Returns 401 JSON on failure (no redirects).
 */
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Unauthorized",
            message: "Missing or invalid Authorization header",
        });
    }

    const token = authHeader.slice(7);

    verifyToken(token)
        .then((payload) => {
            req.tokenPayload = payload;
            next();
        })
        .catch((err) => {
            res.status(401).json({
                error: "Unauthorized",
                message: "Invalid or expired token",
                details: err.message,
            });
        });
}

module.exports = { requireAuth, verifyToken };
