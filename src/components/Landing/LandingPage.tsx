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
    <div className="min-h-screen bg-signal-white text-signal-ink font-sans selection:bg-signal-sky selection:text-signal-ink">
      {/* A. Navigation Bar */}
      <header className="w-full bg-signal-white border-b border-signal-fog sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <div className="w-8 h-8 rounded-lg bg-signal-ink flex items-center justify-center text-signal-white">
              <MessageSquare className="w-4 h-4" />
            </div>
            <span className="font-semibold text-lg tracking-tight">EzTalk</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-signal-deep hover:opacity-80 transition-opacity">Features</a>
            <a href="#security" className="text-signal-deep hover:opacity-80 transition-opacity">Security</a>
            <a href="https://github.com/VILDSTON/eztalk" target="_blank" rel="noopener noreferrer" className="text-signal-deep hover:opacity-80 transition-opacity flex items-center">
              <Code className="w-4 h-4 mr-1.5" />
              GitHub
            </a>
            
            <div className="flex items-center text-signal-deep relative group cursor-pointer">
              <Globe className="w-4 h-4 mr-1.5" />
              <span className="uppercase text-sm">{language}</span>
              <div className="absolute top-full right-0 mt-2 bg-signal-white border border-signal-fog rounded-lg shadow-signal p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto w-32">
                <button onClick={() => setLanguage('en')} className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${language === 'en' ? 'bg-signal-paper font-semibold' : 'hover:bg-signal-paper'}`}>English</button>
                <button onClick={() => setLanguage('ru')} className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${language === 'ru' ? 'bg-signal-paper font-semibold' : 'hover:bg-signal-paper'}`}>Русский</button>
                <button onClick={() => setLanguage('uz')} className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${language === 'uz' ? 'bg-signal-paper font-semibold' : 'hover:bg-signal-paper'}`}>O'zbekcha</button>
              </div>
            </div>
          </nav>

          <button 
            onClick={handleLaunch}
            className="bg-signal-white border-[1.5px] border-signal-blue text-signal-blue px-4 py-2 rounded-[8px] font-semibold hover:bg-signal-blue/5 transition-colors duration-200"
          >
            Open Web App
          </button>
        </div>
      </header>

      {/* B. Hero Section */}
      <section className="w-full bg-signal-sky py-24 sm:py-32 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="w-full md:w-[45%] flex flex-col items-start">
            <h1 className="text-[48px] sm:text-[60px] font-extrabold leading-[1.07] text-signal-ink tracking-tight mb-6">
              Light and Fast.
            </h1>
            <p className="text-[16px] leading-[1.5] text-signal-slate max-w-[480px] mb-8">
              A privacy-minded web messenger engineered for pure speed. No bloat, no tracking, zero lag.
            </p>
            <button 
              onClick={handleLaunch}
              className="bg-signal-white border-[1.5px] border-signal-blue text-signal-blue px-6 py-3 rounded-[8px] font-semibold hover:bg-signal-blue/5 transition-colors duration-200 shadow-signal flex items-center group"
            >
              Launch EzTalk Web
              <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="w-full md:w-[55%] relative">
            <div className="bg-signal-white rounded-[16px] shadow-signal p-4 relative z-10 w-full max-w-[500px] mx-auto aspect-[4/3] flex flex-col border border-signal-fog/50 overflow-hidden transform md:rotate-2 md:hover:rotate-0 transition-all duration-500">
              {/* Mockup Chat Header */}
              <div className="flex items-center px-4 py-3 border-b border-signal-fog mb-4">
                <div className="w-10 h-10 rounded-full bg-signal-mist/40" />
                <div className="ml-3">
                  <div className="w-24 h-4 bg-signal-slate/20 rounded mb-2" />
                  <div className="w-16 h-3 bg-signal-slate/10 rounded" />
                </div>
              </div>
              {/* Mockup Chat Bubbles */}
              <div className="flex-1 px-4 flex flex-col gap-4">
                <div className="flex justify-end">
                  <div className="bg-signal-blue text-signal-white px-4 py-2.5 rounded-l-2xl rounded-tr-2xl rounded-br-sm max-w-[75%]">
                    Hey! Is the new WebRTC audio ready?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-signal-paper text-signal-ink px-4 py-2.5 rounded-r-2xl rounded-tl-2xl rounded-bl-sm max-w-[75%] shadow-sm">
                    Yes, it connects browser-to-browser. Crystal clear. 🚀
                  </div>
                </div>
              </div>
            </div>
            
            {/* Background decorative blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-signal-blue/10 blur-3xl rounded-full z-0 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* C. Feature Section 1 */}
      <section id="features" className="w-full bg-signal-white py-24">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="w-full md:w-1/2 flex flex-col items-start">
            <h2 className="text-[32px] sm:text-[40px] font-extrabold leading-[1.14] text-signal-ink tracking-tight mb-6">
              Direct P2P Audio & Video
            </h2>
            <p className="text-[16px] text-signal-slate leading-[1.5] max-w-[480px]">
              Calls connect directly between browsers via WebRTC. Real-time audio with crystal-clear voice clarity and zero relay servers.
            </p>
          </div>

          <div className="w-full md:w-1/2">
            <div className="bg-signal-mist rounded-[16px] p-8 sm:p-12 shadow-signal relative overflow-hidden flex items-center justify-center">
              <div className="bg-signal-white rounded-[16px] p-6 shadow-signal w-full max-w-[280px] flex flex-col items-center relative z-10">
                <div className="w-20 h-20 rounded-full bg-signal-sky border-4 border-signal-white shadow-sm mb-4" />
                <h3 className="font-bold text-signal-ink text-lg mb-1">Alex Rivera</h3>
                <p className="text-signal-blue font-medium text-sm mb-8 animate-pulse">Incoming Call...</p>
                <div className="flex w-full justify-between px-2">
                  <div className="w-14 h-14 rounded-full bg-[#ff3b30] flex items-center justify-center text-white shadow-md">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-[#34c759] flex items-center justify-center text-white shadow-md">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* D. Feature Section 2 */}
      <section className="w-full bg-signal-paper py-24">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col-reverse md:flex-row items-center justify-between gap-12">
          
          <div className="w-full md:w-1/2">
            <div className="bg-signal-white rounded-[16px] p-8 shadow-signal border border-signal-fog flex items-center justify-center h-64">
              <div className="bg-signal-ink rounded-[8px] p-6 text-[#00ff00] font-mono text-sm sm:text-base w-full shadow-inner overflow-hidden">
                <p>&#62; Connecting to socket...</p>
                <p>&#62; Establishing secure WS channel...</p>
                <p>&#62; [OK] Connected to wss://eztalk.app/socket</p>
                <p className="mt-4 text-signal-slate opacity-70">_</p>
              </div>
            </div>
          </div>

          <div className="w-full md:w-1/2 flex flex-col items-start md:pl-12">
            <h2 className="text-[32px] sm:text-[40px] font-extrabold leading-[1.14] text-signal-ink tracking-tight mb-6">
              Engineered for Simplicity
            </h2>
            <p className="text-[16px] text-signal-slate leading-[1.5] max-w-[480px]">
              No heavy frameworks dragging you down. We built EzTalk Web on raw WebSockets and lightweight React to deliver instant messages and low-latency feedback.
            </p>
          </div>

        </div>
      </section>

      {/* E. Footer */}
      <footer className="w-full bg-signal-twilight text-signal-fog pt-16 pb-8">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
          <div className="col-span-1 md:col-span-2 pr-8">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-signal-fog flex items-center justify-center text-signal-twilight">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-white">EzTalk</span>
            </div>
            <p className="text-sm text-signal-slate max-w-sm mb-6 text-signal-fog/70">
              An indie open-source project dedicated to building a fast, accessible, and privacy-respecting messenger for the modern web.
            </p>
            <p className="text-sm font-medium">
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
