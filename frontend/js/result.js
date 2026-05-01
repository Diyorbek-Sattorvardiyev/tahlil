(function () {
    if (!window.UzSentimentAPI.requireAuth()) {
        return;
    }

    function sentimentClass(type) {
        if (type === "POSITIVE") return "sentiment-positive text-on-tertiary-container";
        if (type === "NEGATIVE") return "sentiment-negative text-error";
        if (type === "NEGATION") return "sentiment-negation text-amber-700";
        if (type === "INTENSIFIER") return "sentiment-intensifier text-secondary";
        return "bg-slate-100 text-slate-700";
    }

    function render(text, payload) {
        const dataset = payload.dataset_result || {};
        const gemini = payload.gemini_result || {};
        const final = payload.final_result || {};
        const sentiment = final.sentiment || dataset.sentiment || "NEYTRAL";
        const confidence = final.confidence ?? dataset.confidence ?? 0;

        const textBlock = Array.from(document.querySelectorAll("h3")).find((heading) =>
            heading.textContent.includes("Belgilangan matn")
        )?.closest(".rounded-xl")?.querySelector(".p-8");
        if (textBlock) {
            const detected = new Map((dataset.detected_words || []).map((item) => [item.word, item.type]));
            textBlock.innerHTML = text
            .split(/(\s+)/)
            .map((part) => {
                const key = part.toLowerCase().replace(/[.,!?;:"()]/g, "");
                const type = detected.get(key);
                if (!type) return part;
                return `<span class="px-1.5 py-0.5 ${sentimentClass(type)} rounded font-semibold">${part}</span>`;
            })
            .join("");
        }

        const meter = document.querySelector(".relative.h-48");
        const meterPercent = meter?.querySelector(".text-4xl");
        const meterLabel = meter?.querySelector(".text-label-caps");
        const meterCircle = meter?.querySelector("circle[stroke-dashoffset]");
        if (meterPercent) meterPercent.textContent = `${confidence}%`;
        if (meterLabel) meterLabel.textContent = sentiment === "IJOBIY" ? "POZITIV" : sentiment === "SALBIY" ? "NEGATIV" : "NEYTRAL";
        if (meterCircle) meterCircle.setAttribute("stroke-dashoffset", String(282.7 - (282.7 * confidence) / 100));

        const bars = document.querySelectorAll(".space-y-4 .h-full");
        const total = Math.max((dataset.positive_count || 0) + (dataset.negative_count || 0) + (dataset.neutral_count || 0), 1);
        const positivePct = Math.round(((dataset.positive_count || 0) / total) * 100);
        const negativePct = Math.round(((dataset.negative_count || 0) / total) * 100);
        const neutralPct = Math.round(((dataset.neutral_count || 0) / total) * 100);
        const barLabels = document.querySelectorAll(".space-y-4 .text-sm.font-bold");
        [positivePct, negativePct, neutralPct].forEach((value, index) => {
            if (bars[index]) bars[index].style.width = `${value}%`;
            if (barLabels[index]) barLabels[index].textContent = `${value}%`;
        });

        const explanationWrap = Array.from(document.querySelectorAll("h3")).find((heading) =>
            heading.textContent.includes("Nega")
        )?.closest(".rounded-xl")?.querySelector(".grid");
        if (explanationWrap) {
            explanationWrap.innerHTML = (dataset.explanation || []).map((item) => `
            <div class="p-4 rounded-xl bg-surface-container-low border border-slate-200">
                <div class="flex items-center gap-2 mb-3">
                    <span class="material-symbols-outlined text-secondary">psychology</span>
                    <h4 class="font-semibold text-primary">Qoida izohi</h4>
                </div>
                <p class="text-sm text-on-surface-variant">${item}</p>
            </div>
        `).join("");
        }

        const tbody = document.querySelector("tbody.divide-y");
        if (tbody) {
            tbody.innerHTML = (dataset.detected_words || []).map((item) => `
            <tr>
                <td class="px-6 py-4 font-bold text-primary">${item.word}</td>
                <td class="px-6 py-4"><span class="px-2 py-0.5 ${sentimentClass(item.type)} rounded-full text-[10px] font-bold">${item.type}</span></td>
                <td class="px-6 py-4 text-sm text-slate-500">Lug'at</td>
                <td class="px-6 py-4 font-data-mono text-primary font-bold">${item.score ?? item.effect ?? 0}</td>
                <td class="px-6 py-4 text-xs font-bold text-slate-600">${dataset.confidence || 0}%</td>
            </tr>
        `).join("");
        }

        const title = document.querySelector("h2.font-h1");
        if (title) title.textContent = `Tahlil natijalari: ${sentiment}`;

        const subtitle = document.querySelector("h2.font-h1 + p");
        if (subtitle) subtitle.textContent = gemini.reason || payload.gemini_error || `Yakuniy metod: ${final.method || "DATASET"}`;
    }

    async function load() {
        const saved = localStorage.getItem("uzsentiment_last_analysis");
        if (saved) {
            const { text, payload } = JSON.parse(saved);
            render(text, payload);
            return;
        }
        const recent = await window.UzSentimentAPI.request("/api/stats/recent-analyses?limit=1");
        if (!recent.length) {
            location.href = "index.html";
            return;
        }
        const detail = await window.UzSentimentAPI.request(`/api/history/${recent[0].id}`);
        render(detail.text, {
            dataset_result: {
                sentiment: detail.dataset_sentiment,
                score: detail.dataset_score,
                confidence: detail.dataset_confidence,
                positive_count: detail.dataset_positive_count,
                negative_count: detail.dataset_negative_count,
                neutral_count: detail.dataset_neutral_count,
                detected_words: detail.detected_words || [],
                explanation: detail.explanation || [],
            },
            gemini_result: detail.gemini_result || {},
            final_result: {
                sentiment: detail.final_sentiment,
                confidence: detail.final_confidence,
                method: detail.final_method,
                ai_available: detail.ai_available,
            },
        });
    }

    load().catch((error) => window.UzSentimentUI?.toast(error.message, "error"));
})();
