require("dotenv").config();
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const express = require("express");

const logger = {
    info: (msg) => console.log(`[INFO]  ${new Date().toISOString()} - ${msg}`),
    warn: (msg, meta) =>
        console.warn(
            `[WARN]  ${new Date().toISOString()} - ${msg}`,
            meta ? JSON.stringify(meta) : "",
        ),
    debug: (msg) =>
        console.debug(`[DEBUG] ${new Date().toISOString()} - ${msg}`),
};
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const authRoutes = require("./src/routes/auth");

const app = express();
const PORT = process.env.PORT || 5555;
const HOST = process.env.HOST || "0.0.0.0";

// Security & compression
app.use(helmet());
app.use(compression());

// Enhanced CORS configuration for network access with CSRF support and WFH compatibility
const corsOptions = {
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Client-Username",
        "X-Client-Id",
        "X-CSRF-Token", // Allow CSRF token header
        "X-Requested-With",
        "X-Request-Id", // Allow request ID tracking header
        "Accept",
        "Accept-Encoding",
        "Accept-Language",
        "Cache-Control",
        "Connection",
        "Host",
        "Origin",
        "Pragma",
        "Referer",
        "User-Agent",
    ],
    exposedHeaders: [
        "X-CSRF-Token", // Expose CSRF token in response headers
        "X-Request-Id", // Expose request ID for tracking
        "Content-Length",
        "Content-Type",
        "Content-Disposition",
        "X-Generation-Time",
        "X-Period-Type",
        "X-Months-Count",
        "X-File-Size",
        "X-Cache-Status",
    ],
    credentials: true, // Allow credentials (required for CSRF cookies)
    optionsSuccessStatus: 200, // Support legacy browsers
    maxAge: 86400, // Cache preflight requests for 24 hours
    preflightContinue: false,
    // Enhanced support for different network environments
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.CLIENT_BASE_URL,
            /^https?:\/\/localhost:\d+$/,
            /^https?:\/\/127\.0\.0\.1:\d+$/,
            /^https?:\/\/192\.168\.\d+\.\d+:\d+$/,
            /^https?:\/\/10\.\d+\.\d+\.\d+:\d+$/,
            /^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/,
            /^https?:\/\/.*\.local:\d+$/,
            /^https?:\/\/.*\.lan:\d+$/,
            /^https?:\/\/.*\.corp(\..*)?$/i,
            /^https?:\/\/.*\.vpn(\..*)?$/i,
            /^https?:\/\/.*\.internal(\..*)?$/i,
            "https://192.168.225.120:5555",
            "https://calpionsweb.automotive-wan.com:44344",
        ].filter(Boolean);

        // Allow requests with no origin (like mobile apps, desktop apps, Postman, etc.)
        if (!origin) {
            logger.debug("CORS: Request with no origin allowed");
            return callback(null, true);
        }

        // Check against allowed origins
        const isAllowed = allowedOrigins.some((allowedOrigin) => {
            if (typeof allowedOrigin === "string") {
                return origin === allowedOrigin;
            } else if (allowedOrigin instanceof RegExp) {
                return allowedOrigin.test(origin);
            }
            return false;
        });

        if (isAllowed) {
            logger.debug(`CORS: Origin ${origin} allowed`);
            callback(null, true);
        } else {
            logger.warn(`CORS: Origin ${origin} blocked`);
            callback(new Error("Not allowed by CORS"), false);
        }
    },
};

// CORS — allow the React dev server
app.use(cors(corsOptions));

// Body parsing
app.use(express.json());

// Routes
app.use("/api", authRoutes);

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Server initialization with SSL support
// - production  → PFX cert  (calpionsweb.automotive-wan.com.p12)
// - development → PEM pair  (localhost+3-key.pem / localhost+3.pem)
let server;
let protocol = "http";
const isProd = process.env.NODE_ENV === "production";

try {
    if (isProd) {
        const pfxPath = path.join(
            __dirname,
            "cert",
            "calpionsweb.automotive-wan.com.p12",
        );
        if (fs.existsSync(pfxPath)) {
            const sslOptions = {
                pfx: fs.readFileSync(pfxPath),
                passphrase: process.env.SSL_PASSPHRASE,
            };
            server = https.createServer(sslOptions, app);
            protocol = "https";
            logger.info(
                "SSL certificates loaded successfully - HTTPS enabled (production)",
            );
        } else {
            logger.warn("Production PFX cert not found - falling back to HTTP");
            server = http.createServer(app);
        }
    } else {
        const keyPath = path.join(__dirname, "cert", "localhost+5-key.pem");
        const certPath = path.join(__dirname, "cert", "localhost+5.pem");
        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
            const sslOptions = {
                key: fs.readFileSync(keyPath),
                cert: fs.readFileSync(certPath),
            };
            server = https.createServer(sslOptions, app);
            protocol = "https";
            logger.info(
                "SSL certificates loaded successfully - HTTPS enabled (development)",
            );
        } else {
            logger.warn(
                "Development PEM certs not found - falling back to HTTP",
            );
            server = http.createServer(app);
        }
    }
} catch (err) {
    logger.warn("Failed to load SSL certificates - falling back to HTTP", {
        error: err.message,
    });
    server = http.createServer(app);
}

server.listen(PORT, HOST, () => {
    logger.info(`Backend running on ${protocol}://${HOST}:${PORT}`);
});
