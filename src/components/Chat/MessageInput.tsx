import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Smile, Send, X, Mic, Trash2, Check, CornerUpLeft, Edit3, Flame, Lock } from 'lucide-react';
import { Attachment, QuotedMessage } from '../../types/chat';

interface MessageInputProps {
  recipientHandle?: string;
  replyingTo?: QuotedMessage | null;
  editingMessage?: { id: string; text: string } | null;
  enterToSend?: boolean;
  activeTtl?: number;
  initialDraft?: string;
  onDraftChange?: (text: string) => void;
  onSendMessage: (
    text: string,
    attachment?: Attachment,
    replyTo?: QuotedMessage,
    ttlSeconds?: number,
    isSecret?: boolean
  ) => void;
  onSaveEdit?: (id: string, newText: string) => void;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  recipientHandle,
  replyingTo,
  editingMessage,
  enterToSend = true,
  activeTtl,
  initialDraft = '',
  onDraftChange,
  onSendMessage,
  onSaveEdit,
  onCancelReply,
  onCancelEdit,
}) => {
  const [inputText, setInputText] = useState(initialDraft || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentAttachment, setCurrentAttachment] = useState<Attachment | null>(null);

  // Voice recording & Web Audio Analyser peaks
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [livePeakLevels, setLivePeakLevels] = useState<number[]>([15, 25, 40, 20, 30]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const peaksCollectorRef = useRef<number[]>([]);
  const peakSampleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore draft when conversation changes
  useEffect(() => {
    setInputText(initialDraft || '');
  }, [recipientHandle, initialDraft]);

  useEffect(() => {
    if (editingMessage) {
      setInputText(editingMessage.text);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (peakSampleTimerRef.current) clearInterval(peakSampleTimerRef.current);
      if (draftDebounceTimerRef.current) clearTimeout(draftDebounceTimerRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleInputChange = (val: string) => {
    setInputText(val);
    if (onDraftChange) {
      if (draftDebounceTimerRef.current) clearTimeout(draftDebounceTimerRef.current);
      draftDebounceTimerRef.current = setTimeout(() => {
        onDraftChange(val);
      }, 300);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (editingMessage) {
      if (inputText.trim() && onSaveEdit) {
        onSaveEdit(editingMessage.id, inputText.trim());
      }
      setInputText('');
      if (onCancelEdit) onCancelEdit();
      return;
    }

    if (!inputText.trim() && !currentAttachment) return;

    onSendMessage(
      inputText.trim(),
      currentAttachment || undefined,
      replyingTo || undefined,
      activeTtl || undefined,
      Boolean(activeTtl)
    );

    setInputText('');
    if (onDraftChange) onDraftChange('');
    setCurrentAttachment(null);
    setShowEmojiPicker(false);
    if (onCancelReply) onCancelReply();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (enterToSend !== false) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const addEmoji = (emoji: string) => {
    const next = inputText + emoji;
    setInputText(next);
    if (onDraftChange) onDraftChange(next);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCurrentAttachment({
          id: `att_${Date.now()}`,
          name: file.name,
          type: isImage ? 'image' : 'file',
          url: reader.result,
          size: `${(file.size / 1024).toFixed(1)} KB`,
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Initialize Web Audio API Analyser for real-time waveform capture
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
        peaksCollectorRef.current = [];

        const freqData = new Uint8Array(analyser.frequencyBinCount);
        peakSampleTimerRef.current = setInterval(() => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(freqData);
          let sum = 0;
          for (let i = 0; i < freqData.length; i++) {
            sum += freqData[i];
          }
          const avg = sum / freqData.length;
          const normalized = Math.min(100, Math.max(12, Math.round((avg / 255) * 100)));
          peaksCollectorRef.current.push(normalized);

          // Live visual feedback
          setLivePeakLevels([
            Math.max(15, (freqData[1] || 20) / 2.5),
            Math.max(20, (freqData[3] || 35) / 2.5),
            Math.max(30, (freqData[5] || 50) / 2.2),
            Math.max(20, (freqData[7] || 30) / 2.5),
            Math.max(15, (freqData[9] || 20) / 2.5),
          ]);
        }, 80);
      } catch {
        // Fallback if AudioContext fails
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      alert('Microphone access is required to record voice notes.');
    }
  };

  const stopAndSendRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr || !isRecording) return;

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (peakSampleTimerRef.current) clearInterval(peakSampleTimerRef.current);

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    const duration = Math.max(1, recordingSeconds);

    // Resample peaks array to ~35 bars
    let rawPeaks = peaksCollectorRef.current;
    let finalPeaks: number[] = [];
    if (rawPeaks.length === 0) {
      finalPeaks = Array.from({ length: 32 }, () => Math.round(20 + Math.random() * 40));
    } else if (rawPeaks.length < 25) {
      finalPeaks = [...rawPeaks];
      while (finalPeaks.length < 32) {
        finalPeaks.push(Math.round(20 + Math.random() * 30));
      }
    } else {
      const targetCount = 36;
      const step = rawPeaks.length / targetCount;
      for (let i = 0; i < targetCount; i++) {
        finalPeaks.push(rawPeaks[Math.floor(i * step)] || 20);
      }
    }

    try {
      mr.requestData();
    } catch {}

    mr.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const audioAttachment: Attachment = {
            id: `att_voice_${Date.now()}`,
            name: 'Voice message',
            type: 'audio',
            url: reader.result,
            duration,
            size: `${(audioBlob.size / 1024).toFixed(1)} KB`,
            peaks: finalPeaks,
          };
          onSendMessage(
            '',
            audioAttachment,
            replyingTo || undefined,
            activeTtl || undefined,
            Boolean(activeTtl)
          );
          if (onCancelReply) onCancelReply();
        }
      };
      reader.readAsDataURL(audioBlob);
    };

    mr.stop();
    setIsRecording(false);
    setRecordingSeconds(0);
    peaksCollectorRef.current = [];
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (peakSampleTimerRef.current) clearInterval(peakSampleTimerRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    audioChunksRef.current = [];
    peaksCollectorRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const commonEmojis = [
    '😊', '😂', '🔥', '🚀', '💬', '🎉', '❤️', '💡', '✨', '⚡',
    '👍', '🙌', '😎', '🤩', '👋', '💯', '🎯', '⭐', '🤝', '🥳'
  ];

  return (
    <div className="w-full bg-ez-surface border-t border-ez-border/50 select-none font-sans shrink-0 flex-shrink-0 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-2 sm:py-2.5 relative min-w-0">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.txt"
        />

        {/* Reply Banner */}
        {replyingTo && (
          <div className="mb-2 flex items-center justify-between bg-ez-elevated border-l-2 border-neon-green px-3 py-1.5 rounded-lg text-xs animate-fade-in">
            <div className="flex items-center space-x-2 min-w-0 pr-2">
              <CornerUpLeft className="w-4 h-4 text-neon-green shrink-0" />
              <div className="truncate">
                <span className="font-bold text-neon-green mr-1.5">{replyingTo.senderHandle}:</span>
                <span className="text-gray-300 italic truncate">{replyingTo.text || 'Attachment'}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="text-ez-muted hover:text-white p-1 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Editing Banner */}
        {editingMessage && (
          <div className="mb-2 flex items-center justify-between bg-ez-elevated border-l-2 border-amber-500 px-3 py-1.5 rounded-lg text-xs text-amber-400 animate-fade-in">
            <div className="flex items-center space-x-2 min-w-0">
              <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-semibold">Editing message</span>
            </div>
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-ez-muted hover:text-white p-1 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Active TTL Secret Notice */}
        {activeTtl && (
          <div className="mb-2 flex items-center space-x-1.5 text-[11px] font-mono text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
            <Flame className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            <span>Self-destruct timer: <strong className="text-white">{activeTtl}s</strong> (burns after reading)</span>
          </div>
        )}

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-14 right-2 sm:right-6 bg-ez-elevated border border-ez-border p-2.5 sm:p-3 rounded-2xl shadow-glass-lg z-30 animate-scale-up max-w-[280px] sm:max-w-xs">
            <div className="text-[11px] font-bold text-ez-muted mb-2 px-1 uppercase tracking-wider">
              Emoji
            </div>
            <div className="grid grid-cols-5 gap-1">
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addEmoji(emoji)}
                  className="text-xl hover:scale-125 p-1.5 rounded-xl hover:bg-white/10 transition-transform duration-100 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Attachment Preview */}
        {currentAttachment && (
          <div className="mb-2 flex items-center space-x-2.5 bg-ez-elevated border border-ez-border p-2 rounded-xl max-w-sm animate-fade-in">
            {currentAttachment.type === 'image' ? (
              <img
                src={currentAttachment.url}
                alt="preview"
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                <Paperclip className="w-4 h-4 text-neon-green" />
              </div>
            )}
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-xs font-semibold text-white truncate">{currentAttachment.name}</p>
              <p className="text-[10px] text-ez-muted">{currentAttachment.size}</p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentAttachment(null)}
              className="text-ez-muted hover:text-white p-1 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Voice Recording Bar */}
        {isRecording ? (
          <div className="h-10 sm:h-11 bg-ez-elevated border border-rose-500/30 rounded-xl sm:rounded-2xl flex items-center justify-between px-3 sm:px-4 w-full min-w-0 animate-fade-in">
            <div className="flex items-center space-x-2.5 min-w-0 pr-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-glow-pulse shrink-0" />
              <span className="text-xs font-bold text-rose-400 font-mono truncate">
                {formatTimer(recordingSeconds)}
              </span>
              {/* Real-time audio waveform equalizer animation */}
              <div className="hidden sm:flex items-center space-x-1 h-5 px-2">
                {livePeakLevels.map((lvl, idx) => (
                  <div
                    key={idx}
                    className="w-1 bg-rose-400 rounded-full transition-all duration-75"
                    style={{ height: `${lvl}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-1.5 rounded-full text-ez-muted hover:text-rose-400 hover:bg-white/10 cursor-pointer transition-colors duration-150 shrink-0"
                title="Cancel"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopAndSendRecording}
                className="w-8 h-8 rounded-full bg-neon-green text-black flex items-center justify-center cursor-pointer shadow-neon-sm transition-transform duration-150 hover:scale-105 shrink-0"
                title="Send voice note"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Standard Input Bar */
          <form onSubmit={handleSend} className="flex items-center space-x-1.5 sm:space-x-2 w-full min-w-0">
            {/* Attachment */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 sm:p-2.5 rounded-full text-ez-muted hover:text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer shrink-0"
              title="Attach Media or File"
            >
              <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Input Container */}
            <div className="flex-1 min-w-0 flex items-center bg-ez-input rounded-xl sm:rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent focus-within:border-neon-green/25 transition-colors duration-150">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={editingMessage ? 'Edit message...' : 'Write a message...'}
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs sm:text-sm text-gray-100 placeholder-ez-muted font-sans"
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-ez-muted hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors duration-150 cursor-pointer ml-1 shrink-0"
              >
                <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Send / Mic */}
            {inputText.trim() || currentAttachment || editingMessage ? (
              <button
                type="submit"
                className="w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] rounded-full bg-neon-green hover:bg-neon-green-light text-black flex items-center justify-center cursor-pointer shadow-neon-sm transition-transform duration-150 hover:scale-105 shrink-0"
                title={editingMessage ? 'Save edit' : 'Send'}
              >
                {editingMessage ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] rounded-full flex items-center justify-center text-ez-muted hover:text-neon-green hover:bg-white/10 transition-colors duration-150 cursor-pointer shrink-0"
                title="Record Voice Note"
              >
                <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
