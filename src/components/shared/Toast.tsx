import { useState, createContext, useContext, useCallback, useRef, type ReactNode, type PointerEvent } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, Loader2 } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning" | "loading";

interface ToastItem {
  id: number;
  msg: string;
  type: ToastType;
  leaving?: boolean;
}

interface ToastCtx {
  toast: (msg: string, type?: ToastType) => void;
}

const ToastCtx = createContext<ToastCtx>({ toast: () => {} });

const DURATION = 3000;
const MAX = 3;

const STYLE: Record<ToastType, { icon: ReactNode; accent: string }> = {
  success: { icon: <CheckCircle2 size={20} />, accent: "#16a34a" },
  error: { icon: <XCircle size={20} />, accent: "#ef4444" },
  warning: { icon: <AlertTriangle size={20} />, accent: "#f59e0b" },
  info: { icon: <Info size={20} />, accent: "#0ea5a0" },
  loading: { icon: <Loader2 size={20} className="animate-spin" />, accent: "#0ea5a0" },
};

// Banyak pemanggil menulis "✅ ..." / "❌ ..." tanpa tipe: tipe ditebak dari emoji, emojinya dibuang.
const EMOJI_TYPE: [RegExp, ToastType][] = [
  [/^\s*(✅|✔️|🎉)\s*/u, "success"],
  [/^\s*(❌|⛔|🚫)\s*/u, "error"],
  [/^\s*(⚠️|⚠)\s*/u, "warning"],
  [/^\s*(ℹ️|💡|⏳|🔄)\s*/u, "info"],
];

function normalize(msg: string, type?: ToastType): { msg: string; type: ToastType } {
  for (const [re, t] of EMOJI_TYPE) {
    if (re.test(msg)) return { msg: msg.replace(re, ""), type: type ?? t };
  }
  return { msg, type: type ?? "info" };
}

function ToastCard({ t, onClose }: { t: ToastItem; onClose: () => void }) {
  const s = STYLE[t.type];
  const startX = useRef<number | null>(null);
  const [dx, setDx] = useState(0);

  const down = (e: PointerEvent) => { startX.current = e.clientX; };
  const move = (e: PointerEvent) => { if (startX.current !== null) setDx(e.clientX - startX.current); };
  const up = () => {
    if (Math.abs(dx) > 70) onClose();
    else setDx(0);
    startX.current = null;
  };

  return (
    <div
      role={t.type === "error" ? "alert" : "status"}
      onClick={() => { if (Math.abs(dx) < 5) onClose(); }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      className={`toast-card pointer-events-auto relative overflow-hidden rounded-2xl flex items-center gap-3 pl-3 pr-4 py-3 cursor-pointer select-none ${t.leaving ? "toast-out" : "toast-in"}`}
      style={{
        background: "var(--card-bg)",
        color: "var(--text)",
        border: "1px solid var(--border)",
        boxShadow: "0 10px 30px rgba(0,0,0,.18)",
        transform: dx ? `translateX(${dx}px)` : undefined,
        opacity: dx ? Math.max(0.2, 1 - Math.abs(dx) / 200) : undefined,
        touchAction: "pan-y",
      }}
    >
      <span
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ color: s.accent, background: `${s.accent}1f` }}
      >
        {s.icon}
      </span>
      <span className="text-[0.86rem] font-semibold leading-snug flex-1">{t.msg}</span>
      {t.type !== "loading" && (
        <span
          className="toast-bar absolute left-0 bottom-0 h-[3px]"
          style={{ background: s.accent, animationDuration: `${DURATION}ms` }}
        />
      )}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 220);
  }, []);

  const toast = useCallback((raw: string, type?: ToastType) => {
    const id = ++nextId.current;
    const n = normalize(String(raw ?? ""), type);
    setToasts((prev) => [...prev.filter((t) => !t.leaving).slice(-(MAX - 1)), { id, ...n }]);
    if (n.type !== "loading") setTimeout(() => remove(id), DURATION);
  }, [remove]);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed left-1/2 -translate-x-1/2 z-[1000] flex flex-col gap-2 w-[min(92%,420px)] pointer-events-none"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} t={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
