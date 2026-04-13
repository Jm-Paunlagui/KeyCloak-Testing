import { useCallback, useEffect, useState } from "react";
import "./assets/styles/index.css";
import {
    BASE_COLOR_BG,
    BASE_COLOR_TEXT,
    DANGER_BUTTON,
    GRADIENT_COLOR_BG,
    MAIN_BUTTON,
    MAIN_FOREGROUND_COLOR_TEXT,
    MAIN_OVERLAY_COLOR_TEXT,
    STANDARD_BORDER,
    SUBTITLE_COLOR_TEXT,
    TITLE_COLOR_TEXT,
} from "./assets/styles/pre-set-styles.jsx";
import keycloak, { initKeycloak } from "./services/keycloak";

const API_BASE = import.meta.env.VITE_CLIENT_BASE_URL;

function App() {
    const [authenticated, setAuthenticated] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [tokenInfo, setTokenInfo] = useState(null);
    const [backendUserInfo, setBackendUserInfo] = useState(null);
    const [activeTab, setActiveTab] = useState("profile");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initKeycloak()
            .then((auth) => {
                setAuthenticated(auth);
                setInitialized(true);
                setLoading(false);

                if (auth) {
                    loadUserData();
                }
            })
            .catch((err) => {
                console.error("Keycloak init failed", err);
                setAuthenticated(false);
                setLoading(false);
                setInitialized(true);
            });
    }, []);

    // Optional, 
    const loadUserData = useCallback(async () => {
        try {
            // Token claims
            setTokenInfo(keycloak.tokenParsed);

            // User profile from Keycloak
            const profile = await keycloak.loadUserProfile();
            setUserProfile(profile);

            // Fetch extended info from backend
            const res = await fetch(`${API_BASE}/me`, {
                headers: { Authorization: `Bearer ${keycloak.token}` },
            });
            if (res.ok) {
                setBackendUserInfo(await res.json());
            }
        } catch (err) {
            console.error("Failed to load user data:", err);
        }
    }, []);

    const handleLogin = () => {
        keycloak.login().catch((err) => {
            console.error("Keycloak login failed", err);
        });
    };

    const handleLogout = () => {
        keycloak.logout({ redirectUri: window.location.origin });
    };

    const handleAccountManagement = () => {
        keycloak.accountManagement();
    };

    if (loading || !initialized) {
        return (
            <div
                className={`${BASE_COLOR_BG} min-h-screen flex items-center justify-center`}
            >
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#FF4208] border-t-transparent rounded-full animate-spin" />
                    <p className={`${SUBTITLE_COLOR_TEXT} text-lg`}>
                        Connecting to Keycloak...
                    </p>
                </div>
            </div>
        );
    }

    if (!authenticated) {
        return (
            <div
                className={`${BASE_COLOR_BG} min-h-screen flex items-center justify-center p-4`}
            >
                <div className="max-w-md w-full text-center space-y-8">
                    <div
                        className={`${GRADIENT_COLOR_BG} rounded-2xl p-8 shadow-2xl`}
                    >
                        <h1
                            className={`${MAIN_OVERLAY_COLOR_TEXT} text-3xl mb-2`}
                        >
                            Keycloak Auth
                        </h1>
                        <p className="text-white/80 font-aumovio">
                            Sign in to view your account details
                        </p>
                    </div>
                    <button
                        onClick={handleLogin}
                        className={`${MAIN_BUTTON} w-full py-3 px-6 text-lg rounded-xl`}
                    >
                        Sign In with Keycloak
                    </button>
                </div>
            </div>
        );
    }

    // --- Authenticated view ---
    const tabs = [
        { key: "profile", label: "Profile" },
        { key: "token", label: "Token Claims" },
        { key: "roles", label: "Roles & Access" },
    ];

    return (
        <div className={`${BASE_COLOR_BG} min-h-screen flex flex-col`}>
            {/* Header */}
            <header
                className={`${GRADIENT_COLOR_BG} px-6 py-4 flex items-center justify-between shadow-lg`}
            >
                <h1 className={`${MAIN_OVERLAY_COLOR_TEXT} text-xl`}>
                    Keycloak Dashboard
                </h1>
                <div className="flex items-center gap-3">
                    <span className="text-white/90 font-aumovio text-sm hidden sm:inline">
                        {keycloak.tokenParsed?.preferred_username}
                    </span>
                    <button
                        onClick={handleAccountManagement}
                        className={`bg-white/20 hover:bg-white/30 text-white font-aumovio-bold text-sm px-4 py-2 rounded-lg transition-all duration-300`}
                    >
                        Manage Account
                    </button>
                    <button
                        onClick={handleLogout}
                        className={`${DANGER_BUTTON} text-sm px-4 py-2`}
                    >
                        Sign Out
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
                {/* Welcome card */}
                <div className={`${STANDARD_BORDER} bg-white rounded-xl p-6`}>
                    <h2 className={`${TITLE_COLOR_TEXT} text-2xl mb-1`}>
                        Welcome,{" "}
                        {userProfile?.firstName ||
                            keycloak.tokenParsed?.preferred_username}
                    </h2>
                    <p className={`${SUBTITLE_COLOR_TEXT}`}>
                        Signed in as{" "}
                        <span className={`${MAIN_FOREGROUND_COLOR_TEXT}`}>
                            {keycloak.tokenParsed?.email}
                        </span>
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 rounded-lg font-aumovio-bold text-sm transition-all duration-300 ${
                                activeTab === tab.key
                                    ? "bg-[#FF4208] text-white shadow-lg shadow-[#FF4208]/25"
                                    : "bg-[#FF4208]/10 text-[#FF4208] hover:bg-[#FF4208]/20"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                {activeTab === "profile" && (
                    <ProfileTab
                        userProfile={userProfile}
                        tokenInfo={tokenInfo}
                    />
                )}
                {activeTab === "token" && (
                    <TokenTab
                        tokenInfo={tokenInfo}
                        backendUserInfo={backendUserInfo}
                    />
                )}
                {activeTab === "roles" && <RolesTab tokenInfo={tokenInfo} />}
            </main>
        </div>
    );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────
function ProfileTab({ userProfile, tokenInfo }) {
    const fields = [
        { label: "Username", value: tokenInfo?.preferred_username },
        { label: "Email", value: tokenInfo?.email },
        {
            label: "Email Verified",
            value: tokenInfo?.email_verified ? "Yes" : "No",
        },
        { label: "First Name", value: userProfile?.firstName },
        { label: "Last Name", value: userProfile?.lastName },
        { label: "User ID (sub)", value: tokenInfo?.sub },
        { label: "Realm", value: tokenInfo?.iss?.split("/").pop() },
        { label: "Session ID", value: tokenInfo?.sid },
        {
            label: "Token Issued At",
            value: tokenInfo?.iat
                ? new Date(tokenInfo.iat * 1000).toLocaleString()
                : "-",
        },
        {
            label: "Token Expires At",
            value: tokenInfo?.exp
                ? new Date(tokenInfo.exp * 1000).toLocaleString()
                : "-",
        },
        {
            label: "Auth Time",
            value: tokenInfo?.auth_time
                ? new Date(tokenInfo.auth_time * 1000).toLocaleString()
                : "-",
        },
        {
            label: "Allowed Origins",
            value: tokenInfo?.["allowed-origins"]?.join(", ") || "-",
        },
        { label: "Scope", value: tokenInfo?.scope },
    ];

    return (
        <div
            className={`${STANDARD_BORDER} bg-white rounded-xl overflow-hidden`}
        >
            <div className="px-6 py-4 border-b border-[#787878]/20">
                <h3 className={`${TITLE_COLOR_TEXT} text-lg`}>User Profile</h3>
            </div>
            <div className="divide-y divide-[#787878]/10">
                {fields.map((f, i) => (
                    <div
                        key={i}
                        className="px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-1"
                    >
                        <span className="font-aumovio-bold text-sm text-[#000000]/60 sm:w-48 shrink-0">
                            {f.label}
                        </span>
                        <span
                            className={`${BASE_COLOR_TEXT} text-sm break-all`}
                        >
                            {f.value || "-"}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Token Tab ───────────────────────────────────────────────────────────────
function TokenTab({ tokenInfo, backendUserInfo }) {
    return (
        <div className="space-y-4">
            <JsonCard title="Decoded Access Token" data={tokenInfo} />
            {backendUserInfo && (
                <JsonCard
                    title="Backend /api/me Response"
                    data={backendUserInfo}
                />
            )}
        </div>
    );
}

// ─── Roles Tab ───────────────────────────────────────────────────────────────
function RolesTab({ tokenInfo }) {
    const realmRoles = tokenInfo?.realm_access?.roles || [];
    const resourceAccess = tokenInfo?.resource_access || {};

    return (
        <div className="space-y-4">
            {/* Realm roles */}
            <div
                className={`${STANDARD_BORDER} bg-white rounded-xl overflow-hidden`}
            >
                <div className="px-6 py-4 border-b border-[#787878]/20">
                    <h3 className={`${TITLE_COLOR_TEXT} text-lg`}>
                        Realm Roles
                    </h3>
                </div>
                <div className="px-6 py-4 flex flex-wrap gap-2">
                    {realmRoles.length > 0 ? (
                        realmRoles.map((role) => (
                            <span
                                key={role}
                                className="font-aumovio-bold text-xs px-3 py-1.5 rounded-full bg-[#4827AF]/10 text-[#4827AF] border border-[#4827AF]/20"
                            >
                                {role}
                            </span>
                        ))
                    ) : (
                        <p className={`${SUBTITLE_COLOR_TEXT} text-sm`}>
                            No realm roles assigned
                        </p>
                    )}
                </div>
            </div>

            {/* Client roles */}
            {Object.keys(resourceAccess).map((client) => (
                <div
                    key={client}
                    className={`${STANDARD_BORDER} bg-white rounded-xl overflow-hidden`}
                >
                    <div className="px-6 py-4 border-b border-[#787878]/20">
                        <h3 className={`${TITLE_COLOR_TEXT} text-lg`}>
                            Client: {client}
                        </h3>
                    </div>
                    <div className="px-6 py-4 flex flex-wrap gap-2">
                        {resourceAccess[client].roles.map((role) => (
                            <span
                                key={role}
                                className="font-aumovio-bold text-xs px-3 py-1.5 rounded-full bg-[#FF4208]/10 text-[#FF4208] border border-[#FF4208]/20"
                            >
                                {role}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Reusable JSON display card ──────────────────────────────────────────────
function JsonCard({ title, data }) {
    return (
        <div
            className={`${STANDARD_BORDER} bg-white rounded-xl overflow-hidden`}
        >
            <div className="px-6 py-4 border-b border-[#787878]/20">
                <h3 className={`${TITLE_COLOR_TEXT} text-lg`}>{title}</h3>
            </div>
            <pre className="px-6 py-4 text-xs text-[#000000]/75 overflow-x-auto font-mono leading-relaxed">
                {JSON.stringify(data, null, 2)}
            </pre>
        </div>
    );
}

export default App;
