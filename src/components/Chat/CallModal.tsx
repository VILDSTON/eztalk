import React, { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Shield, Activity, Minimize2, Maximize2, Signal, Clock } from 'lucide-react';
import { User, CallInfo } from '../../types/chat';
import { socketService } from '../../services/socket';
import { normalizeHandle } from '../../utils/chatStorage';
import { callSoundService } from '../../utils/callSounds';
import { useTranslation } from '../../context/LanguageContext';

interface CallModalProps {
  user: User;
  currentUser: User;
  isOpen: boolean;
  isInitiator?: boolean;
  onClose: (info?: CallInfo) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
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
          sender.setParameters(params).catch(() => { });
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
  const { t } = useTranslation();
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callState, setCallState] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [endReason, setEndReason] = useState<'ended' | 'declined' | 'no_answer' | 'canceled' | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 25, 45, 60, 35, 20]);
  const [callQuality, setCallQuality] = useState<{
    rtt: number | null;
    lossRate: number;
    rating: 'excellent' | 'good' | 'poor';
  }>({ rtt: null, lossRate: 0, rating: 'excellent' });

  const fallbackAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.handle || user?.name || 'user')}`;
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatar || fallbackAvatar);

  useEffect(() => {
    setAvatarUrl(user?.avatar || fallbackAvatar);
  }, [user?.avatar, user?.handle, fallbackAvatar]);

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

  // FIX (Medium): Track component mount state to prevent RAF calling setState after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
        audioCtx.resume().catch(() => { });
      }
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      let lastRenderTime = 0;
      const updateWaveform = (now: number) => {
        // FIX (Medium): Guard against calling setState on unmounted component
        if (!analyserRef.current || !mountedRef.current) return;
        animationFrameRef.current = requestAnimationFrame(updateWaveform);

        // Throttle React state updates to ~20 FPS (every 50ms) instead of 60-120 FPS to reduce CPU/battery usage
        if (now - lastRenderTime < 50) return;
        lastRenderTime = now;

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
      };

      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    } catch {
      // AudioContext policy
    }
  };

  const createAndSendOffer = async (pc: RTCPeerConnection) => {
    if (hasOfferedRef.current) return;
    // Bug 2 fix: set flag SYNCHRONOUSLY before first await to close the race-condition window
    hasOfferedRef.current = true;
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      const optimizedSDP = optimizeAudioSDP(offer.sdp || '');
      await pc.setLocalDescription(new RTCSessionDescription({ type: offer.type, sdp: optimizedSDP }));
      configureHighQualitySender(pc);
      socketService.sendWebRTCSignal(user.handle, currentUser.handle, {
        offer: pc.localDescription,
      });
    } catch (err) {
      console.error('Failed to create/send WebRTC offer:', err);
      hasOfferedRef.current = false; // allow retry on error
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
      console.log('WebRTC Connection State:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        callSoundService.stopAll();
        setCallState('connected');
      } else if (pc.connectionState === 'failed') {
        // Only end on definitive failure, not on transient 'disconnected'
        handleEndCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE Connection State changed:', pc.iceConnectionState);
      // Use ICE state as a reliable fallback to transition to connected
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        callSoundService.stopAll();
        setCallState('connected');
      } else if (pc.iceConnectionState === 'failed') {
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
      alert(t.calls.micAccessError);
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

    const cleanupCallDeclined = socketService.onCallDeclined(({ callerHandle, recipientHandle, declinedBy, reason }) => {
      const isRel =
        normalizeHandle(callerHandle) === normalizeHandle(currentUser.handle) ||
        normalizeHandle(recipientHandle || '') === normalizeHandle(user.handle) ||
        normalizeHandle(callerHandle) === normalizeHandle(user.handle) ||
        normalizeHandle(declinedBy || '') === normalizeHandle(user.handle);

      if (isRel) {
        callSoundService.stopAll();
        setCallState('ended');
        const resolvedReason = reason === 'timeout' ? 'no_answer' : 'declined';
        setEndReason(resolvedReason);

        if (endCallTimerRef.current) {
          clearTimeout(endCallTimerRef.current);
        }
        endCallTimerRef.current = setTimeout(() => {
          onClose({
            type: resolvedReason === 'no_answer' ? 'missed' : 'declined',
            duration: 0,
          });
        }, 1200);
      }
    });

    const cleanupCallEnded = socketService.onCallEnded(({ callerHandle, recipientHandle, endedBy, reason } = {}) => {
      const isRel =
        !callerHandle ||
        normalizeHandle(callerHandle) === normalizeHandle(user.handle) ||
        normalizeHandle(recipientHandle || '') === normalizeHandle(user.handle) ||
        normalizeHandle(callerHandle) === normalizeHandle(currentUser.handle) ||
        normalizeHandle(recipientHandle || '') === normalizeHandle(currentUser.handle) ||
        normalizeHandle(endedBy || '') === normalizeHandle(user.handle);

      if (isRel) {
        callSoundService.stopAll();
        setCallState('ended');
        let resReason: 'ended' | 'declined' | 'no_answer' | 'canceled' = 'ended';
        if (reason === 'timeout') resReason = 'no_answer';
        else if (reason === 'declined') resReason = 'declined';
        else if (reason === 'canceled') resReason = 'canceled';
        else if (durationRef.current === 0) resReason = isInitiator ? 'declined' : 'canceled';
        setEndReason(resReason);

        if (endCallTimerRef.current) {
          clearTimeout(endCallTimerRef.current);
        }
        endCallTimerRef.current = setTimeout(() => {
          onClose({
            type: durationRef.current > 0
              ? (isInitiator ? 'outgoing' : 'incoming')
              : resReason === 'no_answer'
                ? 'missed'
                : resReason === 'declined'
                  ? 'declined'
                  : (isInitiator ? 'canceled' : 'missed'),
            duration: durationRef.current,
          });
        }, 1200);
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
        audioContextRef.current.close().catch(() => { });
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
    // FIX (High): Add user.handle, currentUser.handle, isInitiator to dependency array
    // to prevent stale closure capturing old user/handle refs during an active call.
    // This ensures handleEndCall, onCallAccepted, and processSignal always operate
    // on the current user objects, not stale captures from when isOpen first became true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user.handle, currentUser.handle, isInitiator]);

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

  // 35-second Ringing Timeout for outgoing calls (Auto cancel if no answer / ignored)
  useEffect(() => {
    if (callState === 'calling' && isInitiator) {
      const ringTimer = setTimeout(() => {
        callSoundService.stopAll();
        setCallState('ended');
        setEndReason('no_answer');
        socketService.endCall(currentUser.handle, user.handle, 'timeout');
        if (endCallTimerRef.current) clearTimeout(endCallTimerRef.current);
        endCallTimerRef.current = setTimeout(() => {
          onClose({
            type: 'missed',
            duration: 0,
          });
        }, 1200);
      }, 35000);
      return () => clearTimeout(ringTimer);
    }
  }, [callState, isInitiator, currentUser.handle, user.handle, onClose]);

  // Immediate notify & track cleanup on tab close / reload
  useEffect(() => {
    const handleUnload = () => {
      if (callState !== 'ended') {
        socketService.endCall(currentUser.handle, user.handle);
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
        }
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [callState, currentUser.handle, user.handle]);

  // WebRTC Call Quality & Ping Monitor (runs every 2.5s while connected)
  useEffect(() => {
    if (callState !== 'connected') return;

    let prevPacketsLost = 0;
    let prevPacketsReceived = 0;

    const statsInterval = setInterval(async () => {
      const pc = peerConnectionRef.current;
      if (!pc || pc.connectionState !== 'connected') return;

      try {
        const stats = await pc.getStats();
        let currentRtt: number | null = null;
        let deltaLost = 0;
        let deltaReceived = 0;

        stats.forEach((report: any) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (typeof report.currentRoundTripTime === 'number') {
              currentRtt = Math.round(report.currentRoundTripTime * 1000);
            } else if (typeof report.roundTripTime === 'number') {
              currentRtt = Math.round(report.roundTripTime * 1000);
            }
          }

          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            const lost = report.packetsLost || 0;
            const received = report.packetsReceived || 0;
            deltaLost = Math.max(0, lost - prevPacketsLost);
            deltaReceived = Math.max(0, received - prevPacketsReceived);
            prevPacketsLost = lost;
            prevPacketsReceived = received;
          }
        });

        const totalDelta = deltaLost + deltaReceived;
        const lossPercent = totalDelta > 0 ? (deltaLost / totalDelta) * 100 : 0;

        let rating: 'excellent' | 'good' | 'poor' = 'excellent';
        if (currentRtt !== null) {
          if (currentRtt > 220 || lossPercent > 5) {
            rating = 'poor';
          } else if (currentRtt > 120 || lossPercent > 2) {
            rating = 'good';
          }
        }

        setCallQuality({
          rtt: currentRtt,
          lossRate: Math.round(lossPercent),
          rating,
        });
      } catch {
        // ignore getStats errors
      }
    }, 2500);

    return () => clearInterval(statsInterval);
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
    // Bug 1 fix: guard against double-close when socket event fires after user already ended call
    if (callState === 'ended') return;
    callSoundService.stopAll();
    const actionReason = durationRef.current > 0 ? 'ended' : 'canceled';
    socketService.endCall(currentUser.handle, user.handle, actionReason);
    setCallState('ended');
    setEndReason(actionReason);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => { });
      audioContextRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    const info: CallInfo = {
      type: durationRef.current > 0 ? (isInitiator ? 'outgoing' : 'incoming') : (isInitiator ? 'canceled' : 'missed'),
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
    <>
      {/* Hidden audio element with autoplay for remote audio stream with reactive muted prop */}
      <audio ref={remoteAudioRef} autoPlay playsInline muted={!isSpeakerOn} />

      {isMinimized ? (
        /* Floating Minimized Call Pill */
        <div
          onClick={() => setIsMinimized(false)}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[92%] sm:w-auto min-w-[300px] max-w-md bg-ez-elevated/95 border border-neon-green/40 shadow-[0_10px_35px_rgba(0,0,0,0.6),0_0_20px_rgba(0,230,118,0.25)] rounded-full px-4 py-2 flex items-center justify-between gap-3 backdrop-blur-2xl animate-fade-in select-none font-sans cursor-pointer hover:border-neon-green transition-all"
        >
          {/* Avatar & Peer Info */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-neon-green/60 shadow-xs bg-ez-surface">
                <img
                  src={avatarUrl}
                  alt={user?.handle || 'User'}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarUrl(fallbackAvatar)}
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-neon-green rounded-full ring-2 ring-ez-base animate-pulse" />
            </div>

            <div className="flex flex-col min-w-0 text-left">
              <span className="text-xs font-bold text-white truncate leading-tight">
                {user?.name || user?.handle || 'User'}
              </span>
              <div className="flex items-center space-x-1.5 text-[10px]">
                <span className="text-neon-green font-mono font-semibold">
                  {callState === 'connected'
                    ? formatDuration(callDuration)
                    : callState === 'ended'
                      ? (endReason === 'declined'
                          ? (t.calls?.callDeclinedStatus || 'Вызов отклонён')
                          : endReason === 'no_answer'
                            ? (t.calls?.noAnswer || 'Не отвечает')
                            : (t.calls?.callEnded || 'Звонок завершён'))
                      : (isInitiator ? t.calls.calling : t.calls.ringing)}
                </span>
                {callQuality.rtt !== null && (
                  <span className="text-gray-400 font-mono">
                    • {callQuality.rtt}ms
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mini Waveform in pill */}
          {callState === 'connected' && (
            <div className="hidden sm:flex items-center space-x-1 h-3.5 px-1">
              {audioLevels.slice(0, 4).map((lvl, idx) => (
                <div
                  key={idx}
                  className="w-1 bg-neon-green rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(4, lvl / 3)}px` }}
                />
              ))}
            </div>
          )}

          {/* Quick Controls */}
          <div className="flex items-center space-x-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={toggleMute}
              className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  : 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10'
              }`}
              title={isMuted ? t.calls.unmuteMic : t.calls.muteMic}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleEndCall}
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center shrink-0 bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer border border-rose-400/30"
              title={t.calls.endCall}
            >
              <PhoneOff className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center shrink-0 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white border border-white/10 transition-all cursor-pointer"
              title="Expand call"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Full Modal */
        <div className="fixed inset-0 z-[9999] flex sm:items-center sm:justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-2xl animate-fade-in select-none font-sans">
          <div className="relative w-full h-full sm:h-auto sm:max-w-sm bg-ez-base/95 border-0 sm:border border-neon-green/30 rounded-none sm:rounded-3xl shadow-[0_0_60px_rgba(16,185,129,0.2)] p-6 sm:p-7 flex flex-col items-center justify-center text-center overflow-hidden backdrop-blur-2xl">
            {/* Ambient Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-neon-green/10 rounded-full blur-3xl pointer-events-none animate-glow-pulse" />

            {/* Minimize to Floating Bar Button */}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 transition-all cursor-pointer z-20"
              title="Minimize to floating pill"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

        {/* User Avatar with Waveform Pulsing Rings */}
        <div className="relative mb-6">
          {callState === 'calling' && (
            <>
              <div className="absolute inset-0 rounded-full bg-neon-green/20 animate-ping" />
              <div className="absolute -inset-3 rounded-full border border-neon-green/30 animate-pulse" />
            </>
          )}

          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-neon-green shadow-neon-md bg-ez-surface relative z-10">
            <img
              src={avatarUrl}
              alt={user?.handle || 'User'}
              className="w-full h-full object-cover"
              onError={() => setAvatarUrl(fallbackAvatar)}
            />
          </div>
        </div>

        {/* User Name & Handle */}
        <h3 className="text-xl font-bold text-white tracking-tight leading-tight">{user?.name || user?.handle || 'User'}</h3>
        <p className="text-xs text-neon-green font-mono mt-1">{user?.handle || ''}</p>

        {/* Call State / Duration */}
        <div className="my-5 flex flex-col items-center">
          {callState === 'calling' ? (
            <span className="text-xs font-bold text-gray-400 animate-pulse flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-neon-green animate-spin" />
              <span>{isInitiator ? t.calls.calling : t.calls.ringing}</span>
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

              {/* Real-time WebRTC Ping & Quality Indicator Badge */}
              {callQuality.rtt !== null && (
                <div
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-mono border transition-colors mt-1"
                  style={{
                    borderColor: callQuality.rating === 'excellent' ? 'rgba(0, 230, 118, 0.35)' : callQuality.rating === 'good' ? 'rgba(234, 179, 8, 0.35)' : 'rgba(239, 68, 68, 0.35)',
                    backgroundColor: callQuality.rating === 'excellent' ? 'rgba(0, 230, 118, 0.1)' : callQuality.rating === 'good' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: callQuality.rating === 'excellent' ? '#00e676' : callQuality.rating === 'good' ? '#eab308' : '#ef4444'
                  }}
                  title={`Round-trip time: ${callQuality.rtt}ms, Packet loss: ${callQuality.lossRate}%`}
                >
                  <Signal className="w-3 h-3" />
                  <span>{callQuality.rtt}ms</span>
                  {callQuality.rating === 'excellent' && <span>• HD Voice</span>}
                </div>
              )}
            </div>
          ) : (
            <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-white/5 border border-white/10">
              {endReason === 'declined' ? (
                <>
                  <PhoneOff className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-xs font-bold text-rose-400">{t.calls?.callDeclinedStatus || 'Вызов отклонён'}</span>
                </>
              ) : endReason === 'no_answer' ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-amber-400">{t.calls?.noAnswer || 'Не отвечает'}</span>
                </>
              ) : endReason === 'canceled' ? (
                <>
                  <PhoneOff className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-bold text-gray-400">{t.calls?.callCanceled || 'Отменено'}</span>
                </>
              ) : (
                <span className="text-xs font-bold text-rose-400">{t.calls?.callEnded || 'Звонок завершён'}</span>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center space-x-5 mt-4">
          {/* Mute Mic Button */}
          <button
            type="button"
            onClick={toggleMute}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all cursor-pointer ${isMuted
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10'
              }`}
            title={isMuted ? t.calls.unmuteMic : t.calls.muteMic}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.45)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-rose-400/30"
            title={t.calls.endCall}
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Speaker Button */}
          <button
            type="button"
            onClick={toggleSpeaker}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all cursor-pointer ${!isSpeakerOn
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10'
              }`}
            title={isSpeakerOn ? t.calls.muteSpeaker : t.calls.unmuteSpeaker}
          >
            {!isSpeakerOn ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  )}
</>
);
};
