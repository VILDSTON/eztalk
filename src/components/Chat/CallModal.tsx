import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Radio, Sparkles, ShieldCheck } from 'lucide-react';
import { User, CallInfo } from '../../types/chat';
import { socketService } from '../../services/socket';
import { normalizeHandle } from '../../utils/chatStorage';
import { callSoundService } from '../../utils/callSounds';

interface CallModalProps {
  user: User;
  currentUser: User;
  isOpen: boolean;
  isInitiator?: boolean;
  onClose: (callInfo?: CallInfo) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
  iceCandidatePoolSize: 10,
};

export const CallModal: React.FC<CallModalProps> = ({
  user,
  currentUser,
  isOpen,
  isInitiator = true,
  onClose,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [callState, setCallState] = useState<'calling' | 'ringing' | 'connected' | 'ended'>(
    isInitiator ? 'calling' : 'connected'
  );
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 30, 45, 20, 50, 25, 40, 15]);

  const durationRef = useRef(0);
  durationRef.current = callDuration;

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const hasOfferedRef = useRef<boolean>(false);

  // Setup real-time audio visualizer analyzing live microphone input
  const initAudioVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateWaveform = () => {
        analyser.getByteFrequencyData(dataArray);
        const sampled = [
          Math.max(10, Math.round((dataArray[0] / 255) * 80)),
          Math.max(14, Math.round((dataArray[1] / 255) * 90)),
          Math.max(18, Math.round((dataArray[2] / 255) * 100)),
          Math.max(14, Math.round((dataArray[3] / 255) * 85)),
          Math.max(18, Math.round((dataArray[4] / 255) * 95)),
          Math.max(14, Math.round((dataArray[5] / 255) * 75)),
          Math.max(10, Math.round((dataArray[6] / 255) * 70)),
          Math.max(8, Math.round((dataArray[7] / 255) * 60)),
        ];
        setAudioLevels(sampled);
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      updateWaveform();
    } catch {
      // Audio visualizer fallback
    }
  };

  // Flush queued ICE candidates safely once remote description is active
  const flushPendingCandidates = (pc: RTCPeerConnection) => {
    while (pendingCandidatesRef.current.length > 0) {
      const candidate = pendingCandidatesRef.current.shift();
      if (candidate) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
    }
  };

  // WebRTC PeerConnection Lifecycle
  useEffect(() => {
    if (!isOpen) {
      callSoundService.stopAll();
      return;
    }

    let pc: RTCPeerConnection;
    let isCleanedUp = false;

    const setupWebRTC = async () => {
      try {
        pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        // Capture user microphone with echo cancellation
        const localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        if (isCleanedUp) {
          localStream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = localStream;
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });

        // Start visualizer with mic stream
        initAudioVisualizer(localStream);

        // Handle remote audio stream
        pc.ontrack = (event) => {
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch(() => {});
          }
          callSoundService.stopAll();
          setCallState('connected');
        };

        // ICE Candidate handler
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socketService.sendWebRTCSignal(user.handle, currentUser.handle, {
              type: 'candidate',
              candidate: event.candidate,
            });
          }
        };

        // Peer connection state changes
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            callSoundService.stopAll();
            setCallState('connected');
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            setCallState('ended');
            const info: CallInfo = {
              type: isInitiator ? 'outgoing' : 'incoming',
              duration: durationRef.current,
            };
            setTimeout(() => onClose(info), 600);
          }
        };

        // Initiation logic
        if (isInitiator) {
          setCallState('calling');
          callSoundService.playOutgoing();
          socketService.sendCall(currentUser, user.handle);
        } else {
          // Recipient accepted -> notify initiator that recipient is ready for offer
          callSoundService.stopAll();
          setCallState('connected');
          socketService.answerCall(user.handle, currentUser);
        }
      } catch (err) {
        console.warn('Microphone access or WebRTC error:', err);
        callSoundService.stopAll();
        setCallState('connected');
      }
    };

    setupWebRTC();

    // Create and send WebRTC Offer from Initiator
    const createAndSendOffer = async () => {
      const currentPc = peerConnectionRef.current;
      if (!currentPc || hasOfferedRef.current) return;
      hasOfferedRef.current = true;
      try {
        const offer = await currentPc.createOffer({
          offerToReceiveAudio: true,
          voiceActivityDetection: true,
        });
        await currentPc.setLocalDescription(offer);
        socketService.sendWebRTCSignal(user.handle, currentUser.handle, {
          type: 'offer',
          sdp: offer,
        });
      } catch (e) {
        console.warn('Error creating WebRTC offer:', e);
      }
    };

    // Listen for WebRTC signals (Offer, Answer, ICE Candidates)
    const unsubSignal = socketService.onWebRTCSignal(async ({ toHandle, fromHandle, signal }) => {
      const myHandle = normalizeHandle(currentUser.handle);
      const targetHandle = normalizeHandle(user.handle);

      if (normalizeHandle(toHandle) !== myHandle) return;
      if (normalizeHandle(fromHandle) !== targetHandle) return;

      const currentPc = peerConnectionRef.current;
      if (!currentPc) return;

      try {
        if (signal.type === 'offer') {
          await currentPc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          flushPendingCandidates(currentPc);

          const answer = await currentPc.createAnswer();
          await currentPc.setLocalDescription(answer);
          socketService.sendWebRTCSignal(user.handle, currentUser.handle, {
            type: 'answer',
            sdp: answer,
          });
        } else if (signal.type === 'answer') {
          callSoundService.stopAll();
          setCallState('connected');
          if (currentPc.signalingState !== 'stable') {
            await currentPc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            flushPendingCandidates(currentPc);
          }
        } else if (signal.type === 'candidate' && signal.candidate) {
          if (currentPc.remoteDescription && currentPc.remoteDescription.type) {
            await currentPc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
          } else {
            pendingCandidatesRef.current.push(signal.candidate);
          }
        }
      } catch (e) {
        console.warn('WebRTC Signaling error:', e);
      }
    });

    // Remote call accepted event (Initiator triggers offer creation now that recipient is mounted)
    const unsubAccepted = socketService.onCallAccepted(({ callerHandle, recipient }) => {
      const myHandle = normalizeHandle(currentUser.handle);
      if (
        normalizeHandle(callerHandle) === myHandle ||
        normalizeHandle(recipient.handle) === normalizeHandle(user.handle)
      ) {
        callSoundService.stopAll();
        setCallState('connected');
        createAndSendOffer();
      }
    });

    // Remote call ended event
    const unsubEnded = socketService.onCallEnded((data) => {
      if (
        !data ||
        normalizeHandle(data.callerHandle || '') === normalizeHandle(user.handle) ||
        normalizeHandle(data.recipientHandle || '') === normalizeHandle(user.handle)
      ) {
        callSoundService.stopAll();
        setCallState('ended');
        const info: CallInfo =
          durationRef.current > 0
            ? { type: isInitiator ? 'outgoing' : 'incoming', duration: durationRef.current }
            : { type: isInitiator ? 'missed' : 'declined', duration: 0 };
        setTimeout(() => onClose(info), 600);
      }
    });

    return () => {
      isCleanedUp = true;
      unsubSignal();
      unsubAccepted();
      unsubEnded();
      callSoundService.stopAll();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, user, currentUser, isInitiator, onClose]);

  // Duration Timer
  useEffect(() => {
    if (callState !== 'connected') return;
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [callState]);

  const handleToggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleToggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerMuted;
      setIsSpeakerMuted(!isSpeakerMuted);
    }
  };

  const handleEndCall = () => {
    callSoundService.stopAll();
    socketService.endCall(currentUser.handle, user.handle);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    setCallState('ended');
    const info: CallInfo =
      durationRef.current > 0
        ? { type: isInitiator ? 'outgoing' : 'incoming', duration: durationRef.current }
        : { type: isInitiator ? 'canceled' : 'declined', duration: 0 };
    onClose(info);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fade-in select-none p-4 font-sans">
      {/* Hidden auto-playing remote audio element */}
      <audio ref={remoteAudioRef} autoPlay playsInline muted={isSpeakerMuted} />

      <div className="bg-[#101116]/95 border border-white/10 rounded-3xl w-full max-w-sm p-7 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col items-center text-center relative overflow-hidden backdrop-blur-2xl">
        {/* Glow Effects */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#00ff73]/12 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Badge */}
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#00ff73]/10 border border-[#00ff73]/25 text-[11px] font-semibold text-[#00ff73] mb-6 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#00ff73] animate-pulse" />
          <span>EzTalk HD Voice Stream</span>
        </div>

        {/* User Avatar with Pulsing Rings */}
        <div className="relative mb-5">
          <div
            className={`w-28 h-28 rounded-full overflow-hidden border-2 border-[#00ff73] shadow-[0_0_30px_rgba(0,255,115,0.3)] relative z-10 ${
              callState === 'calling' ? 'animate-pulse' : ''
            }`}
          >
            <img src={user.avatar} alt={user.handle} className="w-full h-full object-cover" />
          </div>

          {/* Connected audio indicator pulse ring */}
          {callState === 'connected' && (
            <div className="absolute -inset-2.5 rounded-full border-2 border-[#00ff73]/40 animate-ping pointer-events-none" />
          )}
        </div>

        {/* User Identity */}
        <h3 className="text-xl font-bold text-white tracking-tight">{user.name || user.handle}</h3>
        <div className="flex items-center space-x-1.5 mt-1 text-xs text-[#00ff73] font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{user.handle}</span>
        </div>

        {/* Status / Duration Display */}
        <div className="mt-4">
          {callState === 'calling' && (
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#00ff73] animate-pulse bg-[#00ff73]/10 px-4 py-1.5 rounded-full border border-[#00ff73]/20">
              <Radio className="w-3.5 h-3.5 animate-spin" />
              <span>Calling {user.name || user.handle}...</span>
            </div>
          )}
          {callState === 'connected' && (
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-white bg-white/5 px-4 py-1.5 rounded-full border border-white/10 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-[#00ff73] animate-pulse" />
              <span>{formatDuration(callDuration)}</span>
            </div>
          )}
          {callState === 'ended' && (
            <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-3.5 py-1 rounded-full border border-red-500/20">
              Call Ended
            </span>
          )}
        </div>

        {/* Real-Time Microphone Frequency Waveform */}
        {callState === 'connected' && (
          <div className="flex items-center justify-center space-x-1.5 h-10 my-5 px-4 w-full">
            {audioLevels.map((height, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-[#00ff73] shadow-[0_0_8px_rgba(0,255,115,0.7)] transition-all duration-75"
                style={{
                  height: isMuted ? '4px' : `${Math.max(4, height * 0.35)}px`,
                  opacity: isMuted ? 0.25 : 0.95,
                }}
              />
            ))}
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="flex items-center justify-center space-x-4 w-full mt-6 pt-5 border-t border-white/10">
          {/* Mute Microphone */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
              isMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="p-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center border border-red-400/30"
            title="End call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Mute Speaker */}
          <button
            type="button"
            onClick={handleToggleSpeaker}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
              isSpeakerMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
            }`}
            title={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
          >
            {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
