import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';
import { useModalTransition } from '../../hooks/useModalTransition';

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

  const { shouldRender, isClosing, handleClose } = useModalTransition({
    isOpen,
    onClose: onCancel,
    durationMs: 200,
  });

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

  if (!shouldRender) return null;

  const resolvedCancelText = cancelText || t.common.cancel;
  const resolvedConfirmText = confirmText || t.common.confirm;

  const handleConfirmClick = () => {
    onConfirm();
    handleClose();
  };

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-pointer ${
        isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'
      }`}
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-sm bg-ez-elevated border border-ez-border rounded-2xl p-5 shadow-2xl flex flex-col transform-gpu will-change-[transform,opacity] cursor-default ${
          isClosing ? 'animate-modal-out' : 'animate-modal-in'
        }`}
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
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 hover:bg-white/10 hover:text-white transition-colors duration-150 cursor-pointer"
          >
            {resolvedCancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-sm transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer"
          >
            {resolvedConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
