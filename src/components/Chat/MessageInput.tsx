import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Smile, Send, X, Mic, Trash2, Check, CornerUpLeft, Edit3 } from 'lucide-react';
import { Attachment, QuotedMessage } from '../../types/chat';

interface MessageInputProps {
  recipientHandle?: string;
  replyingTo?: QuotedMessage | null;
  editingMessage?: { id: string; text: string } | null;
  onSendMessage: (text: string, attachment?: Attachment, replyTo?: QuotedMessage) => void;
  onSaveEdit?: (id: string, newText: string) => void;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  recipientHandle,
  replyingTo,
  editingMessage,
  onSendMessage,
  onSaveEdit,
  onCancelReply,
  onCancelEdit,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentAttachment, setCurrentAttachment] = useState<Attachment | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingMessage) {
      setInputText(editingMessage.text);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

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

    onSendMessage(inputText.trim(), currentAttachment || undefined, replyingTo || undefined);
    setInputText('');
    setCurrentAttachment(null);
    setShowEmojiPicker(false);
    if (onCancelReply) onCancelReply();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
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
    if (!mediaRecorderRef.current || !isRecording) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    const duration = recordingSeconds;

    mediaRecorderRef.current.onstop = () => {
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
          };
          onSendMessage('', audioAttachment, replyingTo || undefined);
          if (onCancelReply) onCancelReply();
        }
      };
      reader.readAsDataURL(audioBlob);
    };

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    audioChunksRef.current = [];
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
    <div className="w-full bg-[#111216] border-t border-white/5 select-none font-sans">
      <div className="max-w-3xl mx-auto px-4 py-2 relative">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,.pdf,.doc,.txt"
        />

        {/* Quoted Message Banner */}
        {replyingTo && (
          <div className="mb-2 flex items-center justify-between bg-[#1b1d24] border-l-3 border-[#00ff73] px-3 py-1.5 rounded-lg text-xs animate-fade-in">
            <div className="flex items-center space-x-2 min-w-0 pr-2">
              <CornerUpLeft className="w-4 h-4 text-[#00ff73] shrink-0" />
              <div className="truncate">
                <span className="font-bold text-[#00ff73] mr-1.5">{replyingTo.senderHandle}:</span>
                <span className="text-gray-300 italic truncate">{replyingTo.text || 'Attachment'}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="text-gray-400 hover:text-white p-1 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Editing Message Banner */}
        {editingMessage && (
          <div className="mb-2 flex items-center justify-between bg-[#1b1d24] border-l-3 border-amber-500 px-3 py-1.5 rounded-lg text-xs text-amber-400 animate-fade-in">
            <div className="flex items-center space-x-2 min-w-0">
              <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-semibold">Editing message</span>
            </div>
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-gray-400 hover:text-white p-1 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Emoji Picker Popup */}
        {showEmojiPicker && (
          <div className="absolute bottom-16 right-6 bg-[#1b1d24] border border-white/10 p-3 rounded-2xl shadow-2xl z-30 animate-fade-in max-w-xs backdrop-blur-md">
            <div className="text-[11px] font-bold text-gray-400 mb-2 px-1 uppercase tracking-wider">
              Emoji
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addEmoji(emoji)}
                  className="text-xl hover:scale-130 p-2 rounded-xl hover:bg-white/10 transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Attachment Preview */}
        {currentAttachment && (
          <div className="mb-2 flex items-center space-x-2.5 bg-[#1b1d24] border border-white/10 p-2 rounded-xl max-w-sm animate-fade-in">
            {currentAttachment.type === 'image' ? (
              <img
                src={currentAttachment.url}
                alt="preview"
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                <Paperclip className="w-4 h-4 text-[#00ff73]" />
              </div>
            )}
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-xs font-semibold text-white truncate">{currentAttachment.name}</p>
              <p className="text-[10px] text-gray-400">{currentAttachment.size}</p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentAttachment(null)}
              className="text-gray-400 hover:text-white p-1 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Voice Recording State */}
        {isRecording ? (
          <div className="h-11 bg-[#1c1e24] border border-rose-500/40 rounded-full flex items-center justify-between px-4 animate-pulse">
            <div className="flex items-center space-x-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-bold text-rose-400 font-mono">
                Recording: {formatTimer(recordingSeconds)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-1.5 rounded-full text-gray-400 hover:text-rose-400 hover:bg-white/10 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopAndSendRecording}
                className="w-8 h-8 rounded-full bg-[#00ff73] text-black flex items-center justify-center cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Telegram Standard Input Bar */
          <form onSubmit={handleSend} className="flex items-center space-x-2">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Attach File"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Input Box */}
            <div className="flex-1 flex items-center bg-[#1c1e24] rounded-2xl px-4 py-2 border border-transparent focus-within:border-[#00ff73]/30 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={editingMessage ? 'Edit your message...' : 'Write a message...'}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-100 placeholder-gray-500 font-sans min-w-0"
              />

              {/* Emoji Button inside input */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer ml-1.5 shrink-0"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>

            {/* Dynamic Mic / Send Action Button (Telegram style) */}
            {inputText.trim() || currentAttachment || editingMessage ? (
              <button
                type="submit"
                className="w-10 h-10 rounded-full bg-[#00ff73] hover:bg-[#1aff85] text-black flex items-center justify-center cursor-pointer shadow-xs transition-transform hover:scale-105 shrink-0"
                title={editingMessage ? 'Save edit' : 'Send'}
              >
                {editingMessage ? <Check className="w-5 h-5" /> : <Send className="w-5 h-5 ml-0.5" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="p-2.5 rounded-full text-gray-400 hover:text-[#00ff73] hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title="Record Voice Note"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
