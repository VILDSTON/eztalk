import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

export function useLocalizedNavigate() {
  const navigate = useNavigate();
  const { language } = useTranslation();

  return (to: string, options?: { replace?: boolean; state?: any }) => {
    // If the path already starts with a language prefix, don't double it
    const hasLangPrefix = /^\/(en|ru|uz)(\/|$)/.test(to);
    
    let targetPath = to;
    if (!hasLangPrefix && to.startsWith('/')) {
      targetPath = `/${language}${to === '/' ? '' : to}`;
    }

    navigate(targetPath, options);
  };
}
