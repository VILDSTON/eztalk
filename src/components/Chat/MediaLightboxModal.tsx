import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, Download, RotateCw, Maximize2 } from 'lucide-react';
import { Attachment } from '../../types/chat';

interface MediaLightboxModalProps {
  isOpen: boolean;
  media: { url: string; name?: string; type?: 'image' | 'video' | 'file' | 'audio' } | null;
  onClose: () => void;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({ isOpen, media, onClose }) => {
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
    const a = document.createElement('a');
    a.href = media.url;
    a.download = media.name || 'eztalk_media';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  const isVideo =
    media.type === 'video' ||
    media.url.endsWith('.mp4') ||
    media.url.endsWith('.webm') ||
    media.url.startsWith('data:video');

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
          {!isVideo && (
            <>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-1.5 rounded-xl text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                className="p-1.5 rounded-xl text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 rounded-xl text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Rotate (90°)"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 rounded-xl text-ez-muted hover:text-neon-green hover:bg-white/10 transition-colors cursor-pointer"
            title="Download Media"
          >
            <Download className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-ez-border/60 mx-1" />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-ez-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Close (Esc)"
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
        ) : (
          <img
            src={media.url}
            alt={media.name || 'Preview'}
            draggable={false}
            className="max-w-full max-h-[80vh] rounded-2xl shadow-glass-lg border border-ez-border/40 object-contain select-none"
          />
        )}
      </div>

      {/* Dismiss Helper Tip */}
      <div className="absolute bottom-4 text-center pointer-events-none text-[11px] text-ez-muted/60 font-mono">
        Swipe down or press <span className="text-gray-300">Esc</span> to dismiss • Scroll / drag to pan
      </div>
    </div>
  );
};
