// Khóa chống gian lận khi thi (port ý tưởng từ v1):
//  - vào toàn màn hình; đếm + ghi log khi: rời tab, mất focus, thoát fullscreen,
//    chuột phải, copy/cut/paste, phím tắt mở DevTools.
//  - trả về số lần vi phạm + nhật ký để gửi kèm bài nộp; cảnh báo khi tới ngưỡng.
import { useCallback, useEffect, useRef, useState } from "react";

export interface AntiCheat {
  violations: number;
  log: string;          // mỗi dòng: "HH:mm:ss — lý do"
  warning: string | null;
  enterFullscreen: () => Promise<void>;
}

export const MAX_ALLOWED_VIOLATIONS = 10; // trên 10 lần sẽ dừng bài thi
export const VIOLATION_STOP_MESSAGE = "Bài làm đã bị dừng do vượt quá số lần vi phạm cho phép. Học sinh cần nghiêm túc hơn trong lần làm bài tiếp theo.";

const WARN_AT = 1;       // bắt đầu cảnh báo ngay từ lần đầu
const HIDE_WARN_MS = 4000;

export function useAntiCheat(active: boolean): AntiCheat {
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const logRef = useRef<string[]>([]);
  const [log, setLog] = useState("");
  const warnTimer = useRef<number | undefined>(undefined);

  const record = useCallback((reason: string) => {
    const ts = new Date().toLocaleTimeString("vi-VN", { hour12: false });
    logRef.current.push(`${ts} — ${reason}`);
    setLog(logRef.current.join("\n"));
    setViolations((n) => {
      const next = n + 1;
      if (next >= WARN_AT) {
        setWarning(`⚠️ Phát hiện thao tác đáng ngờ: ${reason}. Hệ thống đã ghi nhận (lần ${next}).`);
        window.clearTimeout(warnTimer.current);
        warnTimer.current = window.setTimeout(() => setWarning(null), HIDE_WARN_MS);
      }
      return next;
    });
  }, []);

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // một số trình duyệt/máy không cho fullscreen — vẫn ghi log các vi phạm khác.
    }
  }, []);

  useEffect(() => {
    if (!active) return;

    const onVisibility = () => {
      if (document.hidden) record("rời khỏi tab / chuyển cửa sổ");
    };
    const onBlur = () => record("cửa sổ mất tiêu điểm");
    const onFsChange = () => {
      if (!document.fullscreenElement) record("thoát chế độ toàn màn hình");
    };
    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      record("mở menu chuột phải");
    };
    const onCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      record(`thao tác ${e.type} (sao chép/dán)`);
    };
    const onKey = (e: KeyboardEvent) => {
      const blocked =
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) ||
        ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === "U");
      if (blocked) {
        e.preventDefault();
        record("phím tắt mở công cụ nhà phát triển");
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("copy", onCopyPaste);
    document.addEventListener("cut", onCopyPaste);
    document.addEventListener("paste", onCopyPaste);
    document.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("copy", onCopyPaste);
      document.removeEventListener("cut", onCopyPaste);
      document.removeEventListener("paste", onCopyPaste);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.clearTimeout(warnTimer.current);
    };
  }, [active, record]);

  return { violations, log, warning, enterFullscreen };
}
