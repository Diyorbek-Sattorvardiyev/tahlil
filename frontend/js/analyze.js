(function () {
    if (!window.UzSentimentAPI.requireAuth()) {
        return;
    }

    const textarea = document.querySelector("textarea");
    const analyzeButton = Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent.includes("Tahlil qilish")
    );
    const languageChip = document.querySelector(".px-3.py-1.bg-surface-container");
    const resultCard = Array.from(document.querySelectorAll("h2")).find((heading) =>
        heading.textContent.includes("Natija")
    )?.closest(".rounded-xl");
    const statsCards = Array.from(document.querySelectorAll("p")).filter((item) =>
        ["Ijobiy so'zlar", "Salbiy so'zlar", "Neytral so'zlar"].includes(item.textContent.trim())
    );

    let modeSelect = null;

    function setEmptyResult() {
        const title = resultCard?.querySelector("h1");
        const subtitle = resultCard?.querySelector("p.font-label-caps");
        const confidenceText = Array.from(resultCard?.querySelectorAll("span") || []).find((span) =>
            span.textContent.includes("%")
        );
        const confidenceBar = resultCard?.querySelector(".bg-tertiary-fixed-dim");
        const icon = resultCard?.querySelector(".text-\\[48px\\]");
        const iconWrap = icon?.parentElement;
        const scoreValues = Array.from(resultCard?.querySelectorAll(".grid.grid-cols-2 p.text-\\[24px\\]") || []);

        if (title) {
            title.textContent = "Ma'lumot yo'q";
            title.className = "font-h1 text-[32px] leading-none mb-1 text-slate-500";
        }
        if (subtitle) {
            subtitle.textContent = "Matn tahlil qilinmagan";
        }
        if (confidenceText) {
            confidenceText.textContent = "0%";
        }
        if (confidenceBar) {
            confidenceBar.style.width = "0%";
        }
        if (icon) {
            icon.textContent = "pending";
        }
        if (iconWrap) {
            iconWrap.className = "inline-flex items-center justify-center p-4 bg-slate-100 text-slate-500 rounded-2xl mb-4";
        }
        if (scoreValues[0]) scoreValues[0].textContent = "0";
        if (scoreValues[1]) scoreValues[1].textContent = "0s";
    }

    function setupModeSelect() {
        modeSelect = document.createElement("select");
        modeSelect.className = "px-3 py-1 bg-surface-container text-on-surface-variant rounded-full text-label-caps font-label-caps uppercase tracking-wider border-none focus:ring-2 focus:ring-secondary/20";
        modeSelect.innerHTML = `
            <option value="HYBRID">HYBRID</option>
            <option value="DATASET">DATASET</option>
            <option value="GEMINI">GEMINI</option>
        `;
        languageChip?.parentElement?.appendChild(modeSelect);
    }

    function setLoading(isLoading) {
        if (!analyzeButton) {
            return;
        }
        analyzeButton.disabled = isLoading;
        analyzeButton.classList.toggle("opacity-70", isLoading);
        analyzeButton.innerHTML = isLoading
            ? '<span class="material-symbols-outlined mr-2">hourglass_top</span>Tahlil qilinmoqda...'
            : '<span class="material-symbols-outlined mr-2" data-icon="analytics">analytics</span>Tahlil qilish';
    }

    function updateCounters() {
        const text = textarea.value || "";
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const counters = document.querySelectorAll(".absolute.bottom-4.right-4 span:last-child");
        if (counters[0]) {
            counters[0].textContent = `${words} so'z`;
        }
        if (counters[1]) {
            counters[1].textContent = `${text.length} belgi`;
        }
    }

    function renderResult(payload) {
        const dataset = payload.dataset_result || {};
        const final = payload.final_result || {};
        const gemini = payload.gemini_result || {};
        const sentiment = final.sentiment || dataset.sentiment || "NEYTRAL";
        const confidence = final.confidence ?? dataset.confidence ?? 0;
        const score = dataset.score ?? 0;

        const title = resultCard?.querySelector("h1");
        const subtitle = resultCard?.querySelector("p.font-label-caps");
        const confidenceText = Array.from(resultCard?.querySelectorAll("span") || []).find((span) =>
            span.textContent.includes("%")
        );
        const confidenceBar = resultCard?.querySelector(".bg-tertiary-fixed-dim");
        const icon = resultCard?.querySelector(".text-\\[48px\\]");
        const iconWrap = icon?.parentElement;
        const scoreValue = resultCard?.querySelector(".grid.grid-cols-2 p.text-\\[24px\\]");

        if (title) {
            title.textContent = sentiment === "IJOBIY" ? "Ijobiy" : sentiment === "SALBIY" ? "Salbiy" : "Neytral";
            title.className = `font-h1 text-[42px] leading-none mb-1 ${sentiment === "SALBIY" ? "text-error" : sentiment === "NEYTRAL" ? "text-slate-500" : "text-primary"}`;
        }
        if (subtitle) {
            subtitle.textContent = `${final.method || modeSelect.value} natija`;
        }
        if (confidenceText) {
            confidenceText.textContent = `${confidence}%`;
        }
        if (confidenceBar) {
            confidenceBar.style.width = `${confidence}%`;
        }
        if (icon) {
            icon.textContent = sentiment === "SALBIY" ? "sentiment_dissatisfied" : sentiment === "NEYTRAL" ? "sentiment_neutral" : "sentiment_very_satisfied";
        }
        if (iconWrap) {
            iconWrap.className = sentiment === "SALBIY"
                ? "inline-flex items-center justify-center p-4 bg-error-container text-on-error-container rounded-2xl mb-4"
                : sentiment === "NEYTRAL"
                    ? "inline-flex items-center justify-center p-4 bg-slate-100 text-slate-500 rounded-2xl mb-4"
                    : "inline-flex items-center justify-center p-4 bg-tertiary-fixed text-on-tertiary-container rounded-2xl mb-4";
        }
        if (scoreValue) {
            scoreValue.textContent = score;
        }

        const statValues = statsCards.map((label) => label.parentElement?.querySelector("p.text-h2"));
        if (statValues[0]) {
            statValues[0].textContent = dataset.positive_count ?? 0;
        }
        if (statValues[1]) {
            statValues[1].textContent = dataset.negative_count ?? 0;
        }
        if (statValues[2]) {
            statValues[2].textContent = dataset.neutral_count ?? 0;
        }

        const tip = Array.from(document.querySelectorAll("h3")).find((heading) =>
            heading.textContent.includes("Tavsiya")
        )?.parentElement?.querySelector("p");
        if (tip) {
            tip.textContent = gemini.suggestion || dataset.explanation?.slice(-1)[0] || "Tahlil yakunlandi.";
        }
    }

    async function analyze() {
        const text = textarea.value.trim();
        if (!text) {
            alert("Matn kiriting.");
            return;
        }

        try {
            setLoading(true);
            const started = performance.now();
            const payload = await window.UzSentimentAPI.request("/api/analyze", {
                method: "POST",
                body: JSON.stringify({ text, mode: modeSelect.value }),
            });
            const elapsed = `${((performance.now() - started) / 1000).toFixed(1)}s`;
            localStorage.setItem("uzsentiment_last_analysis", JSON.stringify({ text, payload, elapsed }));
            renderResult(payload);

            const speedValue = Array.from(document.querySelectorAll("p.text-\\[24px\\]"))[1];
            if (speedValue) {
                speedValue.textContent = elapsed;
            }
        } catch (error) {
            if (error.message.toLowerCase().includes("token")) {
                window.UzSentimentAPI.clearSession();
                window.location.href = "login.html";
                return;
            }
            alert(error.message);
        } finally {
            setLoading(false);
        }
    }

    function label(sentiment) {
        return sentiment === "IJOBIY" ? "Ijobiy" : sentiment === "SALBIY" ? "Salbiy" : "Neytral";
    }

    function badgeClass(sentiment) {
        if (sentiment === "IJOBIY") return "text-label-caps text-on-tertiary-container bg-tertiary-fixed px-2 py-0.5 rounded-full";
        if (sentiment === "SALBIY") return "text-label-caps text-on-error-container bg-error-container px-2 py-0.5 rounded-full";
        return "text-label-caps text-on-surface-variant bg-slate-200 px-2 py-0.5 rounded-full";
    }

    async function loadLivePageData() {
        try {
            const [summary, recent] = await Promise.all([
                window.UzSentimentAPI.request("/api/stats/summary"),
                window.UzSentimentAPI.request("/api/stats/recent-analyses?limit=2"),
            ]);

            const statValues = statsCards.map((labelNode) => labelNode.parentElement?.querySelector("p.text-h2"));
            if (statValues[0]) statValues[0].textContent = summary.positive || 0;
            if (statValues[1]) statValues[1].textContent = summary.negative || 0;
            if (statValues[2]) statValues[2].textContent = summary.neutral || 0;

            const recentWrap = Array.from(document.querySelectorAll("h3")).find((heading) =>
                heading.textContent.includes("So'nggi tahlil")
            )?.parentElement?.querySelector(".space-y-2");
            if (recentWrap) {
                recentWrap.innerHTML = recent.length
                    ? recent.map((item) => `
                        <div class="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <span class="text-sm text-on-surface truncate pr-4">${item.text}</span>
                            <span class="${badgeClass(item.final_sentiment)}">${label(item.final_sentiment)}</span>
                        </div>
                    `).join("")
                    : `<div class="text-sm text-on-surface-variant">Hali tahlil mavjud emas.</div>`;
            }

        } catch (error) {
            window.UzSentimentUI?.toast(error.message, "error");
        }
    }

    setupModeSelect();
    setEmptyResult();
    updateCounters();
    loadLivePageData();
    textarea?.addEventListener("input", updateCounters);
    analyzeButton?.addEventListener("click", analyze);
})();
