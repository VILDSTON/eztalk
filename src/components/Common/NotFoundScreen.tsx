import React from 'react';
import { ArrowLeft, MessageSquareOff } from 'lucide-react';

export const NotFoundScreen: React.FC<{ onReturnHome: () => void }> = ({ onReturnHome }) => {
  return (
    <div className="w-full min-h-[100dvh] bg-[var(--ez-base)] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-[var(--ez-border)] flex items-center justify-center text-zinc-500 mb-6 shadow-xl">
        <MessageSquareOff className="w-8 h-8 text-[var(--ez-accent)]" />
      </div>

      <span className="font-mono text-xs uppercase tracking-widest text-[var(--ez-accent)] font-semibold mb-2">
        Error 404
      </span>
      <h1 className="text-2xl sm:text-3xl font-black text-zinc-100 tracking-tight mb-2">
        Диалог или страница не найдены
      </h1>
      <p className="text-xs sm:text-sm text-zinc-400 max-w-sm leading-relaxed mb-6">
        Кажется, эта ссылка устарела или страницы никогда не существовало. Вернитесь в список чатов.
      </p>

      <button
        type="button"
        onClick={onReturnHome}
        className="px-5 py-2.5 bg-[var(--ez-accent)] hover:brightness-110 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Вернуться к чатам</span>
      </button>
    </div>
  );
};
