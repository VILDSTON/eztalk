import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';
import { useModalTransition } from '../../hooks/useModalTransition';

interface DateCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (dateKey: string) => void;
  selectedDateKey?: string | null;
  datesWithMessages?: Set<string>;
  initialDate?: Date;
}

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${month + 1}-${day}`;
}

export const DateCalendarModal: React.FC<DateCalendarModalProps> = ({
  isOpen,
  onClose,
  onSelectDate,
  selectedDateKey,
  datesWithMessages,
  initialDate,
}) => {
  const { t, language } = useTranslation();

  const { shouldRender, isClosing, handleClose } = useModalTransition({
    isOpen,
    onClose,
    durationMs: 170,
  });

  const baseDate = useMemo(() => initialDate || new Date(), [initialDate]);
  const [viewYear, setViewYear] = useState<number>(baseDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(baseDate.getMonth()); // 0-indexed

  // Synchronize view month/year when modal opens
  useEffect(() => {
    if (isOpen) {
      const d = initialDate || new Date();
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [isOpen, initialDate]);

  // Close on Escape key
  useEffect(() => {
    if (!shouldRender) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shouldRender, handleClose]);

  const handlePrevMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  // Month & Year header display
  const monthName = useMemo(() => {
    const d = new Date(viewYear, viewMonth, 1);
    const locale = language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US';
    return d.toLocaleDateString(locale, { month: 'long' });
  }, [viewYear, viewMonth, language]);

  // Weekday abbreviations
  const weekDays = useMemo(() => {
    if (language === 'ru') {
      return ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    }
    if (language === 'uz') {
      return ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
    }
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }, [language]);

  // Generate calendar cells (6 rows x 7 days = 42 cells)
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      dateKey: string;
      hasMessages: boolean;
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    const now = new Date();
    const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const month = viewMonth === 0 ? 11 : viewMonth - 1;
      const year = viewMonth === 0 ? viewYear - 1 : viewYear;
      const key = toDateKey(year, month, day);
      cells.push({
        day,
        month,
        year,
        isCurrentMonth: false,
        dateKey: key,
        hasMessages: Boolean(datesWithMessages?.has(key)),
        isSelected: selectedDateKey === key,
        isToday: todayKey === key,
      });
    }

    // 2. Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const key = toDateKey(viewYear, viewMonth, day);
      cells.push({
        day,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        dateKey: key,
        hasMessages: Boolean(datesWithMessages?.has(key)),
        isSelected: selectedDateKey === key,
        isToday: todayKey === key,
      });
    }

    // 3. Next month leading days (fill up to 42 cells)
    const remaining = 42 - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const month = viewMonth === 11 ? 0 : viewMonth + 1;
      const year = viewMonth === 11 ? viewYear + 1 : viewYear;
      const key = toDateKey(year, month, day);
      cells.push({
        day,
        month,
        year,
        isCurrentMonth: false,
        dateKey: key,
        hasMessages: Boolean(datesWithMessages?.has(key)),
        isSelected: selectedDateKey === key,
        isToday: todayKey === key,
      });
    }

    return cells;
  }, [viewYear, viewMonth, datesWithMessages, selectedDateKey]);

  const handleCellClick = (cell: typeof calendarCells[0]) => {
    onSelectDate(cell.dateKey);
    handleClose();
  };

  const handleSelectToday = () => {
    const now = new Date();
    const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
    onSelectDate(todayKey);
    handleClose();
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[120] bg-black/75 flex items-center justify-center p-4 cursor-pointer select-none backdrop-blur-[2px] ${
        isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'
      }`}
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-[340px] bg-ez-elevated border border-ez-border rounded-3xl p-5 shadow-2xl flex flex-col transform-gpu will-change-[transform,opacity] cursor-default text-zinc-100 ${
          isClosing ? 'animate-modal-out' : 'animate-modal-in'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Month Year + Up / Down Chevrons */}
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-base font-bold tracking-tight capitalize text-white flex items-center space-x-1.5">
            <span>{monthName}</span>
            <span className="text-zinc-400 font-normal">{viewYear}</span>
          </h2>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title="Previous month"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title="Next month"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Weekday Names Header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {weekDays.map((wd, idx) => (
            <div
              key={idx}
              className="text-[12px] font-medium text-zinc-400/80 py-1"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar Matrix (42 cells) */}
        <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center mb-4">
          {calendarCells.map((cell, idx) => {
            const isHighlighted = cell.isSelected || (!selectedDateKey && cell.isToday);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleCellClick(cell)}
                style={
                  isHighlighted
                    ? {
                        backgroundColor: 'var(--ez-accent)',
                        color: '#000000',
                        boxShadow: '0 0 14px var(--ez-accent-glow)',
                      }
                    : undefined
                }
                className={`group relative h-10 w-full flex flex-col items-center justify-center rounded-full text-xs transition-all duration-150 cursor-pointer ${
                  isHighlighted
                    ? 'scale-105 font-black'
                    : cell.isCurrentMonth
                    ? 'text-zinc-200 hover:bg-white/10 hover:text-white active:scale-90 font-medium'
                    : 'text-zinc-600 hover:bg-white/5 hover:text-zinc-400 font-normal'
                }`}
              >
                <span className="leading-none">{cell.day}</span>

                {/* Dot indicator for days that have messages */}
                {cell.hasMessages && (
                  <span
                    className="absolute bottom-1 w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: isHighlighted ? '#000000' : 'var(--ez-accent)',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer: "Select days" / "Today" and "Close" */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 px-1">
          <button
            type="button"
            onClick={handleSelectToday}
            className="text-xs font-bold active:scale-95 transition-all cursor-pointer py-1 hover:opacity-80"
            style={{ color: 'var(--ez-accent)' }}
          >
            {t.chat.selectDays || 'Select days'}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="text-xs font-semibold text-zinc-400 hover:text-white active:scale-95 transition-all cursor-pointer py-1"
          >
            {t.chat.close || t.common.close || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
