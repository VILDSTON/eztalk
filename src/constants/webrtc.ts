/**
 * WebRTC and ICE Configuration for EzTalk Voice Calls
 * 
 * Provides high-availability STUN servers and TURN relay servers.
 * TURN relay is essential for establishing connections across Symmetric NAT,
 * mobile CGNAT (LTE/5G), and restrictive firewalls where direct P2P is blocked.
 */

export const getWebRTCConfiguration = (): RTCConfiguration => {
  const iceServers: RTCIceServer[] = [
    // High-availability Public STUN Servers (Google, Cloudflare, Matrix, Syncthing, Nextcloud)
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
        'stun:stun.cloudflare.com:3478',
        'stun:turn.matrix.org:3478',
        'stun:stun.syncthing.net:3478',
        'stun:stun.nextcloud.com:443',
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

  return {
    iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
};

export const ICE_CONFIGURATION = getWebRTCConfiguration();
