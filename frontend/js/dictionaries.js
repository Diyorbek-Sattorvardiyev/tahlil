(function () {
    const form = document.querySelector("form.space-y-4");
    const tbody = document.querySelector("tbody.divide-y");
    const tabs = Array.from(document.querySelectorAll(".flex.border-b button"));
    const totalLabel = Array.from(document.querySelectorAll("div")).find((node) => node.textContent.trim().startsWith("Jami:"));
    const searchInput = document.querySelector('input[placeholder*="So"]');
    const importButton = Array.from(document.querySelectorAll("button")).find((button) => button.textContent.includes("Eksport"));
    const statCards = Array.from(document.querySelectorAll(".grid.grid-cols-1.md\\:grid-cols-4 h3, .grid.grid-cols-1.md\\:grid-cols-4 .text-2xl"));
    const staticPager = document.querySelector(".mt-auto.p-6.border-t.border-slate-100");
    const types = ["POSITIVE", "NEGATIVE", "NEGATION"];
    const typeNames = { POSITIVE: "Ijobiy", NEGATIVE: "Salbiy", NEUTRAL: "Neytral", NEGATION: "Inkor", INTENSIFIER: "Kuchaytiruvchi" };
    let words = [];
    let activeType = "POSITIVE";
    let query = "";

    if (!tbody || !window.UzSentimentAPI) return;
    tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-sm text-slate-400">Lug'at yuklanmoqda...</td></tr>`;
    if (staticPager) staticPager.remove();

    function typeClasses(type) {
        if (type === "POSITIVE") return { icon: "bg-green-50 text-green-600", badge: "bg-green-100 text-green-700" };
        if (type === "NEGATIVE") return { icon: "bg-red-50 text-red-600", badge: "bg-red-100 text-red-700" };
        if (type === "INTENSIFIER") return { icon: "bg-purple-50 text-purple-600", badge: "bg-purple-100 text-purple-700" };
        if (type === "NEGATION") return { icon: "bg-amber-50 text-amber-600", badge: "bg-amber-100 text-amber-700" };
        return { icon: "bg-slate-50 text-slate-600", badge: "bg-slate-100 text-slate-700" };
    }

    function visibleWords() {
        return words.filter((item) => {
            const groupMatch = activeType === "NEGATION" ? ["NEGATION", "INTENSIFIER"].includes(item.type) : item.type === activeType;
            return groupMatch && (!query || item.word.includes(query));
        });
    }

    function renderStats() {
        const counts = {
            POSITIVE: words.filter((item) => item.type === "POSITIVE").length,
            NEGATIVE: words.filter((item) => item.type === "NEGATIVE").length,
            EXTRA: words.filter((item) => ["NEGATION", "INTENSIFIER"].includes(item.type)).length,
        };
        const values = Array.from(document.querySelectorAll(".grid.grid-cols-1.md\\:grid-cols-4 h3.text-2xl"));
        if (values[0]) values[0].textContent = counts.POSITIVE.toLocaleString("uz-UZ");
        if (values[1]) values[1].textContent = counts.NEGATIVE.toLocaleString("uz-UZ");
        if (values[2]) values[2].textContent = counts.EXTRA.toLocaleString("uz-UZ");
        if (values[3]) values[3].textContent = new Intl.DateTimeFormat("uz-UZ", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    }

    function renderTable() {
        const items = visibleWords();
        tbody.innerHTML = items.length ? items.map((item) => {
            const classes = typeClasses(item.type);
            return `
                <tr class="hover:bg-slate-50/50 transition-colors group">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded ${classes.icon} flex items-center justify-center font-bold text-xs">${item.word[0]?.toUpperCase() || "?"}</div>
                            <span class="text-sm font-semibold text-primary">${item.word}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-center"><span class="inline-block px-2 py-1 ${classes.badge} text-xs font-bold rounded-lg">${item.weight > 0 ? "+" : ""}${item.weight}</span></td>
                    <td class="px-6 py-4"><span class="flex items-center gap-1.5 text-xs font-bold ${item.active ? "text-green-600" : "text-slate-400"}"><span class="w-1.5 h-1.5 rounded-full ${item.active ? "bg-green-500 animate-pulse" : "bg-slate-300"}"></span>${item.active ? "Aktiv" : "Arxiv"}</span></td>
                    <td class="px-6 py-4 text-xs text-slate-500 font-medium">${new Date(item.created_at).toLocaleDateString("uz-UZ")}</td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button data-toggle="${item.id}" class="p-1.5 text-slate-400 hover:text-purple-600 transition-colors"><span class="material-symbols-outlined text-lg">${item.active ? "archive" : "unarchive"}</span></button>
                            <button data-delete="${item.id}" class="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><span class="material-symbols-outlined text-lg">delete</span></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("") : `<tr><td colspan="5" class="px-6 py-10 text-center text-sm text-slate-400">Bu bo'limda so'zlar topilmadi.</td></tr>`;
        if (totalLabel) totalLabel.textContent = `Jami: ${items.length.toLocaleString("uz-UZ")} natija`;

        tbody.querySelectorAll("[data-toggle]").forEach((button) => {
            button.addEventListener("click", async () => {
                const item = words.find((word) => String(word.id) === button.dataset.toggle);
                await window.UzSentimentAPI.request(`/api/dictionary/${item.id}`, {
                    method: "PUT",
                    body: JSON.stringify({ active: !item.active }),
                });
                load();
            });
        });
        tbody.querySelectorAll("[data-delete]").forEach((button) => {
            button.addEventListener("click", async () => {
                await window.UzSentimentAPI.request(`/api/dictionary/${button.dataset.delete}`, { method: "DELETE" });
                window.UzSentimentUI?.toast("So'z lug'atdan o'chirildi.");
                load();
            });
        });
    }

    async function load() {
        try {
            words = await window.UzSentimentAPI.request("/api/dictionary");
            renderStats();
            renderTable();
        } catch (error) {
            window.UzSentimentUI?.toast(error.message, "error");
        }
    }

    function setupCsvImport() {
        if (!importButton) return;
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".csv,text/csv";
        input.className = "hidden";
        document.body.appendChild(input);

        importButton.type = "button";
        importButton.innerHTML = `<span class="material-symbols-outlined text-lg">upload_file</span>CSV import`;
        importButton.addEventListener("click", () => input.click());
        input.addEventListener("change", async () => {
            const file = input.files?.[0];
            if (!file) return;
            const data = new FormData();
            data.append("file", file);
            try {
                importButton.disabled = true;
                const result = await window.UzSentimentAPI.request("/api/dictionary/import-csv", {
                    method: "POST",
                    body: data,
                });
                window.UzSentimentUI?.toast(`CSV import: ${result.inserted} qo'shildi, ${result.updated} yangilandi, ${result.skipped} o'tkazildi.`);
                input.value = "";
                load();
            } catch (error) {
                window.UzSentimentUI?.toast(error.message, "error");
            } finally {
                importButton.disabled = false;
            }
        });
    }

    tabs.forEach((tab, index) => {
        tab.type = "button";
        tab.addEventListener("click", () => {
            activeType = types[index] || "POSITIVE";
            tabs.forEach((item) => item.className = "px-6 py-4 text-sm font-medium text-slate-500 hover:text-primary transition-colors");
            tab.className = "px-6 py-4 text-sm font-bold border-b-2 border-purple-600 text-purple-600";
            renderTable();
        });
    });

    searchInput?.addEventListener("input", () => {
        query = searchInput.value.trim().toLowerCase();
        renderTable();
    });

    form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const [wordInput, weightInput] = form.querySelectorAll("input");
        const select = form.querySelector("select");
        const label = select.value.toLowerCase();
        const type = label.includes("salbiy") ? "NEGATIVE" : label.includes("inkor") ? "NEGATION" : "POSITIVE";
        try {
            await window.UzSentimentAPI.request("/api/dictionary", {
                method: "POST",
                body: JSON.stringify({
                    word: wordInput.value.trim(),
                    type,
                    weight: Number(weightInput.value || (type === "NEGATIVE" ? -1 : 1)),
                    active: true,
                }),
            });
            form.reset();
            window.UzSentimentUI?.toast("Yangi so'z bazaga saqlandi.");
            load();
        } catch (error) {
            window.UzSentimentUI?.toast(error.message, "error");
        }
    });

    setupCsvImport();
    load();
})();
