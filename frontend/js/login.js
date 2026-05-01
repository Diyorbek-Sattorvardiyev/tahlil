(function () {
    const form = document.querySelector("form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;
    const tabButtons = Array.from(document.querySelectorAll(".flex.p-1 button"));
    const successToast = document.querySelector(".fixed.top-8.right-8");
    const errorToast = document.querySelector(".fixed.bottom-8");
    const errorText = errorToast ? errorToast.querySelector("p") : null;
    const secondaryLink = document.querySelector("main > div.mt-stack-lg a");

    let mode = "login";
    let fullNameWrap = null;

    if (successToast) {
        successToast.classList.add("hidden");
    }

    function showError(message) {
        if (!errorToast || !errorText) {
            alert(message);
            return;
        }
        errorText.textContent = message;
        errorToast.classList.remove("hidden");
        errorToast.classList.add("flex");
    }

    function showSuccess(message) {
        if (!successToast) {
            return;
        }
        const text = successToast.querySelector("p.font-body-md");
        if (text) {
            text.textContent = message;
        }
        successToast.classList.remove("hidden");
    }

    function setLoading(isLoading) {
        if (!submitButton) {
            return;
        }
        submitButton.disabled = isLoading;
        submitButton.classList.toggle("opacity-70", isLoading);
        submitButton.lastChild.textContent = isLoading
            ? " Yuborilmoqda..."
            : mode === "login"
                ? " Tizimga kirish"
                : " Ro'yxatdan o'tish";
    }

    function ensureFullNameField() {
        if (fullNameWrap) {
            return fullNameWrap;
        }
        fullNameWrap = document.createElement("div");
        fullNameWrap.className = "space-y-1";
        fullNameWrap.innerHTML = `
            <label class="font-label-caps text-label-caps text-on-surface-variant ml-1" for="full_name">TO'LIQ ISM</label>
            <div class="relative group">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary transition-colors">person</span>
                <input class="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all font-body-md text-on-surface placeholder:text-outline/60" id="full_name" placeholder="Ali Valiyev" type="text" />
            </div>
        `;
        form.insertBefore(fullNameWrap, form.firstElementChild);
        return fullNameWrap;
    }

    function setMode(nextMode) {
        mode = nextMode;
        tabButtons.forEach((button, index) => {
            const active = (mode === "login" && index === 0) || (mode === "register" && index === 1);
            button.type = "button";
            button.classList.toggle("bg-white", active);
            button.classList.toggle("text-secondary", active);
            button.classList.toggle("shadow-sm", active);
            button.classList.toggle("text-on-surface-variant", !active);
        });

        if (mode === "register") {
            ensureFullNameField().classList.remove("hidden");
            submitButton.lastChild.textContent = " Ro'yxatdan o'tish";
            if (secondaryLink) {
                secondaryLink.textContent = "Tizimga kiring";
            }
        } else {
            if (fullNameWrap) {
                fullNameWrap.classList.add("hidden");
            }
            submitButton.lastChild.textContent = " Tizimga kirish";
            if (secondaryLink) {
                secondaryLink.textContent = "Ro'yxatdan o'ting";
            }
        }
    }

    tabButtons[0]?.addEventListener("click", () => setMode("login"));
    tabButtons[1]?.addEventListener("click", () => setMode("register"));
    secondaryLink?.addEventListener("click", (event) => {
        event.preventDefault();
        setMode(mode === "login" ? "register" : "login");
    });

    document.querySelector(".fixed.bottom-8 button")?.addEventListener("click", () => {
        errorToast.classList.add("hidden");
        errorToast.classList.remove("flex");
    });

    form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (errorToast) {
            errorToast.classList.add("hidden");
            errorToast.classList.remove("flex");
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const body = { email, password };
        if (mode === "register") {
            body.full_name = document.getElementById("full_name")?.value.trim();
        }

        try {
            setLoading(true);
            const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
            const data = await window.UzSentimentAPI.request(endpoint, {
                method: "POST",
                body: JSON.stringify(body),
            });
            window.UzSentimentAPI.setSession(data);
            showSuccess(mode === "login" ? "Tizimga kirish tasdiqlandi." : "Ro'yxatdan o'tish yakunlandi.");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 500);
        } catch (error) {
            showError(error.message);
        } finally {
            setLoading(false);
        }
    });
})();
