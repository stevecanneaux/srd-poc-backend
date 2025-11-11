import * as React from "react";

export type ToastVariant = "default" | "destructive" | "success" | "warning";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextType {
  toasts: Toast[];
  toast: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastCtx = React.createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  // ✅ Add new toast
  const toast = (t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => dismiss(id), 4000);
  };

  // ✅ Remove toast
  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ✅ Render component safely (no fragment shorthand)
  return (
    <React.Fragment>
      <ToastCtx.Provider value={{ toasts, toast, dismiss }}>
        {children}
      </ToastCtx.Provider>

      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg text-white shadow-md transition-all ${
              t.variant === "destructive"
                ? "bg-red-600"
                : t.variant === "success"
                ? "bg-green-600"
                : t.variant === "warning"
                ? "bg-yellow-500 text-black"
                : "bg-gray-800"
            }`}
          >
            {t.title && <strong>{t.title}</strong>}
            {t.description && <div className="text-sm">{t.description}</div>}
          </div>
        ))}
      </div>
    </React.Fragment>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) {
    throw new Error("useToast must be used inside a <ToastProvider>");
  }
  return ctx;
}
