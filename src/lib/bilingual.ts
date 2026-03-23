import type { AppLocale } from "@/lib/i18n";

type BilingualProduct = {
  tagline: string;
  taglineZh?: string | null;
  taglineEn?: string | null;
  description?: string | null;
  descriptionZh?: string | null;
  descriptionEn?: string | null;
};

export function getLocalizedTagline(
  product: BilingualProduct,
  locale: AppLocale
): string {
  if (locale === "zh") return product.taglineZh || product.tagline;
  return product.taglineEn || product.tagline;
}

export function getLocalizedDescription(
  product: BilingualProduct,
  locale: AppLocale
): string | null {
  if (locale === "zh") return product.descriptionZh || product.description || null;
  return product.descriptionEn || product.description || null;
}
