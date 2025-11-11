import * as React from "react";
import { ToastProvider, Toast, ToastViewport } from "@/components/ui/toast";

type ToasterToast = {
  id: string;
  title?: string;
  description?: string;
};

const listeners = new Set<(toast: ToasterToast[]) => void>();
let memoryState: ToasterToast[] = [];

function toast(toast: ToasterToast) {
  memoryState = [...memoryState, toast];
  listeners.forEach((listener) => listener(memoryState));
  return toast.id;
}

function dismiss(toastId: string) {
  memoryState = memoryState.filter((t) => t.id !== toastId);
  listeners.forEach((listener) => listener(memoryState));
}

function useToast() {
  const [toasts, setToasts] = React.useState<ToasterToast[]>(memoryState);

  React.useEffect(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  return {
    toast,
    dismiss,
    toasts,
  };
}

export { useToast, ToastProvider, ToastViewport, Toast };

