"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import { Language, languages, t } from "./translations";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  tr: (typeof t)["en"];
  languages: typeof languages;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => undefined,
  tr: t.en,
  languages,
});

function getInitialLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  const savedLanguage = window.localStorage.getItem("samzy_lang");

  if (savedLanguage && savedLanguage in t) {
    return savedLanguage as Language;
  }

  return "en";
}

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [lang, setLangState] = useState<Language>(getInitialLanguage);

  function setLang(newLang: Language) {
    setLangState(newLang);
    window.localStorage.setItem("samzy_lang", newLang);
  }

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        tr: t[lang],
        languages,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
