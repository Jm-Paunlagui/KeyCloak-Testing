import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
    url: "https://keycloak.cb.prod.e2c.int.automotive-wan.com/auth/",
    realm: "default",
    clientId: "reactjs",
});

// Singleton init promise — guarantees init is only called once
let initPromise = null;

export function initKeycloak() {
    if (!initPromise) {
        initPromise = keycloak
            .init({ checkLoginIframe: false })
            .catch((err) => {
                // Reset so a retry is possible
                initPromise = null;
                // Clear stale auth params from URL so we don't keep replaying a bad code
                const url = new URL(window.location.href);
                url.searchParams.delete("code");
                url.searchParams.delete("session_state");
                url.searchParams.delete("iss");
                window.history.replaceState({}, "", url.pathname);
                throw err;
            });
    }
    return initPromise;
}

export default keycloak;
