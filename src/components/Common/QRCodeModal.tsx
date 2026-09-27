import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';
import { haptic } from '../../utils/haptics';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  subtitle?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
  subtitle,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resolvedTitle = title || (t as any)?.disposable?.qrCodeTitle || 'QR Code to Join';
  const resolvedSubtitle =
    subtitle ||
    (t as any)?.disposable?.qrCodeSubtitle ||
    'Scan with your smartphone camera to connect instantly';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      haptic.medium();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy QR link:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/85 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-ez-elevated qr-modal-card rounded-3xl p-6 flex flex-col items-center text-center animate-scale-up overflow-hidden transform-gpu will-change-[transform,opacity]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-44 h-24 rounded-full blur-2xl pointer-events-none opacity-30"
          style={{ backgroundColor: 'var(--ez-accent)' }}
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-ez-muted hover:text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer"
          title={(t as any)?.common?.close || 'Close'}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-neon-sm"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--ez-accent) 15%, transparent)',
            border: '1px solid color-mix(in srgb, var(--ez-accent) 30%, transparent)',
            color: 'var(--ez-accent)',
          }}
        >
          <QrCode className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-white tracking-tight">{resolvedTitle}</h3>
        <p className="text-xs text-ez-muted mt-1 max-w-[260px] leading-relaxed">
          {resolvedSubtitle}
        </p>

        {/* Theme-Adaptive QR Code Container with Border, Shadow & Hover matching current theme */}
        <div className="my-5 p-4 bg-white rounded-2xl flex items-center justify-center qr-code-box cursor-pointer">
          <QRCodeSVG
            value={url}
            size={196}
            level="M"
            marginSize={1}
            title={resolvedTitle}
          />
        </div>

        {/* URL Box & Copy Button */}
        <div className="w-full bg-black/40 border border-ez-border rounded-xl p-1.5 flex items-center space-x-2 mb-4">
          <span
            className="text-[11px] font-mono truncate flex-1 text-left px-2 select-all"
            style={{ color: 'var(--ez-accent)' }}
          >
            {url}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg text-black text-xs font-bold flex items-center space-x-1.5 shadow-neon-sm transition-all active:scale-95 cursor-pointer shrink-0"
            style={{ backgroundColor: 'var(--ez-accent)' }}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{(t as any)?.common?.copied || 'Copied'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{(t as any)?.common?.copy || 'Copy'}</span>
              </>
            )}
          </button>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
        >
          {(t as any)?.common?.close || 'Close'}
        </button>
      </div>
    </div>
  );
};
