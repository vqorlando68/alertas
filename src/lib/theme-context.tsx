"use client"

import * as React from "react"
import { translations } from "./i18n"

type Theme = "dark" | "light"
type Lang = "es" | "en"

type AppContextType = {
  theme: Theme
  toggleTheme: () => void
  lang: Lang
  toggleLang: () => void
  /** t("key") — looks up the translations dictionary */
  t: (key: string, fallbackEn?: string) => string
}

const AppContext = React.createContext<AppContextType>({
  theme: "dark",
  toggleTheme: () => {},
  lang: "es",
  toggleLang: () => {},
  t: (key) => key,
})

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>("dark")
  const [lang, setLang] = React.useState<Lang>("es")

  React.useEffect(() => {
    const saved = localStorage.getItem("app-theme") as Theme | null
    const savedLang = localStorage.getItem("app-lang") as Lang | null
    if (saved) setTheme(saved)
    if (savedLang) setLang(savedLang)
  }, [])

  React.useEffect(() => {
    const html = document.documentElement
    if (theme === "dark") {
      html.classList.add("dark")
    } else {
      html.classList.remove("dark")
    }
    localStorage.setItem("app-theme", theme)
  }, [theme])

  React.useEffect(() => {
    localStorage.setItem("app-lang", lang)
  }, [lang])

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark")
  const toggleLang = () => setLang(prev => prev === "es" ? "en" : "es")

  /**
   * t("key") — looks up translations[lang][key]
   * t("spanish text", "english text") — legacy inline pair
   */
  const t = (key: string, fallbackEn?: string): string => {
    // If fallbackEn provided ⇒ old inline pair mode
    if (fallbackEn !== undefined) {
      return lang === "es" ? key : fallbackEn
    }
    // Key-based lookup
    const dict = translations[lang] as Record<string, string>
    return dict[key] ?? (translations["es"] as Record<string, string>)[key] ?? key
  }

  return (
    <AppContext.Provider value={{ theme, toggleTheme, lang, toggleLang, t }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return React.useContext(AppContext)
}

