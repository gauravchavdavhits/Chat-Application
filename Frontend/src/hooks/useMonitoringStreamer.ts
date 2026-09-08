import { useEffect, useRef, useState, useCallback } from 'react';
import { UserProfile } from '../types/chat.types';
import { getSocket } from '../services/socket';

export interface PendingScreenShareRequest {
  adminId: string;
  adminName: string;
  intervalSeconds?: number;
}

/**
 * Hook to run on the client side (user).
 * Displays a consent modal when an admin requests screen monitoring.
 * Only after explicit user click on "Accept & Share" does navigator.mediaDevices.getDisplayMedia get invoked.
 */
export function useMonitoringStreamer(currentUser: UserProfile | null) {
  const [isBeingMonitored, setIsBeingMonitored] = useState(false);
  const [activeAdminName, setActiveAdminName] = useState<string | null>(null);
  const [pendingRequest, setPendingRequest] = useState<PendingScreenShareRequest | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const activeAdminIdRef = useRef<string | null>(null);

  const stopStreaming = useCallback(() => {
    const socket = getSocket();
    if (activeAdminIdRef.current) {
      socket.emit('user_monitoring_stopped', {
        adminId: activeAdminIdRef.current,
        userId: currentUser?._id || '',
      });
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setIsBeingMonitored(false);
    setActiveAdminName(null);
    setPendingRequest(null);
    activeAdminIdRef.current = null;
  }, [currentUser?._id]);

  // Handle explicit user acceptance of screen share request
  const acceptScreenShare = async () => {
    if (!pendingRequest || !currentUser) return;
    const req = { ...pendingRequest };
    setPendingRequest(null);

    const socket = getSocket();
    activeAdminIdRef.current = req.adminId;
    setActiveAdminName(req.adminName);

    try {
      // Request browser screen capture permission
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 30, max: 60 },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false,
      });

      localStreamRef.current = stream;

      // Handle user stopping stream from native browser button
      stream.getVideoTracks()[0].onended = () => {
        stopStreaming();
      };

      // Create WebRTC Peer Connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      peerConnectionRef.current = pc;

      // Add tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && activeAdminIdRef.current) {
          socket.emit('monitoring_ice_candidate', {
            targetUserId: activeAdminIdRef.current,
            candidate: event.candidate,
          });
        }
      };

      // Create Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('user_monitoring_offer', {
        adminId: req.adminId,
        userId: currentUser._id,
        username: currentUser.username,
        sdp: offer,
      });

      setIsBeingMonitored(true);
    } catch (err: any) {
      console.warn('[Monitoring] Screen sharing permission cancelled or denied:', err);
      socket.emit('user_monitoring_rejected', {
        adminId: req.adminId,
        userId: currentUser._id,
        username: currentUser.username,
      });
      stopStreaming();
    }
  };

  // Handle explicit user rejection of screen share request
  const rejectScreenShare = () => {
    if (!pendingRequest || !currentUser) return;
    const socket = getSocket();
    socket.emit('user_monitoring_rejected', {
      adminId: pendingRequest.adminId,
      userId: currentUser._id,
      username: currentUser.username,
    });
    setPendingRequest(null);
  };

  useEffect(() => {
    if (!currentUser) return;
    const socket = getSocket();

    // 1. Admin sends live screen monitoring request -> Show consent prompt to user
    const handleMonitoringRequested = (data: PendingScreenShareRequest) => {
      console.log(`[Monitoring] Screen share requested by Admin: ${data.adminName}`);
      setPendingRequest(data);
    };

    // 2. Admin WebRTC answer
    const handleAdminAnswer = async (data: { sdp: any; adminId: string }) => {
      if (peerConnectionRef.current && data.sdp) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } catch (err) {
          console.error('[Monitoring] Error setting remote description from admin answer:', err);
        }
      }
    };

    // 3. Admin ICE candidates
    const handleAdminIceCandidate = async (data: { candidate: any }) => {
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error('[Monitoring] Error adding ICE candidate from admin:', err);
        }
      }
    };

    // 4. Admin stops monitoring session
    const handleMonitoringStopped = () => {
      console.log('[Monitoring] Admin terminated monitoring session');
      stopStreaming();
    };

    socket.on('admin_monitoring_requested', handleMonitoringRequested);
    socket.on('admin_monitoring_answer', handleAdminAnswer);
    socket.on('monitoring_ice_candidate', handleAdminIceCandidate);
    socket.on('admin_monitoring_stopped', handleMonitoringStopped);

    return () => {
      socket.off('admin_monitoring_requested', handleMonitoringRequested);
      socket.off('admin_monitoring_answer', handleAdminAnswer);
      socket.off('monitoring_ice_candidate', handleAdminIceCandidate);
      socket.off('admin_monitoring_stopped', handleMonitoringStopped);
      stopStreaming();
    };
  }, [currentUser, stopStreaming]);

  return {
    isBeingMonitored,
    activeAdminName,
    pendingRequest,
    acceptScreenShare,
    rejectScreenShare,
    stopStreaming,
  };
}
