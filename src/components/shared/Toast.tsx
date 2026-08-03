import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, X, Info, Loader2 } from "lucide-react";

type ToastType = "success" | "error" | "info" | "loading";

interface ToastItem {
  id: number;
  msg: string;
  type: ToastType;
}

interface ToastCtx {
  toast: (msg: string, type?: ToastType) => void;
}

const ToastCtx = createContext<ToastCtx>({ toast: () => {} });

const TOAST_STYLE: Record<ToastType, { icon: ReactNode; bar: string; ring: string }> = {
  success: {
    icon: <CheckCircle2 size={16} className="text-[#16a34a]" />,
    bar: "bg-gradient-to-r from-[#16a34a] to-[#15803d]",
    ring: "border-green-200 dark:border-green-800",
  },
  error: {
    icon: <AlertTriangle size={16} className="text-[#ef4444]" />,
    bar: "bg-gradient-to-r from-[#ef4444] to-[#dc2626]",
    ring: "border-red-200 dark:border-red-800",
  },
  info: {
    icon: <Info size={16} className="text-[#0ea5a0]" />,
    bar: "bg-gradient-to-r from-[#0ea5a0] to-[#0d7a8a]",
    ring: "border-teal-200 dark:border-teal-800",
  },
  loading: {
    icon: <Loader2 size={16} className="text-[#0ea5a0] animate-spin" />,
    bar: "bg-gradient-to-r from-[#0ea5a0] to-[#0d7a8a]",
    ring: "border-teal-200 dark:border-teal-800",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  let idCounter = 0;

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((msg: string, type: ToastType = "info") => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, msg, type }]);
    if (type !== "loading") {
      setTimeout(() => remove(id), 3000);
    }
  }, [remove]);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] flex flex-col gap-2 w-[min(92%,360px)] pointer-events-none">
        {toasts.map((t) => {
          const s = TOAST_STYLE[t.type];
          return (
            <div
              key={t.id}
              className={`relative overflow-hidden bg-white dark:bg-[#1e293b] border ${s.ring} shadow-xl rounded-[12px] px-[14px] py-[11px] flex items-center gap-[10px] pointer-events-auto animate-[slideDown_.25s_ease]`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${s.bar}`} />
              <span className="flex-shrink-0">{s.icon}</span>
              <span className="text-[0.78rem] font-semibold text-[var(--text)] flex-1">{t.msg}</span>
              <button
                onClick={() => remove(t.id)}
                className="text-[var(--text-light)] hover:text-[var(--text)] cursor-pointer bg-transparent border-none p-0"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
