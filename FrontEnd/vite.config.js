import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        host: true,
        port: 5173,
        https: {
            key: fs.readFileSync(path.resolve(__dirname, "cert/key.pem")),
            cert: fs.readFileSync(path.resolve(__dirname, "cert/cert.pem")),
        },
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
