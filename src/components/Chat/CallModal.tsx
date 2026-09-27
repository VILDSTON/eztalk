import React, { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Shield, Activity, Minimize2, Maximize2, Signal, Clock, AlertCircle } from 'lucide-react';
import { User, CallInfo } from '../../types/chat';
import { socketService } from '../../services/socket';
import { normalizeHandle } from '../../utils/chatStorage';
import { callSoundService } from '../../utils/callSounds';
import { useTranslation } from '../../context/LanguageContext';
import { getWebRTCConfiguration } from '../../constants/webrtc';

interface CallModalProps {
  user: User;
  currentUser: User;
  isOpen: boolean;
  isInitiator?: boolean;
  onClose: (info?: CallInfo) => void;
}

// Modifies SDP to set Opus to 48kbps broadcast voice, disable DTX (usedtx=0) to prevent voice cut-offs,
// enable in-band FEC for packet loss protection, and enforce stable 20ms packetization with constant bitrate
function optimizeAudioSDP(sdp: string): string {
  if (!sdp) return sdp;

  // Find opus payload type number (usually 111)
  const opusMatch = sdp.match(/a=rtpmap:(\d+)\s+opus\/48000/i);
  if (!opusMatch) return sdp;
  const pt = opusMatch[1];

  const opusParams = 'maxaveragebitrate=48000;useinbandfec=1;usedtx=0;stereo=0;sprop-stereo=0;maxplaybackrate=48000;minptime=10;ptime=20;maxptime=20;cbr=1';

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

// Configures RTCRtpSender encoding bitrate, speech contentHint, and priority for crystal clear, zero-latency voice
function configureHighQualitySender(pc: RTCPeerConnection) {
  try {
    pc.getSenders().forEach((sender) => {
      if (sender.track && sender.track.kind === 'audio') {
        if ('contentHint' in sender.track) {
          sender.track.contentHint = 'speech';
        }
        const params = sender.getParameters();
        if (params && params.encodings && params.encodings.length > 0) {
          params.encodings.forEach((enc) => {
            enc.maxBitrate = 48000;
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
  const [callState, setCallState] = useState<'calling' | 'connecting' | 'connected' | 'ended'>(isInitiator ? 'calling' : 'connecting');
  const [endReason, setEndReason] = useState<'ended' | 'declined' | 'no_answer' | 'canceled' | 'failed' | null>(null);
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
  const disconnectGraceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const fallbackProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const fallbackSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const fallbackAudioContextRef = useRef<AudioContext | null>(null);
  const relayPlaybackContextRef = useRef<AudioContext | null>(null);
  const nextAudioStartTimeRef = useRef(0);
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const isSpeakerOnRef = useRef(isSpeakerOn);
  isSpeakerOnRef.current = isSpeakerOn;
  const connectGraceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const icePollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Draggable pill state
  const [pillY, setPillY] = useState(16);
  const pillDragRef = useRef({ isDragging: false, startClientY: 0, startPillY: 16, hasDragged: false });

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
      let finalOfferSDP = offer.sdp || '';
      try {
        finalOfferSDP = optimizeAudioSDP(offer.sdp || '');
        await pc.setLocalDescription(new RTCSessionDescription({ type: offer.type, sdp: finalOfferSDP }));
      } catch (sdpErr) {
        console.warn('Optimized offer SDP rejected, using standard SDP:', sdpErr);
        await pc.setLocalDescription(offer);
        finalOfferSDP = pc.localDescription?.sdp || offer.sdp || '';
      }
      configureHighQualitySender(pc);
      socketService.sendWebRTCSignal(user.handle, currentUser.handle, {
        offer: {
          type: pc.localDescription?.type || offer.type,
          sdp: pc.localDescription?.sdp || finalOfferSDP,
        },
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
          if (cand && cand.candidate && cand.candidate.trim() !== '') {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (iceErr) {
              console.warn('Buffered ICE candidate error:', iceErr);
            }
          }
        }

        const answer = await pc.createAnswer();
        let finalAnswerSDP = answer.sdp || '';
        try {
          finalAnswerSDP = optimizeAudioSDP(answer.sdp || '');
          await pc.setLocalDescription(new RTCSessionDescription({ type: answer.type, sdp: finalAnswerSDP }));
        } catch (sdpErr) {
          console.warn('Optimized answer SDP rejected, using standard SDP:', sdpErr);
          await pc.setLocalDescription(answer);
          finalAnswerSDP = pc.localDescription?.sdp || answer.sdp || '';
        }
        configureHighQualitySender(pc);
        socketService.sendWebRTCSignal(user.handle, currentUser.handle, {
          answer: {
            type: pc.localDescription?.type || answer.type,
            sdp: pc.localDescription?.sdp || finalAnswerSDP,
          },
        });
        callSoundService.stopAll();
      } else if (signal.answer) {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
          configureHighQualitySender(pc);
          while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift();
            if (cand && cand.candidate && cand.candidate.trim() !== '') {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (iceErr) {
                console.warn('Buffered ICE candidate error:', iceErr);
              }
            }
          }
          callSoundService.stopAll();
        }
      } else if (signal.candidate) {
        let candObj = signal.candidate;
        if (typeof candObj === 'string') {
          candObj = { candidate: candObj };
        }
        if (!candObj || !candObj.candidate || candObj.candidate.trim() === '') {
          return;
        }

        const addCandidateSafe = async (candidateData: RTCIceCandidateInit) => {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidateData));
            } catch (iceErr) {
              console.warn('ICE candidate error:', iceErr);
            }
          } else {
            pendingCandidatesRef.current.push(candidateData);
          }
        };

        await addCandidateSafe(candObj);

        // Supplement .local candidate with window.location.hostname for LAN IPv4 or 127.0.0.1 for localhost
        if (candObj.candidate.includes('.local') && typeof window !== 'undefined') {
          const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);
          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const targetHost = isIp ? window.location.hostname : (isLocalhost ? '127.0.0.1' : '');
          if (targetHost) {
            const replaced = candObj.candidate.replace(/[a-zA-Z0-9-]+\.local/g, targetHost);
            await addCandidateSafe({ ...candObj, candidate: replaced });
          }
        }
      }
    } catch (err) {
      console.error('Signal handling error:', err);
    }
  };

  const playRemoteAudio = (stream: MediaStream) => {
    const audioEl = remoteAudioRef.current;
    if (!audioEl) return;

    if (audioEl.srcObject !== stream) {
      audioEl.srcObject = stream;
    }
    audioEl.volume = 1.0;
    audioEl.muted = !isSpeakerOn;

    const playPromise = audioEl.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Remote audio autoplay blocked by browser policy, waiting for user gesture:', err);
        const unlock = () => {
          if (remoteAudioRef.current && remoteStreamRef.current) {
            remoteAudioRef.current.srcObject = remoteStreamRef.current;
            remoteAudioRef.current.muted = !isSpeakerOn;
            remoteAudioRef.current.play().catch(() => { });
          }
          if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().catch(() => { });
          }
          window.removeEventListener('click', unlock);
          window.removeEventListener('touchstart', unlock);
          window.removeEventListener('pointerdown', unlock);
        };
        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('touchstart', unlock, { once: true });
        window.addEventListener('pointerdown', unlock, { once: true });
      });
    }
  };

  const cleanupCallResources = () => {
    if (disconnectGraceRef.current) {
      clearTimeout(disconnectGraceRef.current);
      disconnectGraceRef.current = null;
    }
    if (connectGraceTimerRef.current) {
      clearTimeout(connectGraceTimerRef.current);
      connectGraceTimerRef.current = null;
    }
    if (icePollIntervalRef.current) {
      clearInterval(icePollIntervalRef.current);
      icePollIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (fallbackWorkletNodeRef.current) {
      try {
        fallbackWorkletNodeRef.current.port.onmessage = null;
        fallbackWorkletNodeRef.current.disconnect();
      } catch {}
      fallbackWorkletNodeRef.current = null;
    }
    if (fallbackProcessorRef.current) {
      try {
        fallbackProcessorRef.current.onaudioprocess = null;
        fallbackProcessorRef.current.disconnect();
      } catch {}
      fallbackProcessorRef.current = null;
    }
    if (fallbackSourceRef.current) {
      try {
        fallbackSourceRef.current.disconnect();
      } catch {}
      fallbackSourceRef.current = null;
    }
    if (fallbackAudioContextRef.current && fallbackAudioContextRef.current.state !== 'closed') {
      fallbackAudioContextRef.current.close().catch(() => {});
      fallbackAudioContextRef.current = null;
    }
    if (relayPlaybackContextRef.current && relayPlaybackContextRef.current.state !== 'closed') {
      relayPlaybackContextRef.current.close().catch(() => {});
      relayPlaybackContextRef.current = null;
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
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  const handleCallConnectionFailed = () => {
    if (callState === 'ended') return;
    if (durationRef.current > 0) {
      console.log('[CALL_CLIENT] WebRTC P2P disconnected; continuing call over audio relay');
      return;
    }
    console.warn('WebRTC Call Connection Failed: ICE failed or peer disconnected');
    callSoundService.stopAll();
    setCallState('ended');
    setEndReason('failed');
    socketService.endCall(currentUser.handle, user.handle, 'failed');
    cleanupCallResources();

    if (endCallTimerRef.current) {
      clearTimeout(endCallTimerRef.current);
    }
    endCallTimerRef.current = setTimeout(() => {
      onClose({
        type: 'missed',
        duration: 0,
      });
    }, 2500);
  };

  const handleEndCall = () => {
    // Guard against double-close when socket event fires after user already ended call
    if (callState === 'ended') return;
    callSoundService.stopAll();
    const actionReason = durationRef.current > 0 ? 'ended' : 'canceled';
    socketService.endCall(currentUser.handle, user.handle, actionReason);
    setCallState('ended');
    setEndReason(actionReason);
    cleanupCallResources();

    const info: CallInfo = {
      type: durationRef.current > 0 ? (isInitiator ? 'outgoing' : 'incoming') : (isInitiator ? 'canceled' : 'missed'),
      duration: durationRef.current,
    };
    onClose(info);
  };

  const createPeerConnection = (localStream: MediaStream) => {
    const pc = new RTCPeerConnection(getWebRTCConfiguration());
    peerConnectionRef.current = pc;

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });
    configureHighQualitySender(pc);

    // Active ICE candidate-pair poller: detects 'succeeded' connection state within 100-200ms
    if (icePollIntervalRef.current) clearInterval(icePollIntervalRef.current);
    icePollIntervalRef.current = setInterval(async () => {
      if (!peerConnectionRef.current || peerConnectionRef.current !== pc) {
        if (icePollIntervalRef.current) clearInterval(icePollIntervalRef.current);
        return;
      }
      if (pc.connectionState === 'connected' || pc.iceConnectionState === 'connected') {
        if (icePollIntervalRef.current) clearInterval(icePollIntervalRef.current);
        return;
      }
      try {
        const stats = await pc.getStats();
        stats.forEach((report: any) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            console.log('[CALL_CLIENT] Candidate pair succeeded via getStats()');
            if (disconnectGraceRef.current) {
              clearTimeout(disconnectGraceRef.current);
              disconnectGraceRef.current = null;
            }
            callSoundService.stopAll();
            setCallState('connected');
            if (remoteStreamRef.current) {
              playRemoteAudio(remoteStreamRef.current);
            }
            if (fallbackAudioContextRef.current && fallbackAudioContextRef.current.state === 'running') {
              fallbackAudioContextRef.current.suspend().catch(() => {});
            }
            if (icePollIntervalRef.current) clearInterval(icePollIntervalRef.current);
          }
        });
      } catch {
        // ignore
      }
    }, 400);

    pc.ontrack = (event) => {
      console.log('WebRTC ontrack event received:', event.track?.kind, event.streams);
      if (event.receiver && event.track?.kind === 'audio') {
        if ('playoutDelayHint' in event.receiver) {
          (event.receiver as any).playoutDelayHint = 0;
        }
        if ('jitterBufferTarget' in event.receiver) {
          (event.receiver as any).jitterBufferTarget = 0;
        }
      }
      if (event.track) {
        if ('contentHint' in event.track) {
          event.track.contentHint = 'speech';
        }
      }
      const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      remoteStreamRef.current = stream;
      playRemoteAudio(stream);

      // Transition to connected immediately as soon as media flows
      if (disconnectGraceRef.current) {
        clearTimeout(disconnectGraceRef.current);
        disconnectGraceRef.current = null;
      }
      callSoundService.stopAll();
      setCallState('connected');
      if (fallbackAudioContextRef.current && fallbackAudioContextRef.current.state === 'running') {
        fallbackAudioContextRef.current.suspend().catch(() => {});
      }

      if (event.track) {
        event.track.onunmute = () => {
          console.log('WebRTC remote audio track unmuted');
          playRemoteAudio(stream);
          setCallState('connected');
          if (fallbackAudioContextRef.current && fallbackAudioContextRef.current.state === 'running') {
            fallbackAudioContextRef.current.suspend().catch(() => {});
          }
        };
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
        // Clear any disconnect grace timer
        if (disconnectGraceRef.current) {
          clearTimeout(disconnectGraceRef.current);
          disconnectGraceRef.current = null;
        }
        callSoundService.stopAll();
        setCallState('connected');
        if (remoteStreamRef.current) {
          playRemoteAudio(remoteStreamRef.current);
        }
        // Suspend fallback relay to save battery and network bandwidth when P2P direct audio is active
        if (fallbackAudioContextRef.current && fallbackAudioContextRef.current.state === 'running') {
          fallbackAudioContextRef.current.suspend().catch(() => {});
        }
      } else if (pc.connectionState === 'disconnected') {
        // Resume fallback relay while self-healing
        if (fallbackAudioContextRef.current && fallbackAudioContextRef.current.state === 'suspended') {
          fallbackAudioContextRef.current.resume().catch(() => {});
        }
        // Give 5 seconds for self-healing before treating as failed
        if (disconnectGraceRef.current) clearTimeout(disconnectGraceRef.current);
        disconnectGraceRef.current = setTimeout(() => {
          if (peerConnectionRef.current?.connectionState === 'disconnected') {
            handleCallConnectionFailed();
          }
        }, 5000);
      } else if (pc.connectionState === 'failed') {
        handleCallConnectionFailed();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE Connection State changed:', pc.iceConnectionState);
      // Use ICE state as a reliable fallback to transition to connected
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        if (disconnectGraceRef.current) {
          clearTimeout(disconnectGraceRef.current);
          disconnectGraceRef.current = null;
        }
        callSoundService.stopAll();
        setCallState('connected');
        if (remoteStreamRef.current) {
          playRemoteAudio(remoteStreamRef.current);
        }
        // Suspend fallback relay when direct ICE audio is active
        if (fallbackAudioContextRef.current && fallbackAudioContextRef.current.state === 'running') {
          fallbackAudioContextRef.current.suspend().catch(() => {});
        }
      } else if (pc.iceConnectionState === 'disconnected') {
        if (fallbackAudioContextRef.current && fallbackAudioContextRef.current.state === 'suspended') {
          fallbackAudioContextRef.current.resume().catch(() => {});
        }
      } else if (pc.iceConnectionState === 'failed') {
        handleCallConnectionFailed();
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
          latency: 0,
          sampleRate: 48000,
        },
      });
      stream.getAudioTracks().forEach((track) => {
        if ('contentHint' in track) {
          track.contentHint = 'speech';
        }
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

      // Initialize fallback audio relay sender (16kHz PCM with low-latency 60ms chunks)
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const relayCtx = new AudioCtx({ sampleRate: 16000 });
        fallbackAudioContextRef.current = relayCtx;
        const source = relayCtx.createMediaStreamSource(stream);
        fallbackSourceRef.current = source;

        const isP2PActive = () => {
          const p = peerConnectionRef.current;
          if (!p) return false;
          return (
            p.connectionState === 'connected' ||
            p.iceConnectionState === 'connected' ||
            p.iceConnectionState === 'completed'
          );
        };

        const setupScriptProcessorFallback = () => {
          try {
            const processor = relayCtx.createScriptProcessor(1024, 1, 1);
            fallbackProcessorRef.current = processor;
            processor.onaudioprocess = (e) => {
              if (isP2PActive() || isMutedRef.current) return;
              const float32 = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(float32.length);
              for (let i = 0; i < float32.length; i++) {
                const s = Math.max(-1, Math.min(1, float32[i]));
                int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              socketService.sendCallAudioChunk(user.handle, currentUser.handle, int16.buffer);
            };
            source.connect(processor);
            processor.connect(relayCtx.destination);
          } catch (spErr) {
            console.warn('ScriptProcessor fallback failed:', spErr);
          }
        };

        if (relayCtx.audioWorklet && typeof relayCtx.audioWorklet.addModule === 'function') {
          const workletCode = `
            class AudioRelayProcessor extends AudioWorkletProcessor {
              constructor() {
                super();
                // 960 samples at 16kHz = 60ms low-latency chunking
                this.buffer = new Int16Array(960);
                this.offset = 0;
              }
              process(inputs) {
                const input = inputs[0];
                if (!input || !input[0]) return true;
                const channel = input[0];
                for (let i = 0; i < channel.length; i++) {
                  const s = Math.max(-1, Math.min(1, channel[i]));
                  this.buffer[this.offset++] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                  if (this.offset >= this.buffer.length) {
                    this.port.postMessage(this.buffer.buffer, [this.buffer.buffer]);
                    this.buffer = new Int16Array(960);
                    this.offset = 0;
                  }
                }
                return true;
              }
            }
            registerProcessor('audio-relay-processor', AudioRelayProcessor);
          `;
          const blob = new Blob([workletCode], { type: 'application/javascript' });
          const workletUrl = URL.createObjectURL(blob);
          relayCtx.audioWorklet.addModule(workletUrl).then(() => {
            URL.revokeObjectURL(workletUrl);
            if (!mountedRef.current || !fallbackAudioContextRef.current) return;
            try {
              const workletNode = new AudioWorkletNode(relayCtx, 'audio-relay-processor');
              fallbackWorkletNodeRef.current = workletNode;
              workletNode.port.onmessage = (event) => {
                if (isP2PActive() || isMutedRef.current) return;
                if (event.data) {
                  socketService.sendCallAudioChunk(user.handle, currentUser.handle, event.data);
                }
              };
              source.connect(workletNode);
            } catch (createErr) {
              console.warn('Failed to create AudioWorkletNode, using ScriptProcessor:', createErr);
              setupScriptProcessorFallback();
            }
          }).catch((loadErr) => {
            URL.revokeObjectURL(workletUrl);
            console.warn('AudioWorklet module loading failed, falling back:', loadErr);
            setupScriptProcessorFallback();
          });
        } else {
          setupScriptProcessorFallback();
        }
      } catch (relayErr) {
        console.warn('Fallback audio sender initialization skipped:', relayErr);
      }

      // Auto-transition to connected once call is answered and local mic acquired
      // Prevents endless "Connecting..." screen when P2P UDP is blocked by home NAT/firewall
      if (connectGraceTimerRef.current) clearTimeout(connectGraceTimerRef.current);
      connectGraceTimerRef.current = setTimeout(() => {
        if (recipientAcceptedRef.current) {
          console.log('[CALL_CLIENT] Signaling active; auto-transitioning to connected state');
          if (disconnectGraceRef.current) {
            clearTimeout(disconnectGraceRef.current);
            disconnectGraceRef.current = null;
          }
          callSoundService.stopAll();
          setCallState('connected');
          if (remoteStreamRef.current) {
            playRemoteAudio(remoteStreamRef.current);
          }
        }
      }, 2000);

      if (isInitiator) {
        callSoundService.playOutgoing();
        socketService.sendCall(currentUser, user.handle);
      } else {
        // Receiver side: stop ringing and unlock AudioContext immediately on user gesture
        callSoundService.stopAll();
        // Attempt to resume/create AudioContext to avoid autoplay block
        try {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (!audioContextRef.current) {
            audioContextRef.current = new AudioCtx();
          }
          if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().catch(() => {});
          }
        } catch {
          // ignore
        }
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

    const cleanupAudioChunk = socketService.onCallAudioChunk((data) => {
      const fromH = normalizeHandle(data.fromHandle || (data as any).from);
      if (fromH !== normalizeHandle(user.handle)) return;

      const pc = peerConnectionRef.current;
      const isP2PConnected = pc && (
        pc.connectionState === 'connected' ||
        pc.iceConnectionState === 'connected' ||
        pc.iceConnectionState === 'completed'
      );
      if (isP2PConnected) return;

      try {
        const rawBuffer = data.audio;
        if (!rawBuffer) return;
        const int16 = new Int16Array(rawBuffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7FFF);
        }

        if (!relayPlaybackContextRef.current || relayPlaybackContextRef.current.state === 'closed') {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          relayPlaybackContextRef.current = new AudioCtx({ sampleRate: 16000 });
        }
        const ctx = relayPlaybackContextRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const audioBuf = ctx.createBuffer(1, float32.length, 16000);
        audioBuf.copyToChannel(float32, 0);

        const bufferSource = ctx.createBufferSource();
        bufferSource.buffer = audioBuf;

        const gainNode = ctx.createGain();
        gainNode.gain.value = isSpeakerOnRef.current ? 1.0 : 0.0;
        bufferSource.connect(gainNode);
        gainNode.connect(ctx.destination);

        const now = ctx.currentTime;
        const targetLead = 0.025; // 25ms lead for smooth jitter-free playback
        let startTime = nextAudioStartTimeRef.current;

        // Anti-latency clamp:
        // If scheduled playout fell behind real-time (underrun)
        // OR if the queue drifted more than 60ms into the future (latency accumulation from packet bursts):
        if (startTime < now || startTime > now + 0.06) {
          startTime = now + targetLead;
        }

        bufferSource.start(startTime);
        nextAudioStartTimeRef.current = startTime + audioBuf.duration;

        if (disconnectGraceRef.current) {
          clearTimeout(disconnectGraceRef.current);
          disconnectGraceRef.current = null;
        }
        callSoundService.stopAll();
        setCallState('connected');
      } catch (chunkErr) {
        console.warn('Error processing audio chunk:', chunkErr);
      }
    });

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
        setCallState('connecting');

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
        let resReason: 'ended' | 'declined' | 'no_answer' | 'canceled' | 'failed' = 'ended';
        if (reason === 'failed') resReason = 'failed';
        else if (reason === 'timeout') resReason = 'no_answer';
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
        }, resReason === 'failed' ? 2500 : 1200);
      }
    });

    return () => {
      cleanupAudioChunk();
      cleanupWebRTC();
      cleanupCallAccepted();
      cleanupCallDeclined();
      cleanupCallEnded();
      callSoundService.stopAll();

      if (endCallTimerRef.current) {
        clearTimeout(endCallTimerRef.current);
        endCallTimerRef.current = null;
      }
      if (disconnectGraceRef.current) {
        clearTimeout(disconnectGraceRef.current);
        disconnectGraceRef.current = null;
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
        peerConnectionRef.current.oniceconnectionstatechange = null;
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
      if (remoteStreamRef.current) {
        playRemoteAudio(remoteStreamRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => { });
      }
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

  // 30-second Connecting Timeout (Auto fail if ICE handshake gets permanently stuck)
  useEffect(() => {
    if (callState === 'connecting') {
      const connTimer = setTimeout(() => {
        if (callState === 'connecting') {
          console.warn('ICE connection timeout: exceeded 30s without reaching connected state');
          handleCallConnectionFailed();
        }
      }, 30000);
      return () => clearTimeout(connTimer);
    }
  }, [callState]);

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
    setIsSpeakerOn((prev) => {
      const next = !prev;
      isSpeakerOnRef.current = next;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.muted = !next;
      }
      return next;
    });
  };

  useEffect(() => {
    isSpeakerOnRef.current = isSpeakerOn;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerOn;
    }
  }, [isSpeakerOn]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // ── Pill drag handlers (Pointer Events: mouse + touch unified) ──
  const handlePillPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Don't start drag when a button is tapped
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pillDragRef.current = {
      isDragging: true,
      startClientY: e.clientY,
      startPillY: pillY,
      hasDragged: false,
    };
  };

  const handlePillPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pillDragRef.current.isDragging) return;
    const deltaY = e.clientY - pillDragRef.current.startClientY;
    if (Math.abs(deltaY) > 4) pillDragRef.current.hasDragged = true;
    const maxY = window.innerHeight - 64; // keep pill on screen
    const newY = Math.max(0, Math.min(maxY, pillDragRef.current.startPillY + deltaY));
    setPillY(newY);
  };

  const handlePillPointerUp = () => {
    if (!pillDragRef.current.isDragging) return;
    pillDragRef.current.isDragging = false;
    // Only expand if it was a tap, not a drag
    if (!pillDragRef.current.hasDragged) {
      setIsMinimized(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Hidden audio element with autoplay for remote audio stream without buggy React JSX muted attribute */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        onCanPlay={() => {
          if (remoteStreamRef.current) playRemoteAudio(remoteStreamRef.current);
        }}
        onLoadedMetadata={() => {
          if (remoteStreamRef.current) playRemoteAudio(remoteStreamRef.current);
        }}
      />

      {isMinimized ? (
        /* Floating Minimized Call Pill — draggable */
        <div
          onPointerDown={handlePillPointerDown}
          onPointerMove={handlePillPointerMove}
          onPointerUp={handlePillPointerUp}
          style={{ top: pillY }}
          className="fixed left-0 right-0 mx-auto z-[9999] w-[92%] max-w-sm bg-ez-elevated/95 border border-neon-green/40 shadow-[0_10px_35px_rgba(0,0,0,0.6),0_0_20px_rgba(0,230,118,0.25)] rounded-full px-4 py-2 grid grid-cols-[1fr_auto_auto] items-center gap-3 animate-fade-in select-none font-sans touch-none cursor-grab active:cursor-grabbing hover:border-neon-green transition-[border-color] will-change-[top]"
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
                <span className={`font-mono font-semibold ${callState === 'ended' && endReason === 'failed' ? 'text-rose-400' : 'text-neon-green'}`}>
                  {callState === 'connected'
                    ? formatDuration(callDuration)
                    : callState === 'connecting'
                      ? (t.calls?.connecting || 'Connecting...')
                      : callState === 'ended'
                        ? (endReason === 'failed'
                          ? (t.calls?.connectionFailed || 'Connection failed')
                          : endReason === 'declined'
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

          {/* CENTER: End Call — always in the middle of the pill */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleEndCall(); }}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleEndCall(); }}
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center shrink-0 bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.5)] transition-all hover:scale-110 active:scale-95 cursor-pointer border border-rose-400/30 relative z-50"
            title={t.calls.endCall}
          >
            <PhoneOff className="w-4 h-4 pointer-events-none" />
          </button>

          {/* RIGHT: Mini waveform (sm+) + Mute + Expand */}
          <div className="flex items-center space-x-2 shrink-0" onClick={(e) => e.stopPropagation()}>
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
            <button
              type="button"
              onClick={toggleMute}
              className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${isMuted
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10'
                }`}
              title={isMuted ? t.calls.unmuteMic : t.calls.muteMic}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
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
        <div
          onClick={() => {
            if (remoteStreamRef.current) playRemoteAudio(remoteStreamRef.current);
          }}
          className="fixed inset-0 z-[9999] flex sm:items-center sm:justify-center p-0 sm:p-4 bg-black/95 animate-fade-in select-none font-sans"
        >
          <div className="relative w-full h-full sm:h-auto sm:max-w-sm bg-ez-base border-0 sm:border border-neon-green/30 rounded-none sm:rounded-3xl p-6 sm:p-7 flex flex-col items-center justify-center text-center overflow-hidden transform-gpu will-change-[transform,opacity]">
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
              {(callState === 'calling' || callState === 'connecting') && (
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
              ) : callState === 'connecting' ? (
                <span className="text-xs font-bold text-neon-green animate-pulse flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-neon-green animate-spin" />
                  <span>{t.calls?.connecting || 'Connecting...'}</span>
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
                  {endReason === 'failed' ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="text-xs font-bold text-rose-400">{t.calls?.connectionFailed || 'Connection failed (check network)'}</span>
                    </>
                  ) : endReason === 'declined' ? (
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
                onTouchEnd={(e) => { e.preventDefault(); handleEndCall(); }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.45)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-rose-400/30 relative z-50"
                title={t.calls.endCall}
              >
                <PhoneOff className="w-6 h-6 pointer-events-none" />
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
