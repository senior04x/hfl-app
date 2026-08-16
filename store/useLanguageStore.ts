import { create } from 'zustand';
import i18n, { AppLanguage, changeAppLanguage, SUPPORTED_LANGUAGES } from '../i18n';

interface LanguageState {
  currentLanguage: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  currentLanguage: (i18n.language as AppLanguage) || 'uz',
  setLanguage: async (lang: AppLanguage) => {
    await changeAppLanguage(lang);
    set({ currentLanguage: lang });
  },
}));

export { SUPPORTED_LANGUAGES };
