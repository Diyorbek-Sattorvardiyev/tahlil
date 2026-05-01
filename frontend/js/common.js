(function () {
    const page = location.pathname.split("/").pop() || "index.html";
    const publicPages = new Set(["login.html", "landing.html"]);
    const DEFAULT_USER = {
        full_name: "admin admin",
        email: "admin",
    };
    const DEFAULT_AVATAR = "assets/default-avatar.svg";

    const routes = {
        dashboard: "adminpanel.html",
        "text analysis": "index.html",
        history: "tarix.html",
        dictionaries: "lugatlar.html",
        rules: "qoidalar.html",
        statistics: "statistika.html",
        settings: "login.html",
        asosiy: "adminpanel.html",
        tahlil: "index.html",
        qoidalar: "qoidalar.html",
        sozlamalar: "login.html",
    };

    function readUser() {
        return DEFAULT_USER;
    }

    function injectMotion() {
        const style = document.createElement("style");
        style.textContent = `
            @keyframes uzFadeUp {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .uz-animate-in { animation: uzFadeUp .42s ease both; }
            button, a, input, textarea, select { transition-property: color, background-color, border-color, opacity, box-shadow, transform; transition-duration: 180ms; }
            button:active, a:active { transform: scale(.98); }
            .uz-toast { position: fixed; right: 24px; bottom: 24px; z-index: 9999; max-width: 360px; padding: 14px 16px; border-radius: 12px; box-shadow: 0 18px 50px rgba(15,23,42,.18); background: #fff; border: 1px solid #e2e8f0; color: #0f172a; animation: uzFadeUp .25s ease both; }
            .uz-toast-error { border-color: #fecaca; background: #fff1f2; color: #991b1b; }
        `;
        document.head.appendChild(style);
    }

    function normalize(value) {
        return value.trim().toLowerCase().replace(/\s+/g, " ");
    }

    function wireNavigation() {
        document.querySelectorAll('a[href="#"]').forEach((link) => {
            const text = normalize(link.textContent);
            const targetKey = Object.keys(routes).find((key) => text.includes(key));
            if (targetKey) {
                link.href = routes[targetKey];
            }
        });
        document.querySelectorAll("button").forEach((button) => {
            if (normalize(button.textContent).includes("tizimga kirish")) {
                button.type = "button";
                button.addEventListener("click", () => {
                    location.href = "login.html";
                });
            }
        });
    }

    function hydrateUser() {
        const user = readUser();
        if (!user) {
            return;
        }

        document.querySelectorAll("p, span").forEach((node) => {
            const value = node.textContent.trim();
            if ([
                "Dilshod Mirzo",
                "Azamat Z.",
                "Admin User",
                "Aziz Rahimov",
                "Admin Foydalanuvchi",
                "Profil Sozlamalari",
                "Profile Settings",
            ].includes(value)) {
                node.textContent = user.full_name;
            }
            if (["Lingvist-analitik", "Lead Linguist", "Boshqaruvchi", "pro_analyst@uzbek.ai"].includes(value)) {
                node.textContent = user.email;
            }
        });

        document.querySelectorAll("div").forEach((node) => {
            if (/^(AZ|UZ)$/.test(node.textContent.trim())) {
                const image = document.createElement("img");
                image.src = DEFAULT_AVATAR;
                image.alt = "Default user avatar";
                image.className = node.className;
                node.replaceWith(image);
            }
        });

        document.querySelectorAll("img").forEach((image) => {
            const label = `${image.alt || ""} ${image.getAttribute("data-alt") || ""}`.toLowerCase();
            if (label.includes("avatar") || label.includes("profile") || label.includes("admin avatar") || label.includes("headshot")) {
                image.src = DEFAULT_AVATAR;
                image.alt = "Default user avatar";
                image.removeAttribute("data-alt");
            }
        });
    }

    function wireTheme() {
        document.querySelectorAll("button").forEach((button) => {
            if (button.textContent.includes("dark_mode")) {
                button.type = "button";
                button.addEventListener("click", () => {
                    document.documentElement.classList.toggle("dark");
                    localStorage.setItem("uzsentiment_theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
                });
            }
        });
        if (localStorage.getItem("uzsentiment_theme") === "dark") {
            document.documentElement.classList.add("dark");
        }
    }

    function animateSurface() {
        const items = document.querySelectorAll("main .rounded-xl, main table, main form");
        items.forEach((item, index) => {
            item.classList.add("uz-animate-in");
            item.style.animationDelay = `${Math.min(index * 35, 280)}ms`;
        });
    }

    function toast(message, type = "info") {
        const existing = document.querySelector(".uz-toast");
        if (existing) existing.remove();
        const node = document.createElement("div");
        node.className = `uz-toast ${type === "error" ? "uz-toast-error" : ""}`;
        node.textContent = message;
        document.body.appendChild(node);
        setTimeout(() => node.remove(), 3600);
    }

    if (!publicPages.has(page) && window.UzSentimentAPI && !window.UzSentimentAPI.requireAuth()) {
        return;
    }

    injectMotion();
    wireNavigation();
    hydrateUser();
    wireTheme();
    requestAnimationFrame(animateSurface);

    window.UzSentimentUI = {
        toast,
        readUser,
    };
})();
