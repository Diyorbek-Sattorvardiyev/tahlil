(function () {
    const summary = Array.from(document.querySelectorAll("h3")).find((node) => node.textContent.includes("Tizim holati"))?.closest(".rounded-xl");
    const featuredGrid = document.querySelector(".col-span-12.lg\\:col-span-8.grid");
    const tableBody = document.querySelector("tbody.divide-y");
    const testInput = document.querySelector('input[placeholder*="ajoyib"]');
    const testButton = testInput?.parentElement?.querySelector("button");
    const addButton = Array.from(document.querySelectorAll("button")).find((button) => button.textContent.includes("Yangi qoida"));

    if (!tableBody || !window.UzSentimentAPI) return;

    let rules = [];

    function iconFor(type) {
        if (type.includes("NEG")) return "do_not_disturb_on";
        if (type.includes("INTENS")) return "bolt";
        if (type.includes("NEUTRAL")) return "radio_button_checked";
        return "add_circle";
    }

    function colorClasses(type) {
        if (type.includes("NEG")) return { icon: "bg-red-50 text-red-600", badge: "bg-red-50 border-red-100 text-red-700" };
        if (type.includes("INTENS")) return { icon: "bg-purple-50 text-purple-600", badge: "bg-purple-50 border-purple-100 text-purple-700" };
        if (type.includes("NEUTRAL")) return { icon: "bg-slate-50 text-slate-600", badge: "bg-slate-50 border-slate-100 text-slate-700" };
        return { icon: "bg-green-50 text-green-600", badge: "bg-green-50 border-green-100 text-green-700" };
    }

    function renderSummary() {
        if (!summary) return;
        const active = rules.filter((item) => item.active).length;
        const pct = rules.length ? Math.round((active / rules.length) * 100) : 0;
        const values = summary.querySelectorAll(".font-data-mono");
        if (values[0]) values[0].textContent = `${active} ta`;
        if (values[1]) values[1].textContent = new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date());
        const bar = summary.querySelector(".bg-secondary.h-full");
        if (bar) bar.style.width = `${pct}%`;
    }

    function renderFeatured() {
        if (!featuredGrid) return;
        featuredGrid.innerHTML = rules.slice(0, 4).map((rule) => {
            const colors = colorClasses(rule.rule_type);
            return `
                <div class="bg-white border border-slate-200 rounded-xl p-card-padding shadow-[0_4px_16px_rgba(30,41,59,0.02)] hover:shadow-md transition-shadow uz-animate-in">
                    <div class="flex justify-between items-start mb-4">
                        <div class="w-10 h-10 ${colors.icon} rounded-lg flex items-center justify-center">
                            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">${iconFor(rule.rule_type)}</span>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input data-toggle="${rule.id}" ${rule.active ? "checked" : ""} class="sr-only peer" type="checkbox" />
                            <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                        </label>
                    </div>
                    <h4 class="font-h3 text-primary mb-2">${rule.name}</h4>
                    <div class="mb-4 inline-block px-3 py-1 ${colors.badge} border rounded font-data-mono text-xs">${rule.rule_type}</div>
                    <p class="text-sm text-on-surface-variant leading-relaxed">${rule.description}</p>
                </div>
            `;
        }).join("");
        featuredGrid.querySelectorAll("[data-toggle]").forEach((input) => {
            input.addEventListener("change", () => toggleRule(input.dataset.toggle, input.checked));
        });
    }

    function renderTable() {
        tableBody.innerHTML = rules.map((rule) => `
            <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 font-medium text-primary">${rule.name}</td>
                <td class="px-6 py-4 font-data-mono text-xs text-secondary">${rule.description}</td>
                <td class="px-6 py-4"><span class="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] uppercase font-bold tracking-wider">${rule.rule_type}</span></td>
                <td class="px-6 py-4">
                    <div class="flex items-center ${rule.active ? "text-tertiary-container" : "text-on-surface-variant opacity-50"} text-xs font-semibold">
                        <span class="w-2 h-2 ${rule.active ? "bg-tertiary-fixed-dim" : "bg-slate-400"} rounded-full mr-2"></span>${rule.active ? "Faol" : "O'chirilgan"}
                    </div>
                </td>
                <td class="px-6 py-4 text-right">
                    <button data-delete="${rule.id}" class="text-slate-400 hover:text-error transition-colors"><span class="material-symbols-outlined">delete</span></button>
                </td>
            </tr>
        `).join("");
        tableBody.querySelectorAll("[data-delete]").forEach((button) => {
            button.addEventListener("click", async () => {
                await window.UzSentimentAPI.request(`/api/rules/${button.dataset.delete}`, { method: "DELETE" });
                window.UzSentimentUI?.toast("Qoida o'chirildi.");
                load();
            });
        });
    }

    async function toggleRule(id, active) {
        const rule = rules.find((item) => String(item.id) === String(id));
        await window.UzSentimentAPI.request(`/api/rules/${id}`, {
            method: "PUT",
            body: JSON.stringify({ active, name: rule.name, description: rule.description, rule_type: rule.rule_type }),
        });
        load();
    }

    async function load() {
        try {
            rules = await window.UzSentimentAPI.request("/api/rules");
            renderSummary();
            renderFeatured();
            renderTable();
        } catch (error) {
            window.UzSentimentUI?.toast(error.message, "error");
        }
    }

    testButton?.addEventListener("click", async () => {
        const text = testInput.value.trim();
        if (!text) return;
        try {
            testButton.disabled = true;
            const result = await window.UzSentimentAPI.request("/api/analyze", {
                method: "POST",
                body: JSON.stringify({ text, mode: "DATASET" }),
            });
            const final = result.final_result || result.dataset_result || {};
            window.UzSentimentUI?.toast(`Natija: ${final.sentiment || "NEYTRAL"} (${final.confidence || 0}%)`);
        } catch (error) {
            window.UzSentimentUI?.toast(error.message, "error");
        } finally {
            testButton.disabled = false;
        }
    });

    addButton?.addEventListener("click", async () => {
        const name = prompt("Qoida nomi:");
        if (!name) return;
        const description = prompt("Qoida izohi:");
        if (!description) return;
        const ruleType = prompt("Qoida turi:", "CUSTOM");
        if (!ruleType) return;
        try {
            await window.UzSentimentAPI.request("/api/rules", {
                method: "POST",
                body: JSON.stringify({ name, description, rule_type: ruleType, active: true }),
            });
            window.UzSentimentUI?.toast("Yangi qoida qo'shildi.");
            load();
        } catch (error) {
            window.UzSentimentUI?.toast(error.message, "error");
        }
    });

    load();
})();
