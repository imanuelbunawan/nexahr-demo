import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    try {
      // Check if already in standalone mode
      const isStandalone =
        (typeof window !== 'undefined' &&
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(display-mode: standalone)').matches) ||
        (typeof navigator !== 'undefined' &&
          (navigator as unknown as { standalone?: boolean })?.standalone === true);

      if (isStandalone) {
        setIsInstalled(true);
        return;
      }

      // Check if iOS device
      const userAgent = typeof navigator !== 'undefined' ? (navigator.userAgent || '').toLowerCase() : '';
      const isIosDevice =
        /iphone|ipad|ipod/.test(userAgent) &&
        typeof window !== 'undefined' &&
        !(window as unknown as { MSStream?: unknown })?.MSStream;
      setIsIOS(Boolean(isIosDevice));
    } catch {
      // Gracefully ignore environment inspection errors
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return { outcome: 'dismissed' as const };
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    }

    return choice;
  }, [deferredPrompt]);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    promptInstall,
  };
}
