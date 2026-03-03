"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if dismissed recently
    const dismissedAt = localStorage.getItem("pwa_prompt_dismissed");
    if (dismissedAt) {
      const minutesSinceDismissed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60);
      if (minutesSinceDismissed < 5) {
        return; // Don't show again for 5 minutes
      }
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_prompt_dismissed", Date.now().toString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 mx-4 w-full max-w-sm text-center">
        <div className="mx-auto mb-4 w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center">
          <Download className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Install HYAT SCADA</h2>
        <p className="text-sm text-slate-400 mb-6">
          Install the app on your device for the best experience. It&apos;s fast, works offline, and is always available.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleInstallClick}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Install Now
          </button>
          <button
            onClick={handleDismiss}
            className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
