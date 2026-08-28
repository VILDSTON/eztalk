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

  // Sync editing text if editingMessage changes
  useEffect(() => {
    if (editingMessage) {
      setInputText(editingMessage.text);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  // Clean up recording timer on unmount
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

  // Start Voice Recording
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

  // Stop & Send Voice Recording
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

  // Cancel Recording
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
    <div className="px-6 pt-2 pb-5 bg-[#16171b] relative select-none">
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
        <div className="mb-2 flex items-center justify-between bg-[#1f2129] border border-[#00ff73]/30 px-3.5 py-2 rounded-xl text-xs text-gray-200 animate-fade-in">
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
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editing Message Banner */}
      {editingMessage && (
        <div className="mb-2 flex items-center justify-between bg-[#1f2129] border border-yellow-500/40 px-3.5 py-2 rounded-xl text-xs text-yellow-400 animate-fade-in">
          <div className="flex items-center space-x-2 min-w-0">
            <Edit3 className="w-4 h-4 text-yellow-400 shrink-0" />
            <span className="font-semibold">Editing message</span>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-8 bg-[#1f2026] border border-[#2d2f38] p-3 rounded-2xl shadow-2xl z-30 animate-fade-in max-w-xs">
          <div className="text-[11px] font-bold text-gray-400 mb-2 px-1">Emojis</div>
          <div className="grid grid-cols-5 gap-1.5">
            {commonEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="text-xl hover:scale-125 hover:bg-white/10 p-1.5 rounded-lg transition-transform text-center"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachment Preview (if selected) */}
      {currentAttachment && (
        <div className="mb-2.5 flex items-center space-x-2.5 bg-[#1f2129] border border-[#2d303b] p-2 rounded-xl max-w-sm animate-fade-in">
          {currentAttachment.type === 'image' ? (
            <img
              src={currentAttachment.url}
              alt="attachment preview"
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[#272935] flex items-center justify-center text-gray-300">
              <Paperclip className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-xs font-semibold text-white truncate">{currentAttachment.name}</p>
            <p className="text-[10px] text-gray-400">{currentAttachment.size}</p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentAttachment(null)}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Voice Recording Active Bar */}
      {isRecording ? (
        <div className="h-12 bg-[#1b1d24] border border-red-500/50 rounded-2xl flex items-center justify-between px-4 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-bold text-red-400 tracking-wide font-mono">
              Recording: {formatTimer(recordingSeconds)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Cancel recording"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={stopAndSendRecording}
              className="p-2 rounded-xl bg-[#00ff73] text-black hover:bg-[#1aff85] transition-colors shadow-neon-sm cursor-pointer"
              title="Send voice message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Regular Message Input Bar */
        <form
          onSubmit={handleSend}
          className="h-12 bg-[#1b1d24] border border-[#262830] focus-within:border-[#00ff73]/60 focus-within:shadow-[0_0_12px_rgba(0,255,115,0.15)] rounded-2xl flex items-center px-3.5 transition-all duration-200"
        >
          {/* Paperclip attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            title="Attach image or file"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Emoji button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer ml-0.5"
            title="Insert emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={editingMessage ? 'Edit your message...' : `Message ${recipientHandle || 'in chat'}...`}
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-100 placeholder-gray-500 px-3 min-w-0"
          />

          {/* Microphone voice button (when no text typed) */}
          {!inputText.trim() && !currentAttachment && !editingMessage && (
            <button
              type="button"
              onClick={startRecording}
              className="text-gray-400 hover:text-[#00ff73] p-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer mr-1"
              title="Record voice note"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() && !currentAttachment}
            className={`p-2 rounded-xl transition-all duration-150 flex items-center justify-center cursor-pointer ${
              inputText.trim() || currentAttachment
                ? 'bg-[#00ff73] text-black shadow-neon-sm hover:scale-105 active:scale-95'
                : 'bg-transparent text-gray-600 cursor-not-allowed'
            }`}
            title={editingMessage ? 'Save edit' : 'Send message'}
          >
            {editingMessage ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      )}
    </div>
  );
};
