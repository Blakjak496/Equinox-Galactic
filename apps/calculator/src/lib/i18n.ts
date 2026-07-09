import en from "@/locales/en";
import ru from "@/locales/ru";
import zh from "@/locales/zh";

export const dictionaries = {
  en,
  ru,
  zh,
};

export type Locale = keyof typeof dictionaries;
export type TranslationKey = keyof typeof en;

export function createTranslator(locale: Locale) {
  const dictionary = dictionaries[locale] ?? dictionaries.en;

  return (
    key: TranslationKey,
    vars?: Record<string, string | number>,
  ): string => {
    let text: string = dictionary[key] ?? dictionaries.en[key];

    if (!vars) {
      return text;
    }

    return Object.entries(vars).reduce<string>((result, [name, value]) => {
      return result.replaceAll(`{${name}}`, String(value));
    }, text);
  };
}
