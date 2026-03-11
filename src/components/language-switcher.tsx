"use client";

import { useI18n } from "@/components/i18n-provider";
import type { AppLocale } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale, messages } = useI18n();

  const onSwitch = async () => {
    const next: AppLocale = locale === "zh" ? "en" : "zh";
    await setLocale(next);
  };

  return (
    <button
      type="button"
      onClick={onSwitch}
      className="h-8 rounded-md border border-border px-2 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
      title={locale === "zh" ? messages.common.languageEnglish : messages.common.languageChinese}
    >
      {locale === "zh" ? "EN" : "中文"}
    </button>
  );
}
