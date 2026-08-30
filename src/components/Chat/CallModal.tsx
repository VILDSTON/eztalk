import React, { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Shield, Activity } from 'lucide-react';
import { User, CallInfo } from '../../types/chat';
import { socketService } from '../../services/socket';
import { normalizeHandle } from '../../utils/chatStorage';
import { callSoundService } from '../../utils/callSounds';

interface CallModalProps {
  user: User;
  currentUser: User;
  isOpen: boolean;
  isInitiator?: boolean;
  onClose: (info?: CallInfo) => void;
}

// High Quality Public STUN / TURN servers for peer-to-peer audio with Symmetric NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Google Public STUN
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Cloudflare STUN
    { urls: 'stun:stun.cloudflare.com:3478' },
    // OpenRelay Public STUN
    { urls: 'stun:openrelay.metered.ca:80' },
    // OpenRelay Public TURN (UDP + TCP + TLS for mobile LTE/5G and Symmetric NAT)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turns:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

// Modifies SDP to set Opus to 64kbps high-fidelity voice, enable DTX, in-band FEC, and stable 20ms packetization
function optimizeAudioSDP(sdp: string): string {
  if (!sdp) return sdp;

  // Find opus payload type number (usually 111)
  const opusMatch = sdp.match(/a=rtpmap:(\d+)\s+opus\/48000/i);
  if (!opusMatch) return sdp;
  const pt = opusMatch[1];

  const opusParams = 'maxaveragebitrate=64000;useinbandfec=1;usedtx=1;stereo=0;sprop-stereo=0;maxplaybackrate=48000;minptime=20;ptime=20';

  const fmtpRegex = new RegExp(`a=fmtp:${pt}[^\r\n]*`, 'i');
  if (fmtpRegex.test(sdp)) {
    return sdp.replace(fmtpRegex, `a=fmtp:${pt} ${opusParams}`);
  } else {
    return sdp.replace(
      new RegExp(`(a=rtpmap:${pt}\\s+opus\\/48000[^\r\n]*)`, 'i'),
      `$1\r\na=fmtp:${pt} ${opusParams}`
    );
  }
}

// Configures RTCRtpSender encoding bitrate and priority for crystal clear voice
function configureHighQualitySender(pc: RTCPeerConnection) {
  try {
    pc.getSenders().forEach((sender) => {
      if (sender.track && sender.track.kind === 'audio') {
        const params = sender.getParameters();
        if (params && params.encodings && params.encodings.length > 0) {
          params.encodings.forEach((enc) => {
            enc.maxBitrate = 64000;
            enc.priority = 'high';
            enc.networkPriority = 'high';
          });
          sender.setParameters(params).catch(() => {});
        }
      }
    });
  } catch {
    // ignore
  }
}

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

  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingSignalsRef = useRef<any[]>([]);
  const hasOfferedRef = useRef(false);
  const recipientAcceptedRef = useRef(!isInitiator);
  const durationRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const endCallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  durationRef.current = callDuration;

  // Real-time audio waveform visualizer
  const initAudioVisualizer = (stream: MediaStream) => {
    try {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        return;
      }
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
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

  const createAndSendOffer = async (pc: RTCPeerConnection) => {
    if (hasOfferedRef.current) return;
    try {
      hasOfferedRef.current = true;
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      const optimizedSDP = optimizeAudioSDP(offer.sdp || '');
      await pc.setLocalDescription(new RTCSessionDescription({ type: offer.type, sdp: optimizedSDP }));
      configureHighQualitySender(pc);
      socketService.sendWebRTCSignal(user.handle, currentUser.handle, {
        offer: pc.localDescription,
      });
    } catch (err) {
      console.error('Failed to create/send WebRTC offer:', err);
      hasOfferedRef.current = false;
    }
  };

  const processSignal = async (signal: any) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      if (signal.offer) {
        if (pc.signalingState !== 'stable') {
          try {
            await pc.setLocalDescription({ type: 'rollback' });
          } catch {
            // ignore rollback failure in browsers with strict signaling
          }
          await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
        } else {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
        }

        while (pendingCandidatesRef.current.length > 0) {
          const cand = pendingCandidatesRef.current.shift();
          if (cand) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (iceErr) {
              console.warn('Buffered ICE candidate error:', iceErr);
            }
          }
        }

        const answer = await pc.createAnswer();
        const optimizedSDP = optimizeAudioSDP(answer.sdp || '');
        await pc.setLocalDescription(new RTCSessionDescription({ type: answer.type, sdp: optimizedSDP }));
        configureHighQualitySender(pc);
        socketService.sendWebRTCSignal(user.handle, currentUser.handle, {
          answer: pc.localDescription,
        });
        setCallState('connected');
        callSoundService.stopAll();
      } else if (signal.answer) {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
          configureHighQualitySender(pc);
          while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift();
            if (cand) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (iceErr) {
                console.warn('Buffered ICE candidate error:', iceErr);
              }
            }
          }
          setCallState('connected');
          callSoundService.stopAll();
        }
      } else if (signal.candidate) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (iceErr) {
            console.warn('ICE candidate error:', iceErr);
          }
        } else {
          pendingCandidatesRef.current.push(signal.candidate);
        }
      }
    } catch (err) {
      console.error('Signal handling error:', err);
    }
  };

  const createPeerConnection = (localStream: MediaStream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });
    configureHighQualitySender(pc);

    pc.ontrack = (event) => {
      const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      remoteStreamRef.current = stream;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.volume = 1.0;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.play().catch((err) => {
          console.warn('Remote audio play failed:', err);
        });
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
          autoGainControl: false,
          sampleRate: { ideal: 48000 },
          sampleSize: { ideal: 16 },
          channelCount: 1,
        },
      });
      localStreamRef.current = stream;
      initAudioVisualizer(stream);

      const pc = createPeerConnection(stream);

      // If initiator and recipient already accepted while getUserMedia was acquiring mic, send offer now
      if (isInitiator && recipientAcceptedRef.current && !hasOfferedRef.current) {
        await createAndSendOffer(pc);
      }

      // Process any queued incoming WebRTC signals
      while (pendingSignalsRef.current.length > 0) {
        const queuedSignal = pendingSignalsRef.current.shift();
        if (queuedSignal) await processSignal(queuedSignal);
      }

      if (isInitiator) {
        callSoundService.playOutgoing();
        socketService.sendCall(currentUser, user.handle);
      } else {
        callSoundService.stopAll();
      }
    } catch {
      alert('Could not access microphone for voice call. Note: Microphones require HTTPS or localhost in modern browsers.');
      handleEndCall();
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (!isInitiator) {
      callSoundService.stopAll();
    }

    startCall();

    const cleanupWebRTC = socketService.onWebRTCSignal(async (data) => {
      const from = data.fromHandle || data.from;
      const to = data.toHandle || data.to;
      if (to && normalizeHandle(to) !== normalizeHandle(currentUser.handle)) return;
      if (normalizeHandle(from) !== normalizeHandle(user.handle)) return;

      const signal = data.signal || data;
      const pc = peerConnectionRef.current;
      if (!pc) {
        pendingSignalsRef.current.push(signal);
        return;
      }

      await processSignal(signal);
    });

    const cleanupCallAccepted = socketService.onCallAccepted(async (data) => {
      const callerH = data.callerHandle || data.to;
      if (callerH && normalizeHandle(callerH) === normalizeHandle(currentUser.handle)) {
        recipientAcceptedRef.current = true;
        callSoundService.stopAll();
        setCallState('connected');

        const pc = peerConnectionRef.current;
        if (pc) {
          await createAndSendOffer(pc);
        }
      }
    });

    const cleanupCallDeclined = socketService.onCallDeclined(({ callerHandle, recipientHandle }) => {
      const isRel =
        normalizeHandle(callerHandle) === normalizeHandle(currentUser.handle) ||
        normalizeHandle(recipientHandle || '') === normalizeHandle(user.handle) ||
        normalizeHandle(callerHandle) === normalizeHandle(user.handle);

      if (isRel) {
        callSoundService.stopAll();
        setCallState('ended');
        if (endCallTimerRef.current) {
          clearTimeout(endCallTimerRef.current);
        }
        endCallTimerRef.current = setTimeout(() => {
          onClose({
            type: isInitiator ? 'outgoing' : 'incoming',
            duration: 0,
          });
        }, 800);
      }
    });

    const cleanupCallEnded = socketService.onCallEnded(({ callerHandle, recipientHandle } = {}) => {
      const isRel =
        !callerHandle ||
        normalizeHandle(callerHandle) === normalizeHandle(user.handle) ||
        normalizeHandle(recipientHandle || '') === normalizeHandle(user.handle) ||
        normalizeHandle(callerHandle) === normalizeHandle(currentUser.handle) ||
        normalizeHandle(recipientHandle || '') === normalizeHandle(currentUser.handle);

      if (isRel) {
        callSoundService.stopAll();
        setCallState('ended');
        if (endCallTimerRef.current) {
          clearTimeout(endCallTimerRef.current);
        }
        endCallTimerRef.current = setTimeout(() => {
          onClose({
            type: isInitiator ? 'outgoing' : 'incoming',
            duration: durationRef.current,
          });
        }, 800);
      }
    });

    return () => {
      cleanupWebRTC();
      cleanupCallAccepted();
      cleanupCallDeclined();
      cleanupCallEnded();
      callSoundService.stopAll();

      if (endCallTimerRef.current) {
        clearTimeout(endCallTimerRef.current);
        endCallTimerRef.current = null;
      }
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
        peerConnectionRef.current.onconnectionstatechange = null;
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (callState === 'connected') {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
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
    setIsSpeakerOn((prev) => !prev);
  };

  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerOn;
    }
  }, [isSpeakerOn]);

  const handleEndCall = () => {
    callSoundService.stopAll();
    socketService.endCall(currentUser.handle, user.handle);
    setCallState('ended');

    const info: CallInfo = {
      type: isInitiator ? 'outgoing' : 'incoming',
      duration: durationRef.current,
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
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center p-0 sm:p-4 glass-overlay animate-fade-in select-none font-sans">
      {/* Hidden audio element with autoplay for remote audio stream with reactive muted prop */}
      <audio ref={remoteAudioRef} autoPlay playsInline muted={!isSpeakerOn} />

      <div className="relative w-full h-full sm:h-auto sm:max-w-sm bg-ez-elevated border-0 sm:border border-ez-border rounded-none sm:rounded-3xl shadow-none sm:shadow-glass-lg p-6 sm:p-7 flex flex-col items-center justify-center text-center overflow-hidden">
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
              <span>{isInitiator ? 'Calling...' : 'Connecting...'}</span>
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
