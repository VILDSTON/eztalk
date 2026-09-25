/**
 * WebRTC and ICE Configuration for EzTalk Voice Calls
 * 
 * Provides high-availability STUN servers and TURN relay servers.
 * TURN relay is essential for establishing connections across Symmetric NAT,
 * mobile CGNAT (LTE/5G), and restrictive firewalls where direct P2P is blocked.
 */

export const getWebRTCConfiguration = (): RTCConfiguration => {
  const iceServers: RTCIceServer[] = [
    // High-availability Public STUN Servers
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
        'stun:stun.cloudflare.com:3478',
      ],
    },
  ];

  // Optional custom TURN servers via environment variables (e.g. self-hosted Coturn, Twilio, Metered)
  const envTurnUrls = (import.meta.env.VITE_TURN_URLS || import.meta.env.VITE_TURN_SERVER_URL) as string | undefined;
  const envTurnUsername = (import.meta.env.VITE_TURN_USERNAME) as string | undefined;
  const envTurnCredential = (import.meta.env.VITE_TURN_CREDENTIAL) as string | undefined;

  if (envTurnUrls) {
    const urls = envTurnUrls
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);

    if (urls.length > 0) {
      iceServers.push({
        urls,
        username: envTurnUsername || undefined,
        credential: envTurnCredential || undefined,
      });
    }
  }

  // Free OpenRelay (Metered.ca) TURN servers for guaranteed fallback
  // Includes UDP, TCP, and TLS on port 443 (which penetrates virtually all enterprise/carrier firewalls)
  iceServers.push({
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
      'turns:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  });

  return {
    iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
};

export const ICE_CONFIGURATION = getWebRTCConfiguration();
