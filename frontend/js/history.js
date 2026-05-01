(function () {
    const list = document.querySelector(".grid.grid-cols-1.gap-6");
    const emptyState = document.querySelector(".hidden.flex-col.items-center");
    const pager = document.querySelector(".mt-12.flex.items-center.justify-between");
    const searchInput = document.querySelector('input[placeholder*="Tarix"]');
    const filterButtons = Array.from(document.querySelectorAll(".flex.flex-wrap.gap-2 button"));

    if (!list || !window.UzSentimentAPI) return;

    let state = { page: 1, sentiment: "", search: "" };

    function label(sentiment) {
        return sentiment === "IJOBIY" ? "Ijobiy" : sentiment === "SALBIY" ? "Salbiy" : "Neytral";
    }

    function badgeClass(sentiment) {
        if (sentiment === "IJOBIY") return "bg-tertiary-fixed text-on-tertiary-fixed-variant";
        if (sentiment === "SALBIY") return "bg-error-container text-on-error-container";
        return "bg-surface-container-highest text-on-surface-variant";
    }

    function fmtDate(value) {
        return new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
    }

    function render(items) {
        list.innerHTML = items.map((item) => `
            <div class="group bg-white border border-outline-variant rounded-xl p-card-padding shadow-[0_4px_20px_rgba(30,41,59,0.04)] hover:shadow-[0_8px_30px_rgba(30,41,59,0.08)] transition-all duration-300 flex flex-col md:flex-row items-center gap-6 uz-animate-in">
                <div class="flex-1 w-full">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="px-2.5 py-1 ${badgeClass(item.final_sentiment)} font-label-caps text-label-caps rounded uppercase">${label(item.final_sentiment)}</span>
                        <span class="text-slate-400 text-xs font-medium">${fmtDate(item.created_at)} | ${item.mode}</span>
                    </div>
                    <p class="font-body-md text-primary leading-relaxed line-clamp-2">"${item.text}"</p>
                </div>
                <div class="flex items-center gap-8 min-w-fit w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-8">
                    <div class="text-center">
                        <p class="text-[10px] font-label-caps text-slate-400 mb-1 uppercase tracking-widest">Ishonch</p>
                        <p class="font-h2 text-h2 ${item.final_sentiment === "SALBIY" ? "text-error" : item.final_sentiment === "IJOBIY" ? "text-on-tertiary-container" : "text-on-surface-variant"}">${item.final_confidence || 0}%</p>
                    </div>
                    <div class="flex gap-2">
                        <button data-open="${item.id}" class="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 text-slate-400 hover:text-purple-600 hover:border-purple-200 transition-colors">
                            <span class="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                        <button data-delete="${item.id}" class="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 text-slate-400 hover:text-error hover:border-error-container transition-colors">
                            <span class="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `).join("");

        list.querySelectorAll("[data-open]").forEach((button) => {
            button.addEventListener("click", async () => {
                const item = await window.UzSentimentAPI.request(`/api/history/${button.dataset.open}`);
                localStorage.setItem("uzsentiment_last_analysis", JSON.stringify({
                    text: item.text,
                    payload: {
                        dataset_result: {
                            sentiment: item.dataset_sentiment,
                            score: item.dataset_score,
                            confidence: item.dataset_confidence,
                            detected_words: item.detected_words || [],
                            explanation: item.explanation || [],
                        },
                        gemini_result: item.gemini_result || {},
                        final_result: {
                            sentiment: item.final_sentiment,
                            confidence: item.final_confidence,
                            method: item.mode,
                            ai_available: item.ai_available,
                        },
                    },
                }));
                location.href = "tahlil.html";
            });
        });

        list.querySelectorAll("[data-delete]").forEach((button) => {
            button.addEventListener("click", async () => {
                await window.UzSentimentAPI.request(`/api/history/${button.dataset.delete}`, { method: "DELETE" });
                window.UzSentimentUI?.toast("Tahlil tarixi o'chirildi.");
                load();
            });
        });
    }

    function renderPager(pagination) {
        if (!pager) return;
        const start = pagination.total ? (pagination.page - 1) * pagination.size + 1 : 0;
        const end = Math.min(pagination.page * pagination.size, pagination.total);
        pager.innerHTML = `
            <p class="text-sm text-slate-500">Jami: ${pagination.total} ta tahlildan ${start}-${end} ko'rsatilyapti</p>
            <div class="flex gap-1">
                <button data-page="${Math.max(1, pagination.page - 1)}" class="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"><span class="material-symbols-outlined">chevron_left</span></button>
                <span class="px-4 h-9 rounded-lg flex items-center justify-center bg-purple-600 text-white font-bold text-sm">${pagination.page}/${Math.max(pagination.pages, 1)}</span>
                <button data-page="${Math.min(Math.max(pagination.pages, 1), pagination.page + 1)}" class="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"><span class="material-symbols-outlined">chevron_right</span></button>
            </div>
        `;
        pager.querySelectorAll("[data-page]").forEach((button) => {
            button.addEventListener("click", () => {
                state.page = Number(button.dataset.page);
                load();
            });
        });
    }

    async function load() {
        try {
            const params = new URLSearchParams({ page: state.page, size: 10 });
            if (state.sentiment) params.set("sentiment", state.sentiment);
            if (state.search) params.set("search", state.search);
            const data = await window.UzSentimentAPI.request(`/api/history?${params}`);
            render(data.items);
            renderPager(data.pagination);
            emptyState?.classList.toggle("hidden", data.items.length > 0);
            emptyState?.classList.toggle("flex", data.items.length === 0);
        } catch (error) {
            window.UzSentimentUI?.toast(error.message, "error");
        }
    }

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const text = button.textContent.trim().toUpperCase();
            state.sentiment = text.includes("IJOBIY") ? "IJOBIY" : text.includes("SALBIY") ? "SALBIY" : text.includes("NEYTRAL") ? "NEYTRAL" : "";
            state.page = 1;
            filterButtons.forEach((item) => item.className = "px-5 py-2 text-sm font-medium text-slate-500 hover:bg-white/50 rounded-lg transition-all");
            button.className = "px-5 py-2 text-sm font-bold bg-white text-purple-600 rounded-lg shadow-sm";
            load();
        });
    });

    let timer = null;
    searchInput?.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            state.search = searchInput.value.trim();
            state.page = 1;
            load();
        }, 250);
    });

    load();
})();
