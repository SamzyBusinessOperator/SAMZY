"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { Language, t, languages } from "./translations";
interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  tr: typeof t["en"];
  languages: typeof languages;
}
const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  tr: t["en"],
  languages,
});
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  useEffect(() => {
    const saved = localStorage.getItem("samzy_lang") as Language;
    if (saved && t[saved]) setLangState(saved);
  }, []);
  function setLang(newLang: Language) {
    setLangState(newLang);
    localStorage.setItem("samzy_lang", newLang);
  }
  return (
    <LanguageContext.Provider value={{ lang, setLang, tr: t[lang], languages }}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useLanguage() {
  return useContext(LanguageContext);
}
