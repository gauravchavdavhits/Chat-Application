import { useEffect, useState, useRef, useCallback } from 'react';
import { getSocket } from '../services/socket';
import { UserProfile } from '../types/chat.types';
import { soundService } from '../services/soundService';
import { getAllUsersApi, getUserByIdApi } from '../services/userService';

export type ConnectionQuality = 'connected' | 'connecting' | 'reconnecting' | 'failed' | 'disconnected';

export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  stream?: MediaStream;
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
}

export interface CallState {
  isReceivingCall: boolean;
  isCalling: boolean;
  callAccepted: boolean;
  callEnded: boolean;
  caller: { id: string; name: string; avatar?: string } | null;
  isVideoCall: boolean;
  startedAt?: Date;
  roomId?: string;
}

export function useWebRTC(currentUser: UserProfile | null) {
  const [callState, setCallState] = useState<CallState>({
    isReceivingCall: false,
    isCalling: false,
    callAccepted: false,
    callEnded: false,
    caller: null,
    isVideoCall: false,
  });

  const [participants, setParticipants] = useState<Participant[]>([]);
  const participantsRef = useRef<Participant[]>([]);
  participantsRef.current = participants;

  const [mutedParticipants, setMutedParticipants] = useState<string[]>([]);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('connecting');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  
  // Multi-peer map: targetUserId -> RTCPeerConnection
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceCandidatesMap = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const [localMicMuted, setLocalMicMuted] = useState(false);
  const [localVideoOff, setLocalVideoOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const currentFacingMode = useRef<'user' | 'environment'>('user');

  const clearCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    soundService.stopCallSounds();
  }, []);

  // Stop all media tracks
  const stopMediaTracks = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    if (remoteStream.current) {
      remoteStream.current.getTracks().forEach((track) => track.stop());
      remoteStream.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    // Close all peer connections
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    pendingIceCandidatesMap.current.clear();
    setParticipants([]);
  };

  const attachLocalStream = () => {
    if (localVideoRef.current && localStream.current) {
      localVideoRef.current.srcObject = localStream.current;
    }
  };

  const attachRemoteStream = () => {
    if (remoteVideoRef.current && remoteStream.current) {
      remoteVideoRef.current.srcObject = remoteStream.current;
      const p = remoteVideoRef.current.play();
      if (p !== undefined) {
        p.catch((e) => console.warn('Remote video playback warning:', e));
      }
    }
  };

  // Re-attach media streams whenever call is accepted or UI renders
  useEffect(() => {
    if (callState.callAccepted || callState.isCalling) {
      attachLocalStream();
      attachRemoteStream();
    }
  }, [callState.callAccepted, callState.isCalling]);

  const getMedia = async (video: boolean) => {
    try {
      if (localStream.current) {
        localStream.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      localStream.current = stream;
      attachLocalStream();
      return stream;
    } catch (err) {
      console.error('Failed to get local stream', err);
      alert('Could not access camera or microphone. Please ensure permissions are granted.');
      return null;
    }
  };

  const createPeerConnection = (targetUserId: string, targetUserInfo?: { name?: string; avatar?: string }) => {
    const socket = getSocket();
    
    // If existing connection exists, close it first
    if (peerConnections.current.has(targetUserId)) {
      peerConnections.current.get(targetUserId)?.close();
    }

    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
      iceCandidatePoolSize: 10,
    });

    // Add local tracks to peer connection
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStream.current!);
      });
    }

    let userStream = new MediaStream();

    peer.ontrack = (event) => {
      console.log(`📡 Received remote track from ${targetUserId}:`, event.track.kind);
      if (event.streams && event.streams[0]) {
        remoteStream.current = event.streams[0];
        updateParticipantStream(targetUserId, event.streams[0]);
      } else {
        userStream.addTrack(event.track);
        remoteStream.current = userStream;
        updateParticipantStream(targetUserId, userStream);
      }
      attachRemoteStream();
    };

    peer.onicecandidate = (event) => {
      if (event.candidate && currentUser) {
        socket.emit('ice_candidate', {
          to: targetUserId,
          from: currentUser._id,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    peer.oniceconnectionstatechange = () => {
      console.log(`📶 ICE State change for ${targetUserId}:`, peer.iceConnectionState);
      if (peer.iceConnectionState === 'connected' || peer.iceConnectionState === 'completed') {
        setConnectionQuality('connected');
      } else if (peer.iceConnectionState === 'checking' || peer.iceConnectionState === 'new') {
        setConnectionQuality('connecting');
      } else if (peer.iceConnectionState === 'disconnected') {
        setConnectionQuality('reconnecting');
      } else if (peer.iceConnectionState === 'failed') {
        setConnectionQuality('failed');
      }
    };

    peer.onconnectionstatechange = () => {
      console.log(`🌐 Connection state change for ${targetUserId}:`, peer.connectionState);
      if (peer.connectionState === 'connected') {
        setConnectionQuality('connected');
      } else if (peer.connectionState === 'connecting') {
        setConnectionQuality('connecting');
      } else if (peer.connectionState === 'disconnected') {
        setConnectionQuality('reconnecting');
      } else if (peer.connectionState === 'failed') {
        setConnectionQuality('failed');
      }
    };

    peerConnections.current.set(targetUserId, peer);

    // Track participant in state or update if name/avatar became available
    setParticipants((prev) => {
      const existingIndex = prev.findIndex((p) => p.id === targetUserId);
      if (existingIndex >= 0) {
        return prev.map((p) =>
          p.id === targetUserId
            ? {
                ...p,
                name: targetUserInfo?.name && targetUserInfo.name !== 'Participant' && targetUserInfo.name !== 'Group Member' ? targetUserInfo.name : p.name,
                avatar: targetUserInfo?.avatar || p.avatar,
                stream: userStream || p.stream,
              }
            : p
        );
      }
      return [
        ...prev,
        {
          id: targetUserId,
          name: targetUserInfo?.name || 'Participant',
          avatar: targetUserInfo?.avatar,
          stream: userStream,
        },
      ];
    });

    return peer;
  };

  const updateParticipantStream = (userId: string, stream: MediaStream) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, stream } : p))
    );
  };

  const removeParticipant = (userId: string) => {
    if (peerConnections.current.has(userId)) {
      peerConnections.current.get(userId)?.close();
      peerConnections.current.delete(userId);
    }
    pendingIceCandidatesMap.current.delete(userId);

    setParticipants((prev) => prev.filter((p) => p.id !== userId));

    // If no other participants are left in the call and we were calling someone, end call
    if (peerConnections.current.size === 0 && callState.callAccepted) {
      leaveCall();
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    const socket = getSocket();

    const handleCallUser = async (data: any) => {
      if (data.signal?.type === 'offer') {
        clearCallTimeout();
        soundService.playRingtone();
        setCallState({
          isReceivingCall: true,
          isCalling: false,
          callAccepted: false,
          callEnded: false,
          caller: { id: data.from, name: data.name, avatar: data.avatar },
          isVideoCall: data.isVideoCall,
          roomId: data.callRoomId || [data.from, currentUser._id].sort().join('_'),
        });
        (window as any).incomingOffer = data.signal;
        (window as any).incomingCallerData = data;

        // Auto-reject / missed call if receiver does not answer within 30 seconds
        callTimeoutRef.current = setTimeout(() => {
          handleCallEnded({ leftUserId: data.from });
        }, 30000);
      }
    };

    const handleCallAccepted = async (data: any) => {
      clearCallTimeout();
      soundService.stopCallSounds();
      const signal = data.signal || data;
      const fromId = data.from || callState.caller?.id;

      if (fromId && signal?.type === 'answer') {
        const peer = peerConnections.current.get(fromId);
        if (peer) {
          await peer.setRemoteDescription(new RTCSessionDescription(signal));
          // Flush any queued ICE candidates for this peer
          const queued = pendingIceCandidatesMap.current.get(fromId) || [];
          for (const candidate of queued) {
            try {
              await peer.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.error('Error adding queued ice candidate', e);
            }
          }
          pendingIceCandidatesMap.current.delete(fromId);
        }
      }

      setCallState((prev) => ({
        ...prev,
        callAccepted: true,
        isCalling: false,
        startedAt: new Date(),
      }));

      // Join the shared room for multi-participant updates
      const roomId = callState.roomId || [currentUser._id, callState.caller?.id].sort().join('_');
      socket.emit('join_call_room', {
        roomId,
        user: { _id: currentUser._id, username: currentUser.username, avatar: currentUser.avatar },
        isVideoCall: callState.isVideoCall,
      });

      setTimeout(() => {
        attachLocalStream();
        attachRemoteStream();
      }, 100);
    };

    const handleUserBusy = (data: { message?: string }) => {
      console.warn('⚠️ Target user is busy:', data?.message);
      clearCallTimeout();
      soundService.stopCallSounds();
      alert(data?.message || 'The user is currently on another call.');
      leaveCall();
    };

    const handleCallMicToggled = (data: { userId: string; isMuted: boolean }) => {
      console.log('🎙️ Remote mic toggled:', data);
      if (data?.userId) {
        setMutedParticipants((prev) => {
          if (data.isMuted) {
            return prev.includes(data.userId) ? prev : [...prev, data.userId];
          } else {
            return prev.filter((id) => id !== data.userId);
          }
        });
      }
    };

    const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit; from?: string }) => {
      const fromId = data.from || callState.caller?.id;
      if (data?.candidate && fromId) {
        const peer = peerConnections.current.get(fromId);
        if (peer && peer.remoteDescription && peer.remoteDescription.type) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.error('Error adding received ice candidate', e);
          }
        } else {
          if (!pendingIceCandidatesMap.current.has(fromId)) {
            pendingIceCandidatesMap.current.set(fromId, []);
          }
          pendingIceCandidatesMap.current.get(fromId)!.push(data.candidate);
        }
      }
    };

    // When an added participant joins the active call room
    const handleRoomUserJoined = async (data: { user: UserProfile; isVideoCall: boolean }) => {
      console.log('👤 Room participant joined:', data.user.username);
      if (!data.user || data.user._id === currentUser._id) return;

      // Create an offer to the newly joined participant
      const peer = createPeerConnection(data.user._id, {
        name: data.user.username,
        avatar: data.user.avatar,
      });

      const offer = await peer.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callState.isVideoCall,
      });
      await peer.setLocalDescription(offer);

      socket.emit('call_room_signal', {
        to: data.user._id,
        from: { _id: currentUser._id, username: currentUser.username, avatar: currentUser.avatar },
        signal: offer,
        isVideoCall: callState.isVideoCall,
      });
    };

    // When receiving signals from room participants
    const handleRoomSignal = async (data: { from: UserProfile; signal: any; isVideoCall: boolean }) => {
      const { from, signal, isVideoCall } = data;
      if (!from || from._id === currentUser._id) return;

      if (signal.type === 'offer') {
        const peer = createPeerConnection(from._id, {
          name: from.username,
          avatar: from.avatar,
        });

        await peer.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socket.emit('call_room_signal', {
          to: from._id,
          from: { _id: currentUser._id, username: currentUser.username, avatar: currentUser.avatar },
          signal: answer,
          isVideoCall,
        });
      } else if (signal.type === 'answer') {
        const peer = peerConnections.current.get(from._id);
        if (peer) {
          await peer.setRemoteDescription(new RTCSessionDescription(signal));
        }
      }
    };

    // When a participant leaves the call, only remove that specific user without ending the call for others
    const handleRoomUserLeft = (data: { userId: string; username?: string }) => {
      console.log(`👋 Participant left: ${data.username || data.userId}`);
      if (data?.userId) {
        removeParticipant(data.userId);
      }
    };

    const handleCallEnded = (data?: { leftUserId?: string }) => {
      const leftId = data?.leftUserId;
      // If a specific participant left in a multi-party call, remove them only
      if (leftId && peerConnections.current.size > 1) {
        removeParticipant(leftId);
        return;
      }

      clearCallTimeout();
      soundService.stopCallSounds();
      setCallState((prev) => ({
        ...prev,
        isReceivingCall: false,
        isCalling: false,
        callAccepted: false,
        callEnded: true,
        caller: null,
        isVideoCall: false,
      }));
      stopMediaTracks();
    };

    const handleCallUpgradedToVideo = async (data: { from: string; roomId?: string; to?: string }) => {
      // Check if this upgrade belongs to our current active call
      const isActiveCall = callState.callAccepted || callState.isCalling || callState.isReceivingCall;
      const matchesRoom = !data.roomId || data.roomId === callState.roomId;
      const matchesPeer = !data.to || data.to === currentUser._id || data.from === callState.caller?.id;

      if (!isActiveCall || (!matchesRoom && !matchesPeer)) {
        return;
      }

      console.log('📹 Call was upgraded to video by', data.from);
      setCallState((prev) => ({ ...prev, isVideoCall: true }));

      try {
        if (!localStream.current || localStream.current.getVideoTracks().length === 0) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          }).catch(async () => {
            return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          });

          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            if (!localStream.current) {
              localStream.current = stream;
            } else {
              localStream.current.addTrack(videoTrack);
            }

            peerConnections.current.forEach(async (peer) => {
              const videoSender = peer.getSenders().find((s) => s.track?.kind === 'video');
              if (videoSender) {
                await videoSender.replaceTrack(videoTrack);
              } else {
                peer.addTrack(videoTrack, localStream.current!);
              }
            });
            attachLocalStream();
            setLocalVideoOff(false);
          }
        }
      } catch (e) {
        console.warn('Could not auto-open camera on video upgrade', e);
        setLocalVideoOff(true);
      }

      setTimeout(() => {
        attachLocalStream();
        attachRemoteStream();
      }, 100);
    };


    socket.on('call_user', handleCallUser);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('user_busy', handleUserBusy);
    socket.on('call_mic_toggled', handleCallMicToggled);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('call_room_user_joined', handleRoomUserJoined);
    socket.on('call_room_signal', handleRoomSignal);
    socket.on('call_room_user_left', handleRoomUserLeft);
    socket.on('call_upgraded_to_video', handleCallUpgradedToVideo);
    socket.on('call_ended', handleCallEnded);

    return () => {
      clearCallTimeout();
      socket.off('call_user', handleCallUser);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('user_busy', handleUserBusy);
      socket.off('call_mic_toggled', handleCallMicToggled);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('call_room_user_joined', handleRoomUserJoined);
      socket.off('call_room_signal', handleRoomSignal);
      socket.off('call_room_user_left', handleRoomUserLeft);
      socket.off('call_upgraded_to_video', handleCallUpgradedToVideo);
      socket.off('call_ended', handleCallEnded);
    };
  }, [currentUser, callState.callAccepted, callState.roomId, callState.isVideoCall, clearCallTimeout]);


  const callUser = async (userToCall: string, isVideoCall: boolean, targetName?: string, targetAvatar?: string) => {
    if (!currentUser) return;
    clearCallTimeout();
    soundService.playDialtone();
    
    const roomId = [currentUser._id, userToCall].sort().join('_');

    setCallState({
      isReceivingCall: false,
      isCalling: true,
      callAccepted: false,
      callEnded: false,
      caller: { id: userToCall, name: targetName || 'Calling...', avatar: targetAvatar },
      isVideoCall,
      roomId,
    });
    setLocalMicMuted(false);
    setLocalVideoOff(false);

    await getMedia(isVideoCall);
    const peer = createPeerConnection(userToCall, { name: targetName, avatar: targetAvatar });
    
    const offer = await peer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: isVideoCall,
    });
    await peer.setLocalDescription(offer);
    
    const socket = getSocket();
    socket.emit('call_user', {
      userToCall,
      signalData: offer,
      from: currentUser._id,
      name: currentUser.username,
      avatar: currentUser.avatar,
      isVideoCall,
      callRoomId: roomId,
    });

    // Auto-cut after 30 seconds if call is not answered
    callTimeoutRef.current = setTimeout(() => {
      leaveCall();
    }, 30000);
  };

  const answerCall = async () => {
    if (!callState.caller || !currentUser) return;
    clearCallTimeout();
    
    const callerId = callState.caller.id;
    const isVideo = callState.isVideoCall;
    const roomId = callState.roomId || [callerId, currentUser._id].sort().join('_');

    setCallState((prev) => ({ 
      ...prev, 
      callAccepted: true, 
      isReceivingCall: false, 
      startedAt: new Date(),
      roomId,
    }));
    setLocalMicMuted(false);
    setLocalVideoOff(false);

    await getMedia(isVideo);
    const peer = createPeerConnection(callerId, { name: callState.caller.name, avatar: callState.caller.avatar });
    
    if ((window as any).incomingOffer) {
      await peer.setRemoteDescription(new RTCSessionDescription((window as any).incomingOffer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      
      const socket = getSocket();
      socket.emit('answer_call', {
        to: callerId,
        signal: answer,
      });

      socket.emit('join_call_room', {
        roomId,
        user: { _id: currentUser._id, username: currentUser.username, avatar: currentUser.avatar },
        isVideoCall: isVideo,
      });

      (window as any).incomingOffer = null;
      
      // Process queued ICE candidates
      const queued = pendingIceCandidatesMap.current.get(callerId) || [];
      for (const candidate of queued) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding queued ice candidate', e);
        }
      }
      pendingIceCandidatesMap.current.delete(callerId);

      setTimeout(() => {
        attachLocalStream();
        attachRemoteStream();
      }, 100);
    }
  };

  // Start a full group voice or video call
  const startGroupCall = async (group: any, isVideoCall: boolean) => {
    if (!currentUser || !group) return;
    clearCallTimeout();
    soundService.playDialtone();

    const roomId = `group_${group._id}`;
    const otherMembers: any[] = (group.members || []).filter((m: any) => {
      const id = typeof m === 'string' ? m : m._id;
      return id !== currentUser._id;
    });

    // Fetch all user profiles to ensure we have member names & avatars
    let usersMap: Record<string, UserProfile> = {};
    try {
      const usersRes = await getAllUsersApi();
      if (usersRes?.success && Array.isArray(usersRes.data)) {
        usersRes.data.forEach((u) => {
          usersMap[u._id] = u;
        });
      }
    } catch (e) {
      console.warn('Could not pre-fetch users for group call:', e);
    }

    setCallState({
      isReceivingCall: false,
      isCalling: true,
      callAccepted: true,
      callEnded: false,
      caller: { id: group._id, name: group.name, avatar: group.avatar },
      isVideoCall,
      startedAt: new Date(),
      roomId,
    });
    setLocalMicMuted(false);
    setLocalVideoOff(false);

    await getMedia(isVideoCall);

    const socket = getSocket();
    // Join multi-user call room
    socket.emit('join_call_room', {
      roomId,
      user: { _id: currentUser._id, username: currentUser.username, avatar: currentUser.avatar },
      isVideoCall,
    });

    // Ring all other group members simultaneously with their proper info
    for (const member of otherMembers) {
      const memberId = typeof member === 'string' ? member : member._id;
      const memberProfile = typeof member === 'object' && member.username ? member : usersMap[memberId];
      const memberName = memberProfile?.username || 'Group Member';
      const memberAvatar = memberProfile?.avatar;

      try {
        const peer = createPeerConnection(memberId, { name: memberName, avatar: memberAvatar });
        const offer = await peer.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: isVideoCall,
        });
        await peer.setLocalDescription(offer);

        socket.emit('call_user', {
          userToCall: memberId,
          signalData: offer,
          from: currentUser._id,
          name: `${group.name} (Group Call)`,
          avatar: group.avatar || currentUser.avatar,
          isVideoCall,
          callRoomId: roomId,
        });
      } catch (e) {
        console.error(`Error ringing group member ${memberId}:`, e);
      }
    }
  };

  // Ring/invite additional participant mid-call
  const inviteParticipant = async (userToInvite: UserProfile) => {
    if (!currentUser || !callState.callAccepted) return;
    const socket = getSocket();
    const roomId = callState.roomId || `${currentUser._id}_call_${Date.now()}`;

    const peer = createPeerConnection(userToInvite._id, {
      name: userToInvite.username,
      avatar: userToInvite.avatar,
    });

    const offer = await peer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: callState.isVideoCall,
    });
    await peer.setLocalDescription(offer);

    socket.emit('call_user', {
      userToCall: userToInvite._id,
      signalData: offer,
      from: currentUser._id,
      name: `${currentUser.username} (Group Call)`,
      avatar: currentUser.avatar,
      isVideoCall: callState.isVideoCall,
      callRoomId: roomId,
    });
  };

  const leaveCall = useCallback(() => {
    clearCallTimeout();
    const socket = getSocket();
    const roomId = callState.roomId;

    if (roomId && currentUser) {
      socket.emit('leave_call_room', {
        roomId,
        userId: currentUser._id,
        username: currentUser.username,
      });
    }

    if (callState.caller && currentUser) {
      const endedAt = new Date();
      const duration = callState.startedAt 
        ? Math.floor((endedAt.getTime() - callState.startedAt.getTime()) / 1000) 
        : 0;

      let status = 'completed';
      if (!callState.callAccepted) {
        status = callState.isCalling ? 'cancelled' : 'rejected';
      }

      socket.emit('end_call', { 
        to: callState.caller.id,
        callerId: callState.isCalling ? currentUser._id : callState.caller.id,
        receiverId: callState.isCalling ? callState.caller.id : currentUser._id,
        callType: callState.isVideoCall ? 'video' : 'voice',
        status,
        duration,
        startedAt: callState.startedAt || endedAt,
        endedAt,
        roomId,
      });
    }

    setCallState({
      isReceivingCall: false,
      isCalling: false,
      callAccepted: false,
      callEnded: true,
      caller: null,
      isVideoCall: false,
    });
    
    stopMediaTracks();
  }, [callState, currentUser, clearCallTimeout]);

  const startScreenShare = async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Screen sharing is not supported by your browser.');
      }
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const newScreenTrack = displayStream.getVideoTracks()[0];
      if (!newScreenTrack) return false;

      screenTrackRef.current = newScreenTrack;

      // Replace video track across all active peer connections
      peerConnections.current.forEach(async (peer) => {
        const senders = peer.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          if (!originalVideoTrackRef.current) {
            originalVideoTrackRef.current = videoSender.track || null;
          }
          await videoSender.replaceTrack(newScreenTrack);
        } else {
          peer.addTrack(newScreenTrack, displayStream);
        }
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = displayStream;
      }

      newScreenTrack.onended = () => {
        stopScreenShare();
      };

      setIsScreenSharing(true);
      return true;
    } catch (err: any) {
      console.error('Failed to start screen share', err);
      return false;
    }
  };

  const stopScreenShare = async () => {
    try {
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }

      // Revert video back to original camera track for all active peers
      peerConnections.current.forEach(async (peer) => {
        const senders = peer.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          if (originalVideoTrackRef.current) {
            await videoSender.replaceTrack(originalVideoTrackRef.current);
          } else if (localStream.current) {
            const camTrack = localStream.current.getVideoTracks()[0];
            if (camTrack) await videoSender.replaceTrack(camTrack);
          }
        }
      });

      if (localVideoRef.current && localStream.current) {
        localVideoRef.current.srcObject = localStream.current;
      }

      originalVideoTrackRef.current = null;
      setIsScreenSharing(false);
    } catch (err) {
      console.error('Failed to stop screen share', err);
    }
  };

  const switchCamera = async () => {
    if (!localStream.current) return false;
    try {
      const newFacingMode = currentFacingMode.current === 'user' ? 'environment' : 'user';
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: newFacingMode } },
        audio: false,
      }).catch(async () => {
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return false;

      localStream.current.getVideoTracks().forEach((t) => t.stop());
      localStream.current.removeTrack(localStream.current.getVideoTracks()[0]);
      localStream.current.addTrack(newVideoTrack);

      peerConnections.current.forEach(async (peer) => {
        const senders = peer.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream.current;
      }

      currentFacingMode.current = newFacingMode;
      return true;
    } catch (err) {
      console.error('Failed to switch camera', err);
      return false;
    }
  };

  const changeAudioInput = async (deviceId: string) => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
        video: false,
      });
      const newAudioTrack = newStream.getAudioTracks()[0];
      if (!newAudioTrack || !localStream.current) return;

      localStream.current.getAudioTracks().forEach((t) => t.stop());
      localStream.current.removeTrack(localStream.current.getAudioTracks()[0]);
      localStream.current.addTrack(newAudioTrack);

      peerConnections.current.forEach(async (peer) => {
        const senders = peer.getSenders();
        const audioSender = senders.find((s) => s.track?.kind === 'audio');
        if (audioSender) {
          await audioSender.replaceTrack(newAudioTrack);
        }
      });
    } catch (err) {
      console.error('Failed to change audio input', err);
    }
  };

  const changeVideoInput = async (deviceId: string) => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack || !localStream.current) return;

      localStream.current.getVideoTracks().forEach((t) => t.stop());
      localStream.current.removeTrack(localStream.current.getVideoTracks()[0]);
      localStream.current.addTrack(newVideoTrack);

      peerConnections.current.forEach(async (peer) => {
        const senders = peer.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream.current;
      }
    } catch (err) {
      console.error('Failed to change video input', err);
    }
  };

  const changeAudioOutput = async (deviceId: string) => {
    try {
      if (remoteVideoRef.current && (remoteVideoRef.current as any).setSinkId) {
        await (remoteVideoRef.current as any).setSinkId(deviceId);
      }
    } catch (err) {
      console.error('Failed to set audio output device', err);
    }
  };

  const toggleMic = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMuted = !audioTrack.enabled;
        setLocalMicMuted(newMuted);

        const socket = getSocket();
        if (currentUser) {
          socket.emit('call_mic_toggled', {
            roomId: callState.roomId,
            to: callState.caller?.id,
            userId: currentUser._id,
            isMuted: newMuted,
          });
        }
      }
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setLocalVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleSpeaker = async () => {
    const nextSpeakerState = !speakerOn;
    setSpeakerOn(nextSpeakerState);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !nextSpeakerState;
    }
  };

  const upgradeToVideo = async () => {
    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err1) {
        // Fallback to basic video constraint if ideal 720p is not supported by device/webcam
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (stream) {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          if (!localStream.current) {
            localStream.current = stream;
          } else {
            // Remove any old dead video tracks if present
            localStream.current.getVideoTracks().forEach((t) => {
              t.stop();
              localStream.current?.removeTrack(t);
            });
            localStream.current.addTrack(videoTrack);
          }

          // Add/replace track in all peer connections
          peerConnections.current.forEach(async (peer) => {
            const videoSender = peer.getSenders().find((s) => s.track?.kind === 'video');
            if (videoSender) {
              await videoSender.replaceTrack(videoTrack);
            } else {
              peer.addTrack(videoTrack, localStream.current!);
            }
          });

          attachLocalStream();
          setLocalVideoOff(false);
          setCallState((prev) => ({ ...prev, isVideoCall: true }));

          // Notify other participants via socket
          const socket = getSocket();
          if (currentUser) {
            socket.emit('call_upgrade_video', {
              roomId: callState.roomId,
              to: callState.caller?.id,
              from: currentUser._id,
            });
          }
        }
      }
    } catch (err: any) {
      console.warn('Could not upgrade to video (camera permission or device unavailable):', err);
      // Fallback: switch UI layout to video mode so remote party video can still be seen
      setCallState((prev) => ({ ...prev, isVideoCall: true }));
      setLocalVideoOff(true);
    }
  };



  return {
    callState,
    participants,
    mutedParticipants,
    connectionQuality,
    localVideoRef,
    remoteVideoRef,
    callUser,
    startGroupCall,
    answerCall,
    leaveCall,
    inviteParticipant,
    toggleMic,
    toggleVideo,
    toggleSpeaker,
    upgradeToVideo,
    localMicMuted,
    localVideoOff,
    speakerOn,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    switchCamera,
    changeAudioInput,
    changeVideoInput,
    changeAudioOutput,
  };
}
