const https = require("https");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Load the CA certificate so Node.js trusts the internal Keycloak server
const caPath = path.join(__dirname, "../../cert/AutomotiveRootCA.crt");

const httpsAgent = fs.existsSync(caPath)
    ? new https.Agent({ ca: fs.readFileSync(caPath) })
    : undefined;

if (!httpsAgent) {
    console.warn(
        "[WARN] CA certificate not found at src/cert/AutomotiveRootCA.crt — HTTPS requests to Keycloak may fail",
    );
}

// Pre-configured axios instance for all Keycloak API calls
const keycloakAxios = axios.create({
    ...(httpsAgent && { httpsAgent }),
});

module.exports = keycloakAxios;
