"use client";

import React, { createContext, useContext, useEffect, useSyncExternalStore, useCallback, useMemo } from "react";
import { NextIntlClientProvider } from "next-intl";
import {
  type SupportedLanguage,
  type ThemeMode,
  getCurrentLanguage,
  getCurrentTheme,
  syncDocumentTheme,
  applyLanguageToDocument,
  getUpdatedUrlWithLanguage,
  normalizeLanguage,
} from "@/lib/theme-language";
import esMessages from "@/lib/i18n/es.json";
import enMessages from "@/lib/i18n/en.json";

const messagesByLanguage: Record<SupportedLanguage, typeof esMessages> = {
  es: esMessages,
  en: enMessages,
};

interface ThemeLanguageContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleLanguage: () => void;
}

const ThemeLanguageContext = createContext<ThemeLanguageContextType | undefined>(undefined);

const preferenceEvent = "dmhub-preferences-changed";
function subscribePreferences(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("popstate", onChange);
  window.addEventListener(preferenceEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(preferenceEvent, onChange);
  };
}

export function ThemeLanguageProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribePreferences, getCurrentTheme, () => "dark" as ThemeMode);
  const language = useSyncExternalStore(subscribePreferences, getCurrentLanguage, () => "es" as SupportedLanguage);

  // Read browser preferences here so hydration defaults cannot overwrite storage.
  useEffect(() => {
    applyLanguageToDocument(getCurrentLanguage());
    syncDocumentTheme(getCurrentTheme());
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    syncDocumentTheme(newTheme);
    window.dispatchEvent(new Event(preferenceEvent));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const setLanguage = useCallback((newLang: SupportedLanguage) => {
    const validLang = normalizeLanguage(newLang);
    applyLanguageToDocument(validLang);
    const nextUrl = getUpdatedUrlWithLanguage(window.location.href, validLang);
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== currentUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", validLang);
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }
    window.dispatchEvent(new Event(preferenceEvent));
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "es" ? "en" : "es");
  }, [language, setLanguage]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      language,
      setLanguage,
      toggleLanguage,
    }),
    [theme, setTheme, toggleTheme, language, setLanguage, toggleLanguage]
  );

  return (
    <ThemeLanguageContext.Provider value={value}>
      <NextIntlClientProvider locale={language} messages={messagesByLanguage[language]}>
        {children}
      </NextIntlClientProvider>
    </ThemeLanguageContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeLanguageContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeLanguageProvider");
  }
  return {
    theme: context.theme,
    setTheme: context.setTheme,
    toggleTheme: context.toggleTheme,
    isDark: context.theme === "dark",
    isLight: context.theme === "light",
  };
}

export function useLanguage() {
  const context = useContext(ThemeLanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a ThemeLanguageProvider");
  }
  return {
    language: context.language,
    setLanguage: context.setLanguage,
    toggleLanguage: context.toggleLanguage,
  };
}
