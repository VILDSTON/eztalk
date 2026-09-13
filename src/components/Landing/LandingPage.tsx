import React from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { MessageSquare, Shield, Code, ChevronRight, Globe, Lock, Zap } from 'lucide-react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';

export const LandingPage: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const navigate = useLocalizedNavigate();

  const handleLaunch = () => {
    navigate('/login');
  };

  return (
    <div className="h-[100dvh] overflow-y-auto bg-[#0a0d12] text-white font-sans selection:bg-[#00e676]/30 selection:text-white">
      {/* A. Navigation Bar */}
      <header className="w-full bg-[#0a0d12]/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <div className="w-8 h-8 rounded-lg bg-[#00e676] flex items-center justify-center text-black">
              <MessageSquare className="w-4 h-4" />
            </div>
            <span className="font-semibold text-lg tracking-tight">EzTalk</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-300 hover:text-[#00e676] transition-colors">Features</a>
            <a href="#security" className="text-gray-300 hover:text-[#00e676] transition-colors">Security</a>
            <a href="https://github.com/VILDSTON/eztalk" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-[#00e676] transition-colors flex items-center">
              <Code className="w-4 h-4 mr-1.5" />
              GitHub
            </a>
            
            <div className="flex items-center text-gray-300 hover:text-[#00e676] transition-colors relative group cursor-pointer">
              <Globe className="w-4 h-4 mr-1.5" />
              <span className="uppercase text-sm">{language}</span>
              <div className="absolute top-full right-0 mt-2 bg-[#11161f] border border-white/10 rounded-lg shadow-2xl p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto w-32">
                <button onClick={() => setLanguage('en')} className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${language === 'en' ? 'bg-white/10 font-semibold text-white' : 'hover:bg-white/5'}`}>English</button>
                <button onClick={() => setLanguage('ru')} className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${language === 'ru' ? 'bg-white/10 font-semibold text-white' : 'hover:bg-white/5'}`}>Русский</button>
                <button onClick={() => setLanguage('uz')} className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${language === 'uz' ? 'bg-white/10 font-semibold text-white' : 'hover:bg-white/5'}`}>O'zbekcha</button>
              </div>
            </div>
          </nav>

          <button 
            onClick={handleLaunch}
            className="border border-[#00e676]/50 text-[#00e676] hover:bg-[#00e676]/10 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Open Web App
          </button>
        </div>
      </header>

      {/* B. Hero Section */}
      <section className="w-full bg-[#0a0d12] py-24 sm:py-32 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="w-full md:w-[45%] flex flex-col items-start">
            <h1 className="text-[48px] sm:text-[60px] font-extrabold leading-[1.07] text-white tracking-tight mb-6">
              Light and Fast.
            </h1>
            <p className="text-[16px] leading-[1.5] text-slate-400 max-w-[480px] mb-8">
              A privacy-minded web messenger engineered for pure speed. No bloat, no tracking, zero lag.
            </p>
            <button 
              onClick={handleLaunch}
              className="bg-[#00e676] text-black font-bold px-6 py-3 rounded-xl hover:brightness-110 shadow-[0_0_25px_rgba(0,230,118,0.25)] transition-all flex items-center group"
            >
              Launch EzTalk Web
              <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="w-full md:w-[55%] relative">
            <div className="bg-[#11161f] border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 max-w-[420px] w-full mx-auto relative z-10 transform md:rotate-2 md:hover:rotate-0 transition-all duration-500">
              {/* Mockup Chat Header */}
              <div className="flex items-center">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" alt="Alex Rivera" className="w-10 h-10 rounded-full object-cover" />
                <div className="ml-3">
                  <span className="text-white font-semibold text-sm block leading-tight">Alex Rivera</span>
                  <span className="text-slate-400 text-xs block font-mono mt-0.5">last seen recently</span>
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

      {/* C. Feature Section 1 */}
      <section id="features" className="w-full bg-[#0a0d12] py-24">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="w-full md:w-1/2 flex flex-col items-start">
            <h2 className="text-[32px] sm:text-[40px] font-extrabold leading-[1.14] text-white tracking-tight mb-6">
              Direct P2P Audio & Video
            </h2>
            <p className="text-[16px] text-slate-400 leading-[1.5] max-w-[480px]">
              Calls connect directly between browsers via WebRTC. Real-time audio with crystal-clear voice clarity and zero relay servers.
            </p>
          </div>

          <div className="w-full md:w-1/2">
            <div className="bg-[#11161f] border border-white/5 rounded-[16px] p-8 sm:p-12 shadow-2xl relative overflow-hidden flex items-center justify-center">
              <div className="bg-[#0a0d12] border border-white/10 rounded-[16px] p-6 shadow-2xl w-full max-w-[280px] flex flex-col items-center relative z-10">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#0a0d12] shadow-sm mb-4">
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" alt="Alex Rivera" className="w-full h-full object-cover" />
                </div>
                <h3 className="font-bold text-white text-lg mb-1">Alex Rivera</h3>
                <p className="text-[#00e676] font-medium text-sm mb-8 animate-pulse">Incoming Call...</p>
                <div className="flex w-full justify-between px-2">
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

      {/* D. Feature Section 2 */}
      <section className="w-full bg-[#0a0d12] py-24 border-t border-white/5">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col-reverse md:flex-row items-center justify-between gap-12">
          
          <div className="w-full md:w-1/2">
            <div className="bg-[#11161f] rounded-[16px] p-8 shadow-2xl border border-white/5 flex items-center justify-center h-64">
              <div className="bg-[#0a0d12] border border-white/5 rounded-[8px] p-6 text-[#00e676] font-mono text-sm sm:text-base w-full shadow-inner overflow-hidden">
                <p>&#62; Connecting to socket...</p>
                <p>&#62; Establishing secure WS channel...</p>
                <p>&#62; [OK] Connected to wss://eztalk.app/socket</p>
                <p className="mt-4 text-slate-500 opacity-70 animate-pulse">_</p>
              </div>
            </div>
          </div>

          <div className="w-full md:w-1/2 flex flex-col items-start md:pl-12">
            <h2 className="text-[32px] sm:text-[40px] font-extrabold leading-[1.14] text-white tracking-tight mb-6">
              Engineered for Simplicity
            </h2>
            <p className="text-[16px] text-slate-400 leading-[1.5] max-w-[480px]">
              No heavy frameworks dragging you down. We built EzTalk Web on raw WebSockets and lightweight React to deliver instant messages and low-latency feedback.
            </p>
          </div>

        </div>
      </section>

      {/* E. Footer */}
      <footer className="w-full bg-[#07090d] border-t border-white/10 text-gray-400 pt-16 pb-8">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
          <div className="col-span-1 md:col-span-2 pr-8">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-white">EzTalk</span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm mb-6">
              An indie open-source project dedicated to building a fast, accessible, and privacy-respecting messenger for the modern web.
            </p>
            <p className="text-sm font-medium opacity-50">
              &copy; {new Date().getFullYear()} EzTalk. All rights reserved.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Web App</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Desktop PWA</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4">Security & Legal</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-white transition-colors flex items-center"><Shield className="w-4 h-4 mr-1.5" /> Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="https://github.com/VILDSTON/eztalk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center"><Code className="w-4 h-4 mr-1.5" /> Open Source</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};
