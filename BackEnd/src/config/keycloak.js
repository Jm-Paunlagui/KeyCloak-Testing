const session = require("express-session");
const Keycloak = require("keycloak-connect");
const path = require("path");

const memoryStore = new session.MemoryStore();

const keycloak = new Keycloak(
    { store: memoryStore },
    path.join(__dirname, "..", "..", "keycloak.json"),
);

module.exports = { keycloak, memoryStore };
