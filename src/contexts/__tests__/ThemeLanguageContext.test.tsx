import { act, renderHook } from "@testing-library/react";
import { ThemeLanguageProvider, useLanguage, useTheme } from "../ThemeLanguageContext";

jest.mock("next-intl", () => ({
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  window.history.replaceState({}, "", "/portal?tab=settings");
});

it("loads persisted preferences without replacing them with hydration defaults", () => {
  localStorage.setItem("dmhub-theme", "light");
  localStorage.setItem("dmhub-language", "en");
  const { result } = renderHook(() => ({ theme: useTheme(), language: useLanguage() }), {
    wrapper: ThemeLanguageProvider,
  });
  expect(result.current.theme.theme).toBe("light");
  expect(result.current.language.language).toBe("en");
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(document.documentElement.lang).toBe("en");
});

it("updates consumers, the document and storage when preferences change", () => {
  const { result } = renderHook(() => ({ theme: useTheme(), language: useLanguage() }), {
    wrapper: ThemeLanguageProvider,
  });
  act(() => result.current.theme.toggleTheme());
  act(() => result.current.language.toggleLanguage());
  expect(result.current.theme.theme).toBe("light");
  expect(result.current.language.language).toBe("en");
  expect(localStorage.getItem("dmhub-theme")).toBe("light");
  expect(localStorage.getItem("dmhub-language")).toBe("en");
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(document.documentElement.lang).toBe("en");
  expect(window.location.search).toContain("tab=settings");
  expect(window.location.search).toContain("lang=en");
});
