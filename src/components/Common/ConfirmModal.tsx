import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const resolvedCancelText = cancelText || t.common.cancel;
  const resolvedConfirmText = confirmText || t.common.confirm;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-ez-elevated border border-ez-border rounded-2xl p-5 shadow-2xl flex flex-col animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-3 mb-3 text-rose-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="text-base font-bold text-white leading-tight">{title}</h3>
        </div>
        
        <p className="text-sm text-gray-300 mb-6 leading-relaxed">
          {message}
        </p>

        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 hover:bg-white/10 hover:text-white transition-colors duration-150 cursor-pointer"
          >
            {resolvedCancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-sm transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer"
          >
            {resolvedConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
