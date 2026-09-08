export interface UserProfile {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  role?: 'admin' | 'user';
  isOnline?: boolean;
  isEmailVerified?: boolean;
  settings?: UserSettings;
}

export interface ScreenshotItem {
  _id: string;
  targetUserId: string;
  targetUsername: string;
  capturedBy: string;
  capturedByName: string;
  imageUrl: string;
  captureType: 'manual' | 'interval';
  intervalSeconds?: number;
  createdAt: string;
}

export interface UserSettings {
  privacy: {
    onlineVisibility: 'everyone' | 'nobody';
    lastSeenVisibility: 'everyone' | 'nobody';
    readReceipts: boolean;
    blockedUsers: string[];
  };
  notifications: {
    messages: boolean;
    calls: boolean;
    sounds: boolean;
  };
  appearance: {
    mode: 'system' | 'light' | 'dark';
    themeColor: string;
    wallpaper: string;
  };
  chat: {
    enterToSend: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
}

export interface RecentChatUser {
  user: UserProfile;
  lastMessage?: string;
  lastMessageTime?: string | Date;
}

export interface GroupProfile {
  _id: string;
  name: string;
  avatar?: string;
  adminId: string;
  members: string[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type ChatTarget = UserProfile | GroupProfile;

export interface RecentGroup {
  group: GroupProfile;
  lastMessage?: string;
  lastMessageTime?: string | Date;
}

export interface ChatMessage {
  id: string;
  conversationId?: string;
  senderId: string;
  senderName: string;
  receiverId?: string;
  receiverName?: string;
  groupId?: string;
  message: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  replyTo?: string;
  isEdited?: boolean;
  isDeletedForEveryone?: boolean;
  deletedFor?: string[];
  deletedAt?: Date | string;
  reactions?: { [emoji: string]: string[] };
  timestamp: Date | string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface CallRecord {
  _id: string;
  callerId: UserProfile;
  receiverId: UserProfile;
  callType: 'voice' | 'video';
  status: 'completed' | 'missed' | 'rejected' | 'cancelled';
  duration: number;
  startedAt: string | Date;
  endedAt: string | Date;
  createdAt: string | Date;
}

export interface SendMessagePayload {
  conversationId?: string | null;
  senderId: string;
  senderName: string;
  receiverId?: string;
  receiverName?: string;
  groupId?: string;
  message: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  replyTo?: string;
}

export interface ClientToServerEvents {
  send_message: (data: SendMessagePayload) => void;
  join_user: (userId: string) => void;
  user_online: (userId: string) => void;
  join_chat: (data: { conversationId: string; senderName: string; senderId: string }) => void;
  typing: (data: { conversationId: string | null; senderId: string; senderName: string; receiverId?: string; groupId?: string }) => void;
  stop_typing: (data: { conversationId: string | null; senderId: string; receiverId?: string; groupId?: string }) => void;
  call_user: (data: { userToCall: string; signalData: any; from: string; name: string; avatar?: string; isVideoCall: boolean; callRoomId?: string }) => void;
  answer_call: (data: { to: string; signal: any }) => void;
  ice_candidate: (data: { to: string; candidate: RTCIceCandidateInit; from?: string }) => void;
  join_call_room: (data: { roomId: string; user: { _id: string; username: string; avatar?: string }; isVideoCall: boolean }) => void;
  call_room_signal: (data: { to: string; from: any; signal: any; isVideoCall: boolean }) => void;
  leave_call_room: (data: { roomId: string; userId: string; username?: string }) => void;
  call_upgrade_video: (data: { roomId?: string; to?: string; from: string }) => void;
  call_mic_toggled: (data: { roomId?: string; to?: string; userId: string; isMuted: boolean }) => void;
  end_call: (data: { to: string; callerId?: string; receiverId?: string; callType?: 'voice' | 'video'; status?: string; duration?: number; startedAt?: Date | string; endedAt?: Date; roomId?: string }) => void;
  edit_message: (data: { messageId: string; newText: string; conversationId: string }) => void;
  delete_message: (data: { messageId: string; type: 'me' | 'everyone'; conversationId: string; userId?: string }) => void;
  react_message: (data: { messageId: string; emoji: string; conversationId?: string | null; userId?: string }) => void;
  message_delivered: (data: { messageId: string; conversationId: string }) => void;
  message_read: (data: { messageId: string; conversationId: string }) => void;
  clear_conversation: (data: { conversationId: string }) => void;
  admin_request_monitoring: (data: { adminId: string; adminName: string; targetUserId: string; intervalSeconds?: number }) => void;
  user_monitoring_rejected: (data: { adminId: string; userId: string; username: string }) => void;
  user_monitoring_stopped: (data: { adminId?: string; userId: string }) => void;
  user_monitoring_offer: (data: { adminId: string; userId: string; username: string; sdp: any }) => void;
  admin_monitoring_answer: (data: { targetUserId: string; adminId: string; sdp: any }) => void;
  monitoring_ice_candidate: (data: { targetUserId: string; candidate: any }) => void;
  admin_stop_monitoring: (data: { targetUserId: string; adminId: string }) => void;
  admin_trigger_instant_capture: (data: { targetUserId: string; adminId: string }) => void;
  monitoring_screenshot_captured: (data: any) => void;
}

export interface ServerToClientEvents {
  receive_message: (data: ChatMessage) => void;
  online_users_update: (userIds: string[]) => void;
  user_status_changed: (data: { userId: string; isOnline: boolean }) => void;
  user_typing: (data: { conversationId: string; senderId: string; senderName: string }) => void;
  user_stop_typing: (data: { conversationId: string; senderId: string }) => void;
  call_user: (data: { signal: any; from: string; name: string; avatar?: string; isVideoCall: boolean; callRoomId?: string }) => void;
  call_accepted: (data: any) => void;
  user_busy: (data: { userId: string; message: string }) => void;
  ice_candidate: (data: { candidate: RTCIceCandidateInit; from?: string }) => void;
  call_room_user_joined: (data: { user: UserProfile; isVideoCall: boolean; socketId?: string }) => void;
  call_room_signal: (data: { from: UserProfile; signal: any; isVideoCall: boolean }) => void;
  call_room_user_left: (data: { userId: string; username?: string }) => void;
  call_mic_toggled: (data: { userId: string; isMuted: boolean }) => void;
  call_upgraded_to_video: (data: { from: string; roomId?: string }) => void;
  call_ended: (data?: { leftUserId?: string }) => void;

  message_edited: (data: ChatMessage) => void;
  message_deleted: (data: { messageId: string; conversationId: string; deletedAt?: Date | string; deletedForMe?: boolean }) => void;
  conversation_cleared: (data: { conversationId: string }) => void;
  message_reaction_updated: (data: { messageId: string; conversationId: string; reactions: { [emoji: string]: string[] } }) => void;
  message_status_update: (data: { messageId: string; conversationId: string; status: 'delivered' | 'read' }) => void;
  call_history_updated: (payload: { message: string; call: CallRecord }) => void;

  admin_monitoring_requested: (data: { adminId: string; adminName: string; intervalSeconds?: number }) => void;
  user_monitoring_rejected: (data: { adminId: string; userId: string; username: string }) => void;
  user_monitoring_stopped: (data: { adminId?: string; userId: string }) => void;
  user_monitoring_offer: (data: { adminId: string; userId: string; username: string; sdp: any }) => void;
  admin_monitoring_answer: (data: { targetUserId: string; adminId: string; sdp: any }) => void;
  monitoring_ice_candidate: (data: { candidate: any; fromUserId?: string }) => void;
  admin_monitoring_stopped: (data: { adminId: string }) => void;
  capture_instant_screenshot_request: (data: { adminId: string }) => void;
  new_monitoring_screenshot: (data: any) => void;
}
