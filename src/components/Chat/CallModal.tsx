import React, { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Shield, Activity } from 'lucide-react';
import { User, CallInfo } from '../../types/chat';
import { socketService } from '../../services/socket';
import { normalizeHandle } from '../../utils/chatStorage';

interface CallModalProps {
  user: User;
  currentUser: User;
  isOpen: boolean;
  isInitiator?: boolean;
  onClose: (info?: CallInfo) => void;
}

// High Quality Public STUN / TURN servers for peer-to-peer audio
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:openrelay.metered.ca:80' },
  ],
  iceCandidatePoolSize: 10,
};

// Web Audio synthesizer for calling ringtones and chimes
class CallSoundService {
  private audioCtx: AudioContext | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  private getContext() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public playOutgoing() {
    this.stopAll();
    const playRing = () => {
      try {
        const ctx = this.getContext();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 1.2);
        osc2.start(now);
        osc2.stop(now + 1.2);
      } catch {
        // Audio policy ignore
      }
    };

    playRing();
    this.intervalId = setInterval(playRing, 3500);
  }

  public stopAll() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

const callSoundService = new CallSoundService();

export const CallModal: React.FC<CallModalProps> = ({
  user,
  currentUser,
  isOpen,
  isInitiator = false,
  onClose,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callState, setCallState] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 25, 45, 60, 35, 20]);

  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const hasOfferedRef = useRef(false);
  const recipientAcceptedRef = useRef(!isInitiator);
  const durationRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  durationRef.current = callDuration;

  // Real-time audio waveform visualizer
  const initAudioVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateWaveform = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const sampled = [
          Math.max(15, dataArray[1] / 3),
          Math.max(20, dataArray[3] / 2.5),
          Math.max(25, dataArray[5] / 2),
          Math.max(30, dataArray[7] / 2),
          Math.max(20, dataArray[9] / 2.5),
          Math.max(15, dataArray[11] / 3),
        ];
        setAudioLevels(sampled);
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      updateWaveform();
    } catch {
      // AudioContext policy
    }
  };

  const createPeerConnection = (localStream: MediaStream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendWebRTCSignal(user.handle, currentUser.handle, {
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        callSoundService.stopAll();
        setCallState('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handleEndCall();
      }
    };

    return pc;
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;
      initAudioVisualizer(stream);

      const pc = createPeerConnection(stream);

      if (isInitiator) {
        callSoundService.playOutgoing();
        socketService.sendCall(currentUser, user.handle);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        hasOfferedRef.current = true;

        socketService.sendWebRTCSignal(user.handle, currentUser.handle, {
          offer: pc.localDescription,
        });
      }
    } catch {
      alert('Could not access microphone for voice call. Please check browser permissions.');
      handleEndCall();
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    startCall();

    const cleanupWebRTC = socketService.onWebRTCSignal(async ({ fromHandle, signal }) => {
      if (normalizeHandle(fromHandle) !== normalizeHandle(user.handle)) return;

      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        if (signal.offer) {
          if (pc.signalingState !== 'stable') {
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' }),
              pc.setRemoteDescription(new RTCSessionDescription(signal.offer)),
            ]);
          } else {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
          }

          while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift();
            if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketService.sendWebRTCSignal(user.handle, currentUser.handle, {
            answer: pc.localDescription,
          });
        } else if (signal.answer) {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
            while (pendingCandidatesRef.current.length > 0) {
              const cand = pendingCandidatesRef.current.shift();
              if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
          }
        } else if (signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            pendingCandidatesRef.current.push(signal.candidate);
          }
        }
      } catch {
        // Signaling ignore
      }
    });

    const cleanupCallAccepted = socketService.onCallAccepted(async ({ callerHandle }) => {
      if (normalizeHandle(callerHandle) === normalizeHandle(currentUser.handle)) {
        recipientAcceptedRef.current = true;
        callSoundService.stopAll();
        setCallState('connected');

        const pc = peerConnectionRef.current;
        if (pc && !hasOfferedRef.current) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          hasOfferedRef.current = true;
          socketService.sendWebRTCSignal(user.handle, currentUser.handle, {
            offer: pc.localDescription,
          });
        }
      }
    });

    const cleanupCallEnded = socketService.onCallEnded(({ callerHandle, recipientHandle } = {}) => {
      const isRel =
        !callerHandle ||
        normalizeHandle(callerHandle) === normalizeHandle(user.handle) ||
        normalizeHandle(recipientHandle || '') === normalizeHandle(user.handle);

      if (isRel) {
        callSoundService.stopAll();
        setCallState('ended');
        setTimeout(() => {
          onClose({
            type: isInitiator ? 'outgoing' : 'incoming',
            duration: durationRef.current,
          });
        }, 1000);
      }
    });

    return () => {
      cleanupWebRTC();
      cleanupCallAccepted();
      cleanupCallEnded();
      callSoundService.stopAll();

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (callState === 'connected') {
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerOn;
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  const handleEndCall = () => {
    callSoundService.stopAll();
    socketService.endCall(currentUser.handle, user.handle);
    setCallState('ended');

    const info: CallInfo = {
      type: isInitiator ? 'outgoing' : 'incoming',
      duration: callDuration,
    };
    onClose(info);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-fade-in select-none font-sans">
      {/* Hidden audio element with autoplay for remote audio stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="relative w-full max-w-sm bg-ez-elevated border border-ez-border rounded-3xl shadow-glass-lg p-7 flex flex-col items-center text-center overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-neon-green/10 rounded-full blur-3xl pointer-events-none" />

        {/* Security / Encryption Badge */}
        <div className="flex items-center space-x-1 text-[10px] font-mono font-bold text-neon-green bg-neon-green/10 border border-neon-green/30 px-3 py-1 rounded-full mb-6 shadow-xs">
          <Shield className="w-3 h-3" />
          <span>END-TO-END ENCRYPTED VOICE</span>
        </div>

        {/* User Avatar with Waveform Pulsing Rings */}
        <div className="relative mb-6">
          {callState === 'calling' && (
            <>
              <div className="absolute inset-0 rounded-full bg-neon-green/20 animate-ping" />
              <div className="absolute -inset-3 rounded-full border border-neon-green/30 animate-pulse" />
            </>
          )}

          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-neon-green shadow-neon-md bg-ez-surface relative z-10">
            <img src={user.avatar} alt={user.handle} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* User Name & Handle */}
        <h3 className="text-xl font-bold text-white tracking-tight leading-tight">{user.name || user.handle}</h3>
        <p className="text-xs text-neon-green font-mono mt-1">{user.handle}</p>

        {/* Call State / Duration */}
        <div className="my-5 flex flex-col items-center">
          {callState === 'calling' ? (
            <span className="text-xs font-bold text-gray-400 animate-pulse flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-neon-green animate-spin" />
              <span>Calling...</span>
            </span>
          ) : callState === 'connected' ? (
            <div className="flex flex-col items-center space-y-2">
              <span className="text-sm font-bold text-neon-green font-mono tracking-widest bg-neon-green/10 px-3.5 py-1 rounded-full border border-neon-green/20">
                {formatDuration(callDuration)}
              </span>

              {/* Dynamic Equalizer Waveform */}
              <div className="flex items-center space-x-1.5 h-6">
                {audioLevels.map((lvl, idx) => (
                  <div
                    key={idx}
                    className="w-1 bg-neon-green rounded-full transition-all duration-75"
                    style={{ height: `${lvl}px` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <span className="text-xs font-bold text-rose-400">Call Ended</span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-4 mt-2">
          {/* Mute Mic Button */}
          <button
            type="button"
            onClick={toggleMute}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="p-4 rounded-3xl bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.45)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="End call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Speaker Button */}
          <button
            type="button"
            onClick={toggleSpeaker}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
              !isSpeakerOn
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
            }`}
            title={isSpeakerOn ? 'Mute speaker' : 'Unmute speaker'}
          >
            {!isSpeakerOn ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
