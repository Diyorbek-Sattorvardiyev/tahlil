(function () {
    const DEFAULT_BASES = ["http://127.0.0.1:5001", "http://127.0.0.1:5000"];

    function getStoredBase() {
        return localStorage.getItem("uzsentiment_api_base");
    }

    async function resolveApiBase() {
        const stored = getStoredBase();
        const bases = stored ? [stored, ...DEFAULT_BASES.filter((base) => base !== stored)] : DEFAULT_BASES;

        for (const base of bases) {
            try {
                const response = await fetch(`${base}/api/health`);
                if (response.ok) {
                    localStorage.setItem("uzsentiment_api_base", base);
                    return base;
                }
            } catch (_) {
                // Try next local backend port.
            }
        }

        return stored || DEFAULT_BASES[0];
    }

    function getToken() {
        return localStorage.getItem("uzsentiment_token");
    }

    function setSession(payload) {
        localStorage.setItem("uzsentiment_token", payload.token);
        localStorage.setItem("uzsentiment_user", JSON.stringify(payload.user));
    }

    function clearSession() {
        localStorage.removeItem("uzsentiment_token");
        localStorage.removeItem("uzsentiment_user");
    }

    async function request(path, options = {}) {
        const base = await resolveApiBase();
        const isFormData = options.body instanceof FormData;
        const headers = {
            ...(isFormData ? {} : { "Content-Type": "application/json" }),
            ...(options.headers || {}),
        };
        const token = getToken();
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${base}${path}`, {
            ...options,
            headers,
        });
        const payload = await response.json().catch(() => ({
            success: false,
            message: "Serverdan noto'g'ri javob qaytdi",
        }));

        if (!response.ok || payload.success === false) {
            throw new Error(payload.message || "So'rov bajarilmadi");
        }

        return payload.data;
    }

    function requireAuth() {
        if (!getToken()) {
            window.location.href = "login.html";
            return false;
        }
        return true;
    }

    window.UzSentimentAPI = {
        resolveApiBase,
        request,
        getToken,
        setSession,
        clearSession,
        requireAuth,
    };
})();
