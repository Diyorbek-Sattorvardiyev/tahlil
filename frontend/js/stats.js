(function () {
    const main = document.querySelector("main");
    if (!main || !window.UzSentimentAPI) return;

    function sentimentWidth(value, total) {
        return `${total ? Math.round((value / total) * 100) : 0}%`;
    }

    function render(summary, daily, words) {
        const total = summary.total_analyses || 0;
        const maxDaily = Math.max(...daily.map((item) => item.count), 1);
        main.innerHTML = `
            <div class="flex justify-between items-end mb-8">
                <div>
                    <h2 class="font-h1 text-h1 text-primary">Statistika</h2>
                    <p class="font-body-lg text-body-lg text-on-surface-variant mt-2">Real tahlil natijalari va so'zlar ishlatilishi.</p>
                </div>
                <button id="refresh-stats" class="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                    <span class="material-symbols-outlined text-lg">refresh</span>
                    Yangilash
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                ${[
                    ["analytics", "Jami tahlillar", total, "text-blue-600", "bg-blue-50"],
                    ["mood", "Ijobiy", summary.positive || 0, "text-green-600", "bg-green-50"],
                    ["mood_bad", "Salbiy", summary.negative || 0, "text-red-600", "bg-red-50"],
                    ["radio_button_checked", "Neytral", summary.neutral || 0, "text-slate-600", "bg-slate-50"],
                ].map(([icon, label, value, color, bg]) => `
                    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm uz-animate-in">
                        <div class="flex justify-between items-start mb-4">
                            <div class="p-2 ${bg} ${color} rounded-lg"><span class="material-symbols-outlined">${icon}</span></div>
                            <span class="text-xs font-bold ${color}">API</span>
                        </div>
                        <p class="text-sm text-slate-500 font-medium">${label}</p>
                        <h3 class="text-2xl font-bold text-primary mt-1">${value.toLocaleString("uz-UZ")}</h3>
                    </div>
                `).join("")}
            </div>
            <div class="grid grid-cols-12 gap-8">
                <section class="col-span-12 lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 class="font-h3 text-h3 text-primary mb-6">Kayfiyat taqsimoti</h3>
                    <div class="space-y-5">
                        <div>
                            <div class="flex justify-between text-sm font-semibold mb-2"><span>Ijobiy</span><span>${summary.positive || 0}</span></div>
                            <div class="h-3 rounded-full bg-slate-100 overflow-hidden"><div class="h-full bg-green-500 rounded-full" style="width:${sentimentWidth(summary.positive || 0, total)}"></div></div>
                        </div>
                        <div>
                            <div class="flex justify-between text-sm font-semibold mb-2"><span>Salbiy</span><span>${summary.negative || 0}</span></div>
                            <div class="h-3 rounded-full bg-slate-100 overflow-hidden"><div class="h-full bg-red-500 rounded-full" style="width:${sentimentWidth(summary.negative || 0, total)}"></div></div>
                        </div>
                        <div>
                            <div class="flex justify-between text-sm font-semibold mb-2"><span>Neytral</span><span>${summary.neutral || 0}</span></div>
                            <div class="h-3 rounded-full bg-slate-100 overflow-hidden"><div class="h-full bg-slate-500 rounded-full" style="width:${sentimentWidth(summary.neutral || 0, total)}"></div></div>
                        </div>
                    </div>
                </section>
                <section class="col-span-12 lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 class="font-h3 text-h3 text-primary mb-6">Oxirgi 30 kun</h3>
                    <div class="h-64 flex items-end gap-2 border-b border-slate-100 pb-2">
                        ${daily.length ? daily.map((item) => `
                            <div class="flex-1 min-w-2 bg-purple-100 rounded-t-lg relative group" style="height:${Math.max(8, (item.count / maxDaily) * 100)}%">
                                <div class="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-primary text-white text-xs px-2 py-1 rounded">${item.count}</div>
                            </div>
                        `).join("") : `<div class="w-full text-center text-slate-400 pb-20">Hali kunlik statistika yo'q.</div>`}
                    </div>
                </section>
                <section class="col-span-12 lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="p-6 border-b border-slate-100"><h3 class="font-h3 text-h3 text-primary">Eng ko'p topilgan so'zlar</h3></div>
                    <div class="divide-y divide-slate-50">
                        ${words.length ? words.map((item) => `
                            <div class="px-6 py-4 flex items-center justify-between">
                                <span class="font-semibold text-primary">${item.word}</span>
                                <span class="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold">${item.count} marta</span>
                            </div>
                        `).join("") : `<div class="px-6 py-10 text-center text-slate-400">So'z statistikasi hali shakllanmagan.</div>`}
                    </div>
                </section>
                <section class="col-span-12 lg:col-span-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 class="font-h3 text-h3 text-primary mb-6">Model rejimlari</h3>
                    <div class="grid grid-cols-3 gap-4">
                        <div class="text-center p-4 bg-slate-50 rounded-xl"><p class="text-2xl font-bold text-primary">${summary.dataset_used || 0}</p><p class="text-xs text-slate-500 font-bold mt-1">DATASET</p></div>
                        <div class="text-center p-4 bg-slate-50 rounded-xl"><p class="text-2xl font-bold text-primary">${summary.gemini_used || 0}</p><p class="text-xs text-slate-500 font-bold mt-1">GEMINI</p></div>
                        <div class="text-center p-4 bg-slate-50 rounded-xl"><p class="text-2xl font-bold text-primary">${summary.hybrid_used || 0}</p><p class="text-xs text-slate-500 font-bold mt-1">HYBRID</p></div>
                    </div>
                </section>
            </div>
        `;
        document.getElementById("refresh-stats")?.addEventListener("click", load);
    }

    async function load() {
        try {
            const [summary, daily, words] = await Promise.all([
                window.UzSentimentAPI.request("/api/stats/summary"),
                window.UzSentimentAPI.request("/api/stats/daily"),
                window.UzSentimentAPI.request("/api/stats/top-words"),
            ]);
            render(summary, daily, words);
        } catch (error) {
            window.UzSentimentUI?.toast(error.message, "error");
        }
    }

    load();
})();
