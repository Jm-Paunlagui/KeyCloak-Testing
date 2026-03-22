const fs = require("fs");
const path = require("path");
const https = require("https");
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const { keycloak, memoryStore } = require("./src/config/keycloak");
const authRoutes = require("./src/routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// Security & compression
app.use(helmet());
app.use(compression());

// CORS — allow the React dev server
app.use(
    cors({
        origin: [
            "https://localhost:5173",
            "https://192.168.0.193:5173",
            "https://localhost:5173/",
        ],
        credentials: true,
    }),
);

// Body parsing
app.use(express.json());

// Session (required by keycloak-connect)
app.use(
    session({
        secret: "T1zwgG701J5nPoQBflSbKDSLI8eSk13U",
        resave: false,
        saveUninitialized: false,
        store: memoryStore,
    }),
);

// Keycloak middleware
app.use(keycloak.middleware());

// Routes
app.use("/api", authRoutes);

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, "cert", "key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "cert", "cert.pem")),
};

https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`Backend running on https://localhost:${PORT}`);
});
