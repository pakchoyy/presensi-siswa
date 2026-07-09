import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from "react";

interface ToastCtx {
  toast: (msg: string) => void;
}

const ToastCtx = createContext<ToastCtx>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);

  const toast = useCallback((m: string) => {
    setMsg(m);
    setShow(true);
    setTimeout(() => setShow(false), 2200);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div
        className={`fixed left-1/2 bottom-[90px] lg:bottom-8 -translate-x-1/2 bg-[#1e293b]/90 backdrop-blur-md text-white px-[18px] py-[11px] rounded-[12px] text-[0.78rem] font-semibold pointer-events-none z-[700] max-w-[88%] text-center shadow-lg transition-all duration-250 ${
          show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
        }`}
      >
        {msg}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
