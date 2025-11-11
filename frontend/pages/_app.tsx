import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "@/components/ui/toaster";
import { ToastProvider } from "@/components/ui/use-toast"; // ✅ Added import

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider> {/* ✅ Wrap your app with the ToastProvider */}
      <Component {...pageProps} />
      <Toaster /> {/* ✅ Keep this to render the toast container */}
    </ToastProvider>
  );
}
