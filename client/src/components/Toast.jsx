import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

function ToastMark({ kind }) {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 fill-none stroke-current stroke-2">
    {kind === "error" ? <path d="M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM7 7l6 6m0-6-6 6" /> : <path d="m5 10 3.2 3.2L15.5 6" />}
  </svg>;
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const showToast = useCallback((message, kind = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setItems((current) => [...current, { id, message, kind }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4200);
  }, []);

  return <ToastContext.Provider value={{ showToast }}>{children}<div className="fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 print:hidden" aria-live="polite" aria-atomic="false">{items.map((item) => <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${item.kind === "error" ? "border-danger/30 bg-danger/10 text-danger" : "border-line bg-white text-deep"}`} key={item.id}><ToastMark kind={item.kind} /><span className="min-w-0 flex-1">{item.message}</span><button className="rounded p-1 text-lg leading-none opacity-70 hover:opacity-100" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} aria-label="Dismiss notification">×</button></div>)}</div></ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
