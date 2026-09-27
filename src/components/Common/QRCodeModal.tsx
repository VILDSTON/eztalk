import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode, Smartphone } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  subtitle?: string;
  tip?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
  subtitle,
  tip,
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
  const resolvedTip =
    tip || (t as any)?.disposable?.qrCodeTip || 'Fast camera scan • No login required';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy QR link:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-ez-elevated/95 border border-neon-green/30 rounded-3xl p-6 shadow-[0_0_35px_rgba(16,185,129,0.2)] backdrop-blur-xl flex flex-col items-center text-center animate-scale-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-44 h-24 bg-neon-green/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          title={(t as any)?.common?.close || 'Close'}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="w-12 h-12 rounded-2xl bg-neon-green/15 border border-neon-green/30 flex items-center justify-center text-neon-green mb-3 shadow-neon-sm">
          <QrCode className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-white tracking-tight">{resolvedTitle}</h3>
        <p className="text-xs text-ez-muted mt-1 max-w-[260px] leading-relaxed">
          {resolvedSubtitle}
        </p>

        {/* QR Code Container with High-Contrast White Background & Neon Glow */}
        <div className="my-5 p-4 bg-white rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.25)] border-2 border-neon-green/40 flex items-center justify-center transition-transform hover:scale-[1.02] duration-200">
          <QRCodeSVG
            value={url}
            size={196}
            level="M"
            marginSize={1}
            title={resolvedTitle}
          />
        </div>

        {/* Fast Scan Tip Badge */}
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/25 text-neon-green text-[11px] font-medium mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          <Smartphone className="w-3 h-3 shrink-0" />
          <span>{resolvedTip}</span>
        </div>

        {/* URL Box & Copy Button */}
        <div className="w-full bg-black/40 border border-ez-border rounded-xl p-1.5 flex items-center space-x-2 mb-4">
          <span className="text-[11px] font-mono text-neon-green/90 truncate flex-1 text-left px-2 select-all">
            {url}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-neon-green hover:bg-neon-green-light text-black text-xs font-bold flex items-center space-x-1.5 shadow-neon-sm transition-all active:scale-95 cursor-pointer shrink-0"
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
