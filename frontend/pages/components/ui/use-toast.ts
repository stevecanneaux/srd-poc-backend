import * as React from "react";
import { ToastProvider, Toast, ToastViewport } from "@/components/ui/toast";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = {
  id: string;
  title?: string;
  description?: string;
};

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const listeners = new Set<(toast: ToasterToast[]) => void>();
let memoryState: ToasterToast[] = [];

function toast(toast: ToasterToast) {
  memoryState = [...memoryState, toast].slice(-TOAST_LIMIT);
  listeners.forEach((listener) => listener(memoryState));

  const timeout = setTimeout(() => {
    dismiss(toast.id);
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toast.id, timeout);

  return toast.id;
}

function dismiss(toastId: string) {
  memoryState = memoryState.filter((t) => t.id !== toastId);
  listeners.forEach((listener) => listener(memoryState));

  const timeout = toastTimeouts.get(toastId);
  if (timeout) clearTimeout(timeout);
}

function useToast() {
  const [toasts, setToasts] = React.useState<ToasterToast[]>(memoryState);

  React.useEffect(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, [toasts]);

  return {
    toast,
    dismiss,
    toasts,
  };
}

export { useToast, ToastProvider, ToastViewport, Toast };
