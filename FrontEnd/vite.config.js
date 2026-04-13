import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { defineConfig } from "vite";

/**
 * Resolves the HTTPS config for the Vite dev server.
 * - production  → PFX cert  (calpionsweb.automotive-wan.com.p12)
 * - development → PEM pair  (localhost+3-key.pem / localhost+3.pem)
 * Falls back to HTTP (false) if the expected cert files are missing.
 */

function resolveHttpsConfig() {
    const isProd = false; // Force production mode for Vite to match backend SSL setup

    try {
        if (isProd) {
            const pfxPath = path.resolve(
                __dirname,
                "cert/calpionsweb.automotive-wan.com.p12",
            );
            if (fs.existsSync(pfxPath)) {
                console.log("[vite] HTTPS via PFX certificate (production)");
                return {
                    pfx: fs.readFileSync(pfxPath),
                    passphrase: "c@lp!0n$_2025",
                };
            }
            console.warn(
                "[vite] Production PFX not found - falling back to HTTP",
            );
        } else {
            const keyPath = path.resolve(__dirname, "cert/localhost+5-key.pem");
            const certPath = path.resolve(__dirname, "cert/localhost+5.pem");
            if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
                console.log("[vite] HTTPS via PEM key/cert pair (development)");
                return {
                    key: fs.readFileSync(keyPath),
                    cert: fs.readFileSync(certPath),
                };
            }
            console.warn(
                "[vite] Development PEM certs not found - falling back to HTTP",
            );
        }
    } catch (err) {
        console.warn(
            "[vite] Failed to load SSL certificates - falling back to HTTP:",
            err.message,
        );
    }

    return false;
}

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        host: true,
        port: 44344,
        https: resolveHttpsConfig(),
    },
    base: "/", // Important for IIS deployment
    build: {
        outDir: "dist",
        assetsDir: "assets",
        // Ensure static files are properly copied
        rollupOptions: {
            input: {
                main: "index.html",
            },
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules")) {
                        if (id.includes("react") || id.includes("react-dom")) {
                            return "vendor-react";
                        }
                        if (id.includes("react-router-dom")) {
                            return "vendor-router";
                        }
                        if (
                            id.includes("react-toastify") ||
                            id.includes("@headlessui") ||
                            id.includes("@heroicons") ||
                            id.includes("@fortawesome")
                        ) {
                            return "vendor-ui";
                        }
                        return "vendor";
                    }
                },
            },
        },
        chunkSizeWarningLimit: 1500,
        // Copy additional files if needed
        copyPublicDir: true,
    },
    // Ensure static files from public directory are copied
    publicDir: "public",
});
