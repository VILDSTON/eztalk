import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, Download, RotateCw, Maximize2, FileText, ExternalLink } from 'lucide-react';
import { Attachment } from '../../types/chat';
import { useTranslation } from '../../context/LanguageContext';
import { downloadOrOpenFile, isImageMedia, isVideoMedia } from '../../utils/fileDownloader';

interface MediaLightboxModalProps {
  isOpen: boolean;
  media: { url: string; name?: string; type?: 'image' | 'video' | 'file' | 'audio' } | null;
  onClose: () => void;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({ isOpen, media, onClose }) => {
  const { t, language } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [isOpen, media]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(4, z + 0.25));
      if (e.key === '-') setZoom((z) => Math.max(0.5, z - 0.25));
      if (e.key === '0') {
        setZoom(1);
        setRotation(0);
        setDragOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !media) return null;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadOrOpenFile(media.url, media.name);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    startPosRef.current = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setDragOffset({
      x: e.clientX - startPosRef.current.x,
      y: e.clientY - startPosRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // If dragged down significantly (>140px) and zoom is default, dismiss
    if (zoom === 1 && dragOffset.y > 140) {
      onClose();
    } else if (zoom === 1) {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const isVideo = isVideoMedia(media.url, media.name, media.type);
  const isImage = isImageMedia(media.url, media.name, media.type);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl animate-fade-in select-none font-sans"
    >
      {/* Top Floating Control Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 inset-x-4 max-w-2xl mx-auto flex items-center justify-between px-4 py-2.5 rounded-2xl bg-ez-elevated/80 border border-ez-border/60 backdrop-blur-xl shadow-glass-lg z-50 animate-scale-up"
      >
        <div className="flex items-center space-x-2 min-w-0 pr-3">
          <span className="text-xs font-bold text-white truncate">{media.name || 'Media Preview'}</span>
          {zoom !== 1 && (
            <span className="text-[10px] font-mono text-neon-green bg-neon-green/10 px-1.5 py-0.5 rounded">
              {Math.round(zoom * 100)}%
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {isImage && (
            <>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={t.lightbox.zoomOut}
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={t.lightbox.zoomIn}
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={t.lightbox.rotate}
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ez-muted hover:text-neon-green hover:bg-white/10 transition-colors cursor-pointer"
            title={t.chat.download}
          >
            <Download className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-ez-border/60 mx-1" />
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ez-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Media Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="relative max-w-[95vw] max-h-[85vh] flex items-center justify-center p-4 cursor-grab active:cursor-grabbing transition-transform duration-75"
        style={{
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
        }}
      >
        {isVideo ? (
          <video
            src={media.url}
            controls
            autoPlay
            playsInline
            className="max-w-full max-h-[80vh] rounded-2xl shadow-glass-lg border border-ez-border/40 object-contain"
          />
        ) : isImage ? (
          <img
            src={media.url}
            alt={media.name || 'Preview'}
            draggable={false}
            className="max-w-full max-h-[80vh] rounded-2xl shadow-glass-lg border border-ez-border/40 object-contain select-none"
          />
        ) : (
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-ez-elevated border border-ez-border rounded-3xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center text-center shadow-glass-lg animate-scale-up select-none cursor-default"
          >
            <div className="w-16 h-16 rounded-2xl bg-neon-green/15 text-neon-green flex items-center justify-center mb-4 border border-neon-green/30 shadow-neon-sm">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5 break-all max-w-full">
              {media.name || 'Document File'}
            </h3>
            <p className="text-[11px] text-ez-muted mb-5 leading-relaxed">
              {language === 'ru'
                ? 'Этот файл нельзя просмотреть как изображение. Вы можете скачать его или открыть на компьютере.'
                : language === 'uz'
                ? 'Ushbu faylni rasm sifatida ko‘rib bo‘lmaydi. Uni kompyuterga yuklab olishingiz yoki ochishingiz mumkin.'
                : 'This file cannot be previewed as an image. You can download or open it on your computer.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 w-full">
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 px-4 py-2.5 rounded-xl bg-neon-green text-black text-xs font-bold shadow-neon-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t.chat.download}</span>
              </button>
              <button
                type="button"
                onClick={() => window.open(media.url, '_blank')}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 cursor-pointer border border-white/10"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{language === 'ru' ? 'Открыть' : language === 'uz' ? 'Ochish' : 'Open'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dismiss Helper Tip */}
      <div className="absolute bottom-4 text-center pointer-events-none text-[11px] text-ez-muted/60 font-mono">
        {isImage ? 'Swipe down or press Esc to dismiss • Scroll / drag to pan' : 'Press Esc or click outside to close'}
      </div>
    </div>
  );
};
