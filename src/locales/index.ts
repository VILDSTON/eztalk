// src/locales/index.ts
import { en, TranslationKeys } from './en';
import { ru } from './ru';
import { uz } from './uz';

export type Language = 'en' | 'ru' | 'uz';

export const translations: Record<Language, TranslationKeys> = {
  en,
  ru,
  uz,
};

export { en, ru, uz };
export type { TranslationKeys };
