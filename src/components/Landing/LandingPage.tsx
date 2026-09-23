import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { MessageSquare, Shield, Code, ChevronRight, Globe, Download, FileText, UserX, Users, CalendarDays, CircleDot, Sun, Monitor, X, Flame } from 'lucide-react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreateDisposableModal } from '../Disposable/CreateDisposableModal';

export const LandingPage: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const navigate = useLocalizedNavigate();
  const navigateBase = useNavigate();
  const location = useLocation();

  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const [isDisposableModalOpen, setIsDisposableModalOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLaunch = () => {
    navigate('/login');
  };

  const handleInstallClick = () => {
    window.dispatchEvent(new Event('beforeinstallprompt'));
    alert(t.pwa?.installBannerText || 'Check your browser address bar or menu for the "Install" icon, or add the page to your Home Screen.');
  };

  const selectLang = (lang: 'en' | 'ru' | 'uz') => {
    setLanguage(lang);
    setIsLangOpen(false);

    // Update URL instantly to prevent desync or slow re-renders from App.tsx useEffect
    const currentPath = location.pathname;
    if (/^\/(en|ru|uz)(\/|$)/.test(currentPath)) {
      navigateBase(currentPath.replace(/^\/(en|ru|uz)/, `/${lang}`), { replace: true });
    } else {
      navigateBase(`/${lang}${currentPath === '/' ? '' : currentPath}`, { replace: true });
    }
  };

  return (
    <div className="h-[100dvh] overflow-y-auto bg-[#0a0d12] text-white font-sans selection:bg-[#00e676]/30 selection:text-white">
      {/* A. Navigation Bar */}
      <header className="w-full bg-[#0a0d12]/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <img src="/icons/icon-192x192.png" alt="EzTalk Logo" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-lg tracking-tight text-[#00e676]">EzTalk</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features-list" className="text-gray-300 hover:text-[#00e676] transition-colors">{t.landing.navFeatures}</a>
            <a href="#about" className="text-gray-300 hover:text-[#00e676] transition-colors">{t.landing.navSecurity}</a>
            <a href="https://github.com/VILDSTON/eztalk" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-[#00e676] transition-colors flex items-center">
              <Code className="w-4 h-4 mr-1.5" />
              {t.landing.navGithub}
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center text-gray-300 hover:text-[#00e676] transition-colors p-2 -m-2"
              >
                <Globe className="w-4 h-4 sm:mr-1.5" />
                <span className="uppercase text-sm hidden sm:inline">{language}</span>
              </button>
              {isLangOpen && (
                <div className="absolute top-full right-0 mt-3 bg-[#11161f] border border-white/10 rounded-lg shadow-2xl p-2 w-32 z-50">
                  <button onClick={() => selectLang('en')} className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${language === 'en' ? 'bg-white/10 font-semibold text-white' : 'hover:bg-white/5'}`}>English</button>
                  <button onClick={() => selectLang('ru')} className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${language === 'ru' ? 'bg-white/10 font-semibold text-white' : 'hover:bg-white/5'}`}>Русский</button>
                  <button onClick={() => selectLang('uz')} className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${language === 'uz' ? 'bg-white/10 font-semibold text-white' : 'hover:bg-white/5'}`}>O'zbekcha</button>
                </div>
              )}
            </div>

            <button
              onClick={handleLaunch}
              className="border border-[#00e676]/50 text-[#00e676] hover:bg-[#00e676]/10 px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              {t.landing.openWebApp}
            </button>
          </div>
        </div>
      </header>

      {/* B. Hero Section */}
      <section className="w-full bg-[#0a0d12] py-24 sm:py-32 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="w-full md:w-[45%] flex flex-col items-start">
            <h1 className="text-[48px] sm:text-[60px] font-extrabold leading-[1.07] text-white tracking-tight mb-6">
              {t.landing.heroTitle}
            </h1>
            <p className="text-[17px] leading-[1.6] text-slate-400 max-w-[440px] mb-8">
              {t.landing.heroSubtitle}
            </p>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <button
                onClick={handleLaunch}
                className="bg-[#00e676] text-black font-bold px-6 py-3 rounded-xl hover:brightness-110 shadow-[0_0_25px_rgba(0,230,118,0.25)] transition-all flex items-center group cursor-pointer"
              >
                {t.landing.launchBtn}
                <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                type="button"
                onClick={() => setIsDisposableModalOpen(true)}
                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold px-5 py-3 rounded-xl transition-all flex items-center space-x-2 cursor-pointer shadow-[0_0_25px_rgba(0,230,118,0.25)] shadow-sm"
              >
                <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>{(t as any)?.disposable?.createTitle || 'Disposable Room'}</span>
              </button>
            </div>
          </div>

          <div className="w-full md:w-[55%] relative">
            <div className="bg-[#11161f] border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 max-w-[420px] w-full mx-auto relative z-10 transform md:rotate-2 md:hover:rotate-0 transition-all duration-500">
              {/* Mockup Chat Header */}
              <div className="flex items-center">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" alt="Alex Rivera" className="w-10 h-10 rounded-full object-cover" />
                <div className="ml-3">
                  <span className="text-white font-semibold text-sm block leading-tight">Alex Rivera</span>
                  <span className="text-slate-400 text-xs block font-mono mt-0.5">{language === 'ru' ? 'был(а) недавно' : language === 'uz' ? 'yaqinda tarmoqda edi' : 'last seen recently'}</span>
                </div>
              </div>

              <div className="border-b border-white/10 my-3" />

              {/* Mockup Chat Bubbles */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-start">
                  <div className="bg-[#1c2331] text-slate-200 border border-white/5 rounded-2xl rounded-bl-sm p-3 text-xs sm:text-sm max-w-[85%]">
                    Hey! Is the new WebRTC audio ready?
                    <div className="text-slate-400 text-[10px] font-mono text-right mt-1">19:58</div>
                  </div>
                </div>
                <div className="flex justify-end mt-1">
                  <div className="bg-[#0e3b2e] text-white border border-[#00e676]/20 rounded-2xl rounded-br-sm p-3 text-xs sm:text-sm max-w-[85%] ml-auto">
                    Yes, it connects browser-to-browser. Crystal clear. 🚀
                    <div className="text-[#00e676] text-[10px] font-mono flex items-center justify-end gap-1 mt-1">
                      19:59
                      <span className="flex relative w-3 h-3">
                        <svg className="absolute left-0 top-0 w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <svg className="absolute left-1.5 top-0 w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Background decorative blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#00e676]/10 blur-3xl rounded-full z-0 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Technical facts strip — breaks the card-mockup rhythm, states what's real */}
      <section className="w-full bg-[#0a0d12] border-y border-white/10">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
          <div className="py-8 sm:px-8 sm:first:pl-0">
            <p className="text-slate-500 text-sm mb-1.5">{t.landing.transport}</p>
            <p className="text-white font-medium">{t.landing.transportDesc}</p>
          </div>
          <div className="py-8 sm:px-8">
            <p className="text-slate-500 text-sm mb-1.5">{t.landing.audio}</p>
            <p className="text-white font-medium">{t.landing.audioDesc}</p>
          </div>
          <div className="py-8 sm:px-8 sm:last:pr-0">
            <p className="text-slate-500 text-sm mb-1.5">{t.landing.delivery}</p>
            <p className="text-white font-medium">{t.landing.deliveryDesc}</p>
          </div>
        </div>
      </section>

      {/* C. Feature Section 1 — call UI shown directly, no nested card */}
      <section id="features" className="w-full bg-[#0a0d12] py-24">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-16">
          <div className="w-full md:w-1/2 flex flex-col items-start">
            <h2 className="text-[32px] sm:text-[40px] font-extrabold leading-[1.14] text-white tracking-tight mb-6">
              {t.landing.feature1Title}
            </h2>
            <p className="text-[16px] text-slate-400 leading-[1.6] max-w-[460px]">
              {t.landing.feature1Desc}
            </p>
          </div>

          <div className="w-full md:w-1/2 flex items-center justify-center py-4">
            <div className="relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-[#00e676]/10 blur-3xl rounded-full z-0 pointer-events-none" />
              <div className="bg-[#0a0d12] border border-white/10 rounded-[16px] p-6 shadow-2xl w-[280px] flex flex-col items-center relative z-10">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#0a0d12] shadow-sm mb-4">
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" alt="Alex Rivera" className="w-full h-full object-cover" />
                </div>
                <h3 className="font-bold text-white text-lg mb-1">Alex Rivera</h3>
                <p className="text-[#00e676] font-medium text-sm mb-8 animate-pulse">{t.calls.incomingCall}...</p>
                <div className="flex w-full justify-around px-2">
                  <div className="w-14 h-14 rounded-full bg-[#ff3b30] flex items-center justify-center text-white shadow-lg shadow-[#ff3b30]/20">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-[#00e676] flex items-center justify-center text-black shadow-lg shadow-[#00e676]/20">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* D. Feature Section 2 — message path diagram replaces the terminal cliché */}
      <section className="w-full bg-[#0a0d12] py-24 border-t border-white/5">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col-reverse md:flex-row items-center justify-between gap-16">

          <div className="w-full md:w-1/2 flex items-center justify-center">
            <svg viewBox="0 0 400 140" className="w-full max-w-[360px]" role="img" aria-label="EzTalk direct messaging diagram">
              <line x1="55" y1="70" x2="345" y2="70" stroke="white" strokeOpacity="0.12" strokeWidth="2" />
              <circle cx="200" cy="70" r="3" fill="#00e676">
                <animate attributeName="cx" values="55;345;55" dur="3.2s" repeatCount="indefinite" />
              </circle>

              <circle cx="55" cy="70" r="28" fill="#11161f" stroke="white" strokeOpacity="0.1" />
              <text x="55" y="75" textAnchor="middle" fontSize="11" fill="white" fontWeight="600">{language === 'ru' ? 'Вы' : language === 'uz' ? 'Siz' : 'You'}</text>

              <rect x="168" y="42" width="64" height="56" rx="12" fill="#11161f" stroke="white" strokeOpacity="0.1" />
              <text x="200" y="66" textAnchor="middle" fontSize="9" fill="#94a3b8">Socket.io</text>
              <text x="200" y="80" textAnchor="middle" fontSize="9" fill="#94a3b8">server</text>

              <circle cx="345" cy="70" r="28" fill="#11161f" stroke="white" strokeOpacity="0.1" />
              <text x="345" y="75" textAnchor="middle" fontSize="11" fill="white" fontWeight="600">{language === 'ru' ? 'Друг' : language === 'uz' ? 'Do‘st' : 'Friend'}</text>
            </svg>
          </div>

          <div className="w-full md:w-1/2 flex flex-col items-start">
            <h2 className="text-[32px] sm:text-[40px] font-extrabold leading-[1.14] text-white tracking-tight mb-6">
              {t.landing.feature2Title}
            </h2>
            <p className="text-[16px] text-slate-400 leading-[1.6] max-w-[460px]">
              {t.landing.feature2Desc}
            </p>
          </div>

        </div>
      </section>

      {/* About Section */}
      <section id="about" className="w-full bg-[#07090d] py-24 border-t border-white/5 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00e676]/5 blur-[120px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3" />

        <div className="max-w-[1200px] mx-auto px-6 flex flex-col lg:flex-row items-center justify-between gap-16 relative z-10">
          <div className="w-full md:w-1/2 flex flex-col items-start">

            <h2 className="text-[32px] sm:text-[40px] font-extrabold leading-[1.14] text-white tracking-tight mb-6">
              {t.landing.aboutTitle} <span className="text-[#00e676]">EzTalk</span>
            </h2>

            <p className="text-[16px] text-slate-400 leading-[1.6] max-w-[460px] mb-6">
              {t.landing.aboutP1}
            </p>

            <p className="text-[16px] text-slate-400 leading-[1.6] max-w-[460px] mb-8">
              {t.landing.aboutP2}
            </p>

            <a href="https://github.com/VILDSTON/eztalk" target="_blank" rel="noopener noreferrer" className="flex items-center text-white font-semibold hover:text-[#00e676] transition-colors group">
              <span className="border-b-2 border-transparent group-hover:border-[#00e676] transition-all pb-0.5">{t.landing.aboutSource}</span>
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          <div className="w-full md:w-1/2 flex items-center justify-center">
            <div className="grid justify-items-center grid-cols-2 gap-20 sm:gap-16 w-full max-w-[460px]">
              <div className="bg-[#11161f] border border-white/10 rounded-2xl p-6 flex flex-col items-start hover:border-[#00e676]/30 transition-colors shadow-lg">
                <Globe className="w-7 h-7 text-[#00e676] mb-4" />
                <h4 className="text-white font-bold text-lg mb-2">{t.landing.featGlobalTitle}</h4>
                <p className="text-sm text-slate-400">{t.landing.featGlobalDesc}</p>
              </div>
              <div className="bg-[#11161f] border border-white/10 rounded-2xl p-6 flex flex-col items-start hover:border-[#00e676]/30 transition-colors shadow-lg translate-y-6">
                <Shield className="w-7 h-7 text-[#00e676] mb-4" />
                <h4 className="text-white font-bold text-lg mb-2">{t.landing.featPrivateTitle}</h4>
                <p className="text-sm text-slate-400">{t.landing.featPrivateDesc}</p>
              </div>
              <div className="bg-[#11161f] border border-white/10 rounded-2xl p-6 flex flex-col items-start hover:border-[#00e676]/30 transition-colors shadow-lg -translate-y-6">
                <Sun className="w-7 h-7 text-[#00e676] mb-4" />
                <h4 className="text-white font-bold text-lg mb-2">{t.landing.featBeautifulTitle}</h4>
                <p className="text-sm text-slate-400">{t.landing.featBeautifulDesc}</p>
              </div>
              <div className="bg-[#11161f] border border-white/10 rounded-2xl p-6 flex flex-col items-start hover:border-[#00e676]/30 transition-colors shadow-lg">
                <Code className="w-7 h-7 text-[#00e676] mb-4" />
                <h4 className="text-white font-bold text-lg mb-2">{t.landing.featOpenTitle}</h4>
                <p className="text-sm text-slate-400">{t.landing.featOpenDesc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real feature list — shipped functionality, shown as a plain list, not more cards */}
      <section id="features-list" className="w-full bg-[#0a0d12] py-24 border-t border-white/5">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-[32px] sm:text-[40px] font-extrabold leading-[1.14] text-white tracking-tight mb-12 max-w-[560px]">
            {t.landing.whatYouGetTitle} <span className="text-[#00e676]">EzTalk</span>?
          </h2>
          <div className="divide-y divide-white/10 border-t border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 py-6">
              <div className="flex items-center gap-3 sm:w-64 shrink-0">
                <Users className="w-5 h-5 text-[#00e676]" />
                <span className="text-white font-medium">{t.landing.wyFriendsTitle}</span>
              </div>
              <p className="text-slate-400 text-[15px]">{t.landing.wyFriendsDesc}</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 py-6">
              <div className="flex items-center gap-3 sm:w-64 shrink-0">
                <MessageSquare className="w-5 h-5 text-[#00e676]" />
                <span className="text-white font-medium">{t.landing.wyMessagesTitle}</span>
              </div>
              <p className="text-slate-400 text-[15px]">{t.landing.wyMessagesDesc}</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 py-6">
              <div className="flex items-center gap-3 sm:w-64 shrink-0">
                <Sun className="w-5 h-5 text-[#00e676]" />
                <span className="text-white font-medium">{t.landing.wyAppearanceTitle}</span>
              </div>
              <p className="text-slate-400 text-[15px]">{t.landing.wyAppearanceDesc}</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 py-6">
              <div className="flex items-center gap-3 sm:w-64 shrink-0">
                <Monitor className="w-5 h-5 text-[#00e676]" />
                <span className="text-white font-medium">{t.landing.wyWorksTitle}</span>
              </div>
              <p className="text-slate-400 text-[15px]">{t.landing.wyWorksDesc}</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 py-6">
              <div className="flex items-center gap-3 sm:w-64 shrink-0">
                <Shield className="w-5 h-5 text-[#00e676]" />
                <span className="text-white font-medium">{t.landing.wyAdsTitle}</span>
              </div>
              <p className="text-slate-400 text-[15px]">{t.landing.wyAdsDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* PWA Install CTA */}
      <section id='get-started' className="w-full bg-[#0a0d12] border-t border-white/5 py-16 flex justify-center px-6">
        <div className="bg-[#0a0d12] border border-white/10 rounded-2xl p-8 max-w-[800px] w-full flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h3 className="text-2xl font-bold text-white mb-2">{t.landing.pwaTitle}</h3>
            <p className="text-slate-400">{t.landing.pwaSubtitle}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleInstallClick}
              className="flex items-center whitespace-nowrap bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg"
            >
              <Download className="w-5 h-5 mr-2 text-[#00e676]" />
              {t.landing.installBtn}
            </button>
            <button
              onClick={handleLaunch}
              className="flex items-center whitespace-nowrap bg-[#00e676] hover:brightness-110 text-black px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(0,230,118,0.2)]"
            >
              {t.landing.launchBtn}
              <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          </div>
        </div>
      </section>

      {/* E. Footer */}
      <footer className="w-full bg-[#07090d] border-t border-white/10 text-gray-400 pt-16 pb-8">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
          <div className="col-span-1 md:col-span-2 pr-8">
            <div className="flex items-center space-x-2 mb-6">
              <img src="/icons/icon-192x192.png" alt="EzTalk Logo" className="w-8 h-8 rounded-lg object-cover" />
              <span className="font-bold text-lg tracking-tight text-[#00e676]">EzTalk</span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm mb-6">
              {t.landing.footerDesc}
            </p>
            <p className="text-sm font-medium opacity-50">
              &copy; {new Date().getFullYear()} EzTalk. All rights reserved.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">{t.landing.productTitle}</h4>
            <ul className="space-y-3 text-sm">
              <li><button onClick={handleLaunch} className="hover:text-white transition-colors">{t.landing.openWebApp}</button></li>
              <li><button onClick={handleInstallClick} className="hover:text-white transition-colors">{t.landing.desktopPwa}</button></li>
              <li><a href="https://github.com/VILDSTON/eztalk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t.landing.changelog}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">{t.landing.legalTitle}</h4>
            <div className="space-y-5 text-sm">
              <div>
                <button onClick={() => setLegalModal('privacy')} className="hover:text-white transition-colors flex items-center font-medium text-white mb-1"><Shield className="w-4 h-4 mr-1.5 text-[#00e676]" /> {t.landing.privacyPolicy}</button>
                <p className="text-xs text-slate-500 leading-relaxed">{t.landing.privacyShort}</p>
              </div>
              <div>
                <button onClick={() => setLegalModal('terms')} className="hover:text-white transition-colors flex items-center font-medium text-white mb-1"><FileText className="w-4 h-4 mr-1.5 text-[#00e676]" /> {t.landing.termsOfService}</button>
                <p className="text-xs text-slate-500 leading-relaxed">{t.landing.termsShort}</p>
              </div>
              <div className="pt-2">
                <a href="https://github.com/VILDSTON/eztalk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center"><Code className="w-4 h-4 mr-1.5" /> {t.landing.openSource}</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Legal Modals */}
      {legalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#11161f] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0a0d12]">
              <h2 className="text-lg font-bold text-white">
                {legalModal === 'privacy' ? t.legal.privacyTitle : t.legal.termsTitle}
              </h2>
              <button onClick={() => setLegalModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 text-slate-300 text-sm leading-relaxed space-y-6">
              {legalModal === 'privacy' ? (
                <>
                  <section>
                    <h3 className="font-bold text-white text-base mb-2">{t.legal.privacy1Title}</h3>
                    <p>{t.legal.privacy1Text}</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-white text-base mb-2">{t.legal.privacy2Title}</h3>
                    <p>{t.legal.privacy2Text}</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-white text-base mb-2">{t.legal.privacy3Title}</h3>
                    <p>{t.legal.privacy3Text}</p>
                  </section>
                </>
              ) : (
                <>
                  <section>
                    <h3 className="font-bold text-white text-base mb-2">{t.legal.sec1Title}</h3>
                    <p>{t.legal.sec1Text}</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-white text-base mb-2">{t.legal.sec2Title}</h3>
                    <p>{t.legal.sec2Text}</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-white text-base mb-2">{t.legal.sec3Title}</h3>
                    <p>{t.legal.sec3Text}</p>
                  </section>
                </>
              )}
            </div>
            <div className="p-4 border-t border-white/10 bg-[#0a0d12] flex justify-end">
              <button
                onClick={() => setLegalModal(null)}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {t.legal.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disposable Room Modal */}
      <CreateDisposableModal
        isOpen={isDisposableModalOpen}
        onClose={() => setIsDisposableModalOpen(false)}
      />
    </div>
  );
};
