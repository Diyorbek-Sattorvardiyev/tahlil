(function () {
    const kpiValues = document.querySelectorAll("section.grid.grid-cols-1.md\\:grid-cols-4 h3");
    const userTable = Array.from(document.querySelectorAll("h3")).find((node) => node.textContent.includes("Foydalanuvchilar"))?.closest(".rounded-xl")?.querySelector("tbody");
    const healthLabel = Array.from(document.querySelectorAll("p")).find((node) => node.textContent.includes("Onlayn"));
    const chartWrap = document.getElementById("admin-daily-chart");
    const rangeSelect = Array.from(document.querySelectorAll("select")).find((select) => select.textContent.includes("Oxirgi"));

    if (!window.UzSentimentAPI) return;

    function initials(name) {
        return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    }

    function renderUsers(users) {
        if (!userTable) return;
        userTable.innerHTML = users.map((user) => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="w-8 h-8 rounded-full bg-purple-100 mr-3 flex items-center justify-center font-bold text-xs text-purple-600">${initials(user.full_name)}</div>
                        <div>
                            <p class="text-sm font-bold text-primary">${user.full_name}</p>
                            <p class="text-[10px] text-slate-500">${user.email}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4"><span class="px-2 py-0.5 rounded-full ${user.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-tertiary-fixed text-on-tertiary-fixed"} text-[10px] font-bold">${user.role}</span></td>
                <td class="px-6 py-4 text-xs text-on-surface-variant font-data-mono">${user.analysis_count} tahlil</td>
                <td class="px-6 py-4 text-right"><span class="material-symbols-outlined text-slate-400">more_vert</span></td>
            </tr>
        `).join("");
    }

    function renderDailyChart(rows) {
        if (!chartWrap) return;
        const max = Math.max(...rows.map((item) => item.count), 1);
        chartWrap.innerHTML = rows.length
            ? `
                <div class="h-full flex items-end gap-2 border-b border-slate-100 pb-7 pt-3">
                    ${rows.map((item) => `
                        <div class="flex-1 h-full flex flex-col justify-end items-center gap-2 group min-w-0">
                            <div class="relative w-full max-w-8 rounded-t-lg bg-purple-500/80 hover:bg-purple-600 transition-all"
                                style="height:${Math.max(8, (item.count / max) * 100)}%">
                                <span class="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-primary text-white text-xs px-2 py-1 rounded shadow">${item.count}</span>
                            </div>
                            <span class="text-[10px] text-slate-400 truncate w-full text-center">${item.date.slice(5)}</span>
                        </div>
                    `).join("")}
                </div>
            `
            : `<div class="h-full flex items-center justify-center text-sm text-slate-400">Hali tahlil statistikasi yo'q.</div>`;
    }

    async function load() {
        try {
            const days = rangeSelect?.value?.includes("30") ? 30 : 7;
            const [summary, dictionary, users, daily] = await Promise.all([
                window.UzSentimentAPI.request("/api/stats/summary"),
                window.UzSentimentAPI.request("/api/dictionary"),
                window.UzSentimentAPI.request("/api/admin/stats/users").catch(() => []),
                window.UzSentimentAPI.request(`/api/stats/daily?days=${days}`),
            ]);
            if (kpiValues[0]) kpiValues[0].textContent = users.length ? users.length.toLocaleString("uz-UZ") : "1";
            if (kpiValues[1]) kpiValues[1].textContent = (summary.total_analyses || 0).toLocaleString("uz-UZ");
            if (kpiValues[2]) kpiValues[2].textContent = `${summary.hybrid_used || 0} HYB`;
            if (kpiValues[3]) kpiValues[3].textContent = dictionary.length.toLocaleString("uz-UZ");
            if (Array.isArray(users) && users.length) renderUsers(users);
            renderDailyChart(daily);
            if (healthLabel) healthLabel.textContent = "Onlayn (API ulangan)";
        } catch (error) {
            window.UzSentimentUI?.toast(error.message, "error");
        }
    }

    document.querySelectorAll("button").forEach((button) => {
        if (button.textContent.includes("Lug")) button.addEventListener("click", () => location.href = "lugatlar.html");
        if (button.textContent.includes("Qoid")) button.addEventListener("click", () => location.href = "qoidalar.html");
        if (button.textContent.includes("Yangilash")) button.addEventListener("click", load);
    });
    rangeSelect?.addEventListener("change", load);

    load();
})();
