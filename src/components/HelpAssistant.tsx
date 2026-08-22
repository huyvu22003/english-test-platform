// Trợ lý hướng dẫn sử dụng (deterministic, không cần AI).
// Nút nổi + panel tìm kiếm/mở từng mục. Dùng chung cho học sinh và giáo viên,
// nội dung lấy từ src/lib/helpContent.ts theo prop `guide`.
import { useEffect, useMemo, useState } from "react";
import type { HelpGuide } from "../lib/helpContent";

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();
}

export default function HelpAssistant({ guide }: { guide: HelpGuide }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openTopicId, setOpenTopicId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return guide.topics;
    return guide.topics.filter((t) => {
      const haystack = normalize([t.title, ...t.steps, ...(t.tips ?? [])].join(" "));
      return haystack.includes(q);
    });
  }, [guide.topics, query]);

  return (
    <>
      <button
        type="button"
        className={`help-fab help-fab-${guide.audience}`}
        onClick={() => setOpen(true)}
        aria-label="Mở hướng dẫn sử dụng"
        title="Hướng dẫn sử dụng"
      >
        <span aria-hidden="true">💡</span>
        <span className="help-fab-label">Hướng dẫn</span>
      </button>

      {open && (
        <div
          className="help-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={guide.title}
          onClick={() => setOpen(false)}
        >
          <div className="help-panel" onClick={(e) => e.stopPropagation()}>
            <div className="help-head">
              <div>
                <span className="eyebrow dark">Trợ lý hướng dẫn</span>
                <h3>{guide.title}</h3>
              </div>
              <button className="btn ghost small" type="button" onClick={() => setOpen(false)} aria-label="Đóng">
                Đóng ✕
              </button>
            </div>

            <p className="muted small help-intro">{guide.intro}</p>

            <input
              className="help-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm nhanh: ví dụ 'ghi âm', 'chấm bài', 'mã thi'…"
              aria-label="Tìm trong hướng dẫn"
            />

            <div className="help-topics">
              {filtered.length === 0 && <p className="muted small">Không tìm thấy mục phù hợp. Thử từ khóa khác.</p>}
              {filtered.map((t) => {
                const expanded = openTopicId === t.id;
                return (
                  <div className={`help-topic ${expanded ? "open" : ""}`} key={t.id}>
                    <button
                      type="button"
                      className="help-topic-head"
                      aria-expanded={expanded}
                      onClick={() => setOpenTopicId((cur) => (cur === t.id ? null : t.id))}
                    >
                      <span className="help-topic-icon" aria-hidden="true">
                        {t.icon}
                      </span>
                      <span className="help-topic-title">{t.title}</span>
                      <span className="help-topic-caret" aria-hidden="true">
                        {expanded ? "▾" : "▸"}
                      </span>
                    </button>
                    {expanded && (
                      <div className="help-topic-body">
                        <ol className="help-steps">
                          {t.steps.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ol>
                        {t.tips && t.tips.length > 0 && (
                          <ul className="help-tips">
                            {t.tips.map((tip, i) => (
                              <li key={i}>💡 {tip}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
