(function () {
    const kpiValues = document.querySelectorAll("section.grid.grid-cols-1.md\\:grid-cols-4 h3");
    const userTable = Array.from(document.querySelectorAll("h3")).find((node) => node.textContent.includes("Foydalanuvchilar"))?.closest(".rounded-xl")?.querySelector("tbody");
    const healthLabel = Array.from(document.querySelectorAll("p")).find((node) => node.textContent.includes("Onlayn"));
    const chartWrap = document.getElementById("admin-daily-chart");
    const rangeSelect = Array.from(document.querySelectorAll("select")).find((select) => select.textContent.includes("Oxirgi"));
    const updatedLabel = Array.from(document.querySelectorAll("span")).find((node) => node.textContent.includes("Oxirgi yangilanish"));
    const logsWrap = Array.from(document.querySelectorAll("h3")).find((node) => node.textContent.includes("Tizim Loglari"))?.closest(".rounded-xl")?.querySelector(".flex-1.overflow-y-auto");
    const kpiCards = Array.from(document.querySelectorAll("section.grid.grid-cols-1.md\\:grid-cols-4 > div"));

    if (!window.UzSentimentAPI) return;

    kpiValues.forEach((value) => {
        value.textContent = "...";
    });
    if (userTable) userTable.innerHTML = `<tr><td colspan="4" class="px-6 py-10 text-center text-sm text-slate-400">Yuklanmoqda...</td></tr>`;
    if (logsWrap) logsWrap.innerHTML = `<div class="p-4 text-center text-slate-400">Loglar yuklanmoqda...</div>`;

    function initials(name) {
        return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    }

    function renderUsers(users) {
        if (!userTable) return;
        userTable.innerHTML = users.length ? users.map((user) => `
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
                <td class="px-6 py-4"><span class="px-2 py-0.5 rounded-full ${user.active ? user.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-slate-200 text-slate-500"} text-[10px] font-bold">${user.active ? user.role : "NOFAOL"}</span></td>
                <td class="px-6 py-4 text-xs text-on-surface-variant font-data-mono">${user.analysis_count} tahlil</td>
                <td class="px-6 py-4 text-right"><span class="material-symbols-outlined text-slate-400">more_vert</span></td>
            </tr>
        `).join("") : `<tr><td colspan="4" class="px-6 py-10 text-center text-sm text-slate-400">Foydalanuvchilar topilmadi.</td></tr>`;
    }

    function renderLogs(logs) {
        if (!logsWrap) return;
        const levelClass = {
            INFO: "border-on-tertiary-container text-on-tertiary-container",
            WARN: "border-amber-400 text-amber-500",
            ERROR: "border-error text-error",
            ERR: "border-error text-error",
        };
        logsWrap.innerHTML = logs.length ? logs.map((log) => {
            const classes = levelClass[log.level] || "border-slate-300 text-slate-500";
            const time = new Intl.DateTimeFormat("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(log.created_at));
            return `
                <div class="flex items-start space-x-2 p-2 rounded bg-slate-50 border-l-2 ${classes.split(" ")[0]}">
                    <span class="${classes.split(" ")[1]} font-bold">${log.level}</span>
                    <span class="text-slate-500">${time}</span>
                    <p class="text-primary flex-1">${log.message}</p>
                </div>
            `;
        }).join("") : `<div class="p-4 text-center text-slate-400">Hali tizim loglari yo'q.</div>`;
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
            if (userTable) userTable.innerHTML = `<tr><td colspan="4" class="px-6 py-10 text-center text-sm text-slate-400">Yuklanmoqda...</td></tr>`;
            const [summary, users, daily, logs] = await Promise.all([
                window.UzSentimentAPI.request("/api/admin/stats/summary"),
                window.UzSentimentAPI.request("/api/admin/stats/users").catch(() => []),
                window.UzSentimentAPI.request(`/api/admin/stats/daily?days=${days}`),
                window.UzSentimentAPI.request("/api/admin/logs?limit=20").catch(() => []),
            ]);
            if (kpiValues[0]) kpiValues[0].textContent = (summary.active_users || 0).toLocaleString("uz-UZ");
            if (kpiValues[1]) kpiValues[1].textContent = (summary.today_analyses || 0).toLocaleString("uz-UZ");
            if (kpiValues[2]) kpiValues[2].textContent = `${summary.average_confidence || 0}%`;
            if (kpiValues[3]) kpiValues[3].textContent = (summary.dictionary_words || 0).toLocaleString("uz-UZ");
            const kpiLabels = kpiCards.map((card) => card.querySelector("p"));
            const kpiBadges = kpiCards.map((card) => card.querySelector("span.text-xs"));
            if (kpiLabels[0]) kpiLabels[0].textContent = "Faol Foydalanuvchilar";
            if (kpiLabels[1]) kpiLabels[1].textContent = "Bugungi Tahlillar";
            if (kpiLabels[2]) kpiLabels[2].textContent = "O'rtacha Ishonch";
            if (kpiLabels[3]) kpiLabels[3].textContent = "Lug'at Boyligi";
            kpiBadges.forEach((badge) => {
                if (badge) badge.textContent = "REAL";
            });
            renderUsers(Array.isArray(users) ? users : []);
            renderDailyChart(daily);
            renderLogs(Array.isArray(logs) ? logs : []);
            if (healthLabel) healthLabel.textContent = "Onlayn (API ulangan)";
            if (updatedLabel) {
                updatedLabel.textContent = `Oxirgi yangilanish: ${new Intl.DateTimeFormat("uz-UZ", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`;
            }
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
