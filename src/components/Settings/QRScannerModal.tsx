import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  Laptop,
  Monitor,
  Smartphone,
  Globe,
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import jsQR from 'jsqr';
import { ApiService } from '../../services/api';
import { QRScanResult } from '../../types/chat';
import { useTranslation } from '../../context/LanguageContext';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();

  const [step, setStep] = useState<'scan' | 'confirm' | 'success'>('scan');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scannedData, setScannedData] = useState<QRScanResult | null>(null);
  const [twoFactorPassword, setTwoFactorPassword] = useState('');
  const [show2FAPassword, setShow2FAPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isScanningRef = useRef(false);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Handle successful code capture (from camera or manual input)
  const processCode = useCallback(
    async (codeOrToken: string) => {
      const cleanToken = codeOrToken.trim().replace(/^eztalk:\/\/qr\//i, '');
      if (!cleanToken) return;

      stopCamera();
      setLoading(true);
      setErrorMsg(null);

      try {
        const result = await ApiService.scanQRLogin(cleanToken);
        if (result && result.valid) {
          setScannedData(result);
          setStep('confirm');
        } else {
          setErrorMsg(t.auth.invalidCode || 'Invalid or expired QR code');
          setStep('scan');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to scan QR code');
        setStep('scan');
      } finally {
        setLoading(false);
      }
    },
    [stopCamera, t]
  );

  // Frame scanner loop
  const scanLoop = useCallback(() => {
    if (!isScanningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (qrCode && qrCode.data) {
            isScanningRef.current = false;
            processCode(qrCode.data);
            return;
          }
        } catch {
          // ignore scan frame exception
        }
      }
    }

    if (isScanningRef.current) {
      animFrameRef.current = requestAnimationFrame(scanLoop);
    }
  }, [processCode]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setErrorMsg(null);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        // Fallback without constraints
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        isScanningRef.current = true;
        animFrameRef.current = requestAnimationFrame(scanLoop);
      }
    } catch (err: any) {
      console.warn('Camera access unavailable:', err);
      setCameraError(t.settings.cameraError || 'Camera access denied or unavailable');
    }
  }, [scanLoop, stopCamera, t]);

  // Start / stop camera on modal state changes
  useEffect(() => {
    if (isOpen && step === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, step, startCamera, stopCamera]);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setStep('scan');
      setCameraError(null);
      setManualCode('');
      setScannedData(null);
      setTwoFactorPassword('');
      setErrorMsg(null);
      setLoading(false);
    } else {
      stopCamera();
    }
  }, [isOpen, stopCamera]);

  if (!isOpen) return null;

  // Confirm authorization handler
  const handleConfirmLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scannedData?.qrToken) return;

    if (scannedData.requires2FA && !twoFactorPassword.trim()) {
      setErrorMsg(t.settings.minSixChars || 'Password is required');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await ApiService.confirmQRLogin(
        scannedData.qrToken,
        scannedData.requires2FA ? twoFactorPassword : undefined
      );

      if (res && res.success) {
        setStep('success');
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 1600);
      } else {
        setErrorMsg('Authorization failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authorization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processCode(manualCode.trim().toUpperCase());
  };

  const getDeviceIcon = (type?: string, os?: string) => {
    const o = (os || '').toLowerCase();
    const tp = (type || '').toLowerCase();
    if (tp === 'mobile' || o.includes('android') || o.includes('ios')) {
      return <Smartphone className="w-6 h-6 text-neon-green" />;
    }
    if (o.includes('mac') || o.includes('win') || o.includes('linux')) {
      return <Laptop className="w-6 h-6 text-neon-green" />;
    }
    return <Monitor className="w-6 h-6 text-neon-green" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-ez-surface/95 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-black/60 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-neon-green/10 border border-neon-green/20 text-neon-green">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                {step === 'confirm'
                  ? t.settings.confirmLoginTitle
                  : step === 'success'
                  ? 'Authorized'
                  : t.settings.scanQrCode}
              </h3>
              <p className="text-xs text-ez-muted">
                {step === 'confirm'
                  ? t.settings.confirmLoginPrompt
                  : t.settings.linkDesktop}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: SCANNER */}
        {step === 'scan' && (
          <div className="space-y-4">
            {/* Viewfinder / Video Box */}
            <div className="relative aspect-square w-full max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Target Overlays */}
              {!cameraError && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {/* Outer dark overlay ring */}
                  <div className="relative w-44 h-44 border-2 border-neon-green/40 rounded-2xl flex items-center justify-center overflow-hidden">
                    {/* Laser scanning line */}
                    <div className="absolute inset-x-0 h-0.5 bg-neon-green shadow-neon-sm animate-pulse top-1/2 -translate-y-1/2" />
                    {/* Corner accent marks */}
                    <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-neon-green" />
                    <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-neon-green" />
                    <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-neon-green" />
                    <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-neon-green" />
                  </div>
                </div>
              )}

              {/* Camera Error / Permission Fallback */}
              {cameraError && (
                <div className="absolute inset-0 p-4 bg-ez-elevated flex flex-col items-center justify-center text-center space-y-2">
                  <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-ez-muted font-medium max-w-[200px]">
                    {cameraError}
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t.common.retry}</span>
                  </button>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-ez-muted">
              {t.settings.pointCamera}
            </p>

            {/* Divider */}
            <div className="flex items-center space-x-3 pt-1">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                {t.settings.orEnterCode}
              </span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            {/* Manual 6-character code input form */}
            <form onSubmit={handleManualCodeSubmit} className="flex items-center space-x-2">
              <input
                type="text"
                maxLength={10}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder={t.settings.codePlaceholder || 'e.g. A3F9B2'}
                className="flex-1 bg-ez-base border border-white/10 focus:border-neon-green rounded-xl px-3.5 py-2.5 text-xs text-white uppercase font-mono tracking-widest text-center placeholder:text-zinc-600 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={loading || manualCode.trim().length < 4}
                className="px-4 py-2.5 rounded-xl bg-neon-green hover:bg-neon-green-light text-black text-xs font-extrabold shadow-neon-sm transition-transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center space-x-1"
              >
                <span>{loading ? t.common.loading : t.common.confirm}</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: CONFIRM LOGIN */}
        {step === 'confirm' && scannedData && (
          <form onSubmit={handleConfirmLogin} className="space-y-4 animate-fade-in">
            {/* Target Device Summary Card */}
            <div className="p-4 bg-ez-elevated rounded-2xl border border-white/10 flex items-center space-x-3.5">
              <div className="p-3 rounded-2xl bg-neon-green/10 border border-neon-green/20">
                {getDeviceIcon(scannedData.targetDevice?.type, scannedData.targetDevice?.os)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {scannedData.targetDevice?.os || 'Unknown OS'} •{' '}
                  {scannedData.targetDevice?.browser || 'Browser'}
                </div>
                <div className="text-xs text-ez-muted flex items-center space-x-2 mt-0.5">
                  <span className="flex items-center space-x-1">
                    <Globe className="w-3 h-3 text-zinc-500" />
                    <span>{scannedData.ip || 'Local Network'}</span>
                  </span>
                  <span>•</span>
                  <span className="text-neon-green font-medium">Pending Login</span>
                </div>
              </div>
            </div>

            {/* 2FA Cloud Password Requirement if active */}
            {scannedData.requires2FA ? (
              <div className="p-4 bg-ez-elevated rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-start space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-neon-green/10 text-neon-green border border-neon-green/20 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {t.settings.twoFactorTitle}
                    </h4>
                    <p className="text-[11px] text-ez-muted mt-0.5">
                      {t.settings.twoFactorRequiredNotice}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="relative flex items-center">
                    <input
                      type={show2FAPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      value={twoFactorPassword}
                      onChange={(e) => {
                        setTwoFactorPassword(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder={t.auth.twoStepPlaceholder || 'Enter Cloud Password'}
                      className="w-full bg-ez-base border border-white/10 focus:border-neon-green rounded-xl pl-3 pr-10 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShow2FAPassword(!show2FAPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {show2FAPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {scannedData.twoFactorHint && (
                    <p className="text-[11px] text-ez-muted mt-1.5 pl-1">
                      <strong className="text-zinc-400 font-semibold">{t.auth.hintLabel}:</strong>{' '}
                      {scannedData.twoFactorHint}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-ez-muted bg-white/[0.02] p-3 rounded-2xl border border-white/5 text-center leading-relaxed">
                By confirming, you authorize EzTalk on this device to access your chats, messages, and calls.
              </p>
            )}

            {/* Action buttons */}
            <div className="flex items-center space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('scan');
                  setTwoFactorPassword('');
                  setErrorMsg(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-ez-muted hover:text-white transition-colors cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-2.5 rounded-xl bg-neon-green hover:bg-neon-green-light text-black text-xs font-extrabold shadow-neon-sm transition-transform active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                {loading ? (
                  <span>{t.common.loading}</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>{t.settings.confirmAndLogIn}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-fade-in">
            <div className="p-4 rounded-full bg-neon-green/10 text-neon-green border border-neon-green/30 shadow-neon-md">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>
            <h4 className="text-base font-extrabold text-white">Device Authorized!</h4>
            <p className="text-xs text-ez-muted max-w-[220px]">
              You are now signed in on the other device.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
