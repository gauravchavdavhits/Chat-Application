/**
 * TypeScript Interfaces for Chat Application
 */

// Core Chat Message Interface
export interface ChatMessage {
  id: string;
  message: string;
  senderId: string;
  senderName: string;
  timestamp: Date | string;
  conversationId?: string;
  receiverId?: string;
  receiverName?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  replyTo?: string;
  isEdited?: boolean;
  isDeletedForEveryone?: boolean;
  deletedFor?: string[];
  reactions?: { [emoji: string]: string[] };
}

// User Payload for Join/Leave Chat Events
export interface UserPayload {
  senderId: string;
  senderName: string;
}

// Server to Client Events Protocol
export interface ServerToClientEvents {
  receive_message: (data: ChatMessage) => void;
  user_joined: (data: UserPayload) => void;
  user_left: (data: UserPayload) => void;
  error_event: (error: { message: string }) => void;
  message_edited: (data: ChatMessage) => void;
  message_deleted: (data: { messageId: string; conversationId: string }) => void;
  message_reaction_updated: (data: { messageId: string; conversationId: string; reactions: { [emoji: string]: string[] } }) => void;
}

// Client to Server Events Protocol
export interface ClientToServerEvents {
  send_message: (data: ChatMessage) => void;
  join_chat: (data: UserPayload) => void;
  leave_chat: (data: UserPayload) => void;
  edit_message: (data: { messageId: string; newText: string; conversationId: string }) => void;
  delete_message: (data: { messageId: string; type: 'me' | 'everyone'; conversationId: string }) => void;
  react_message: (data: { messageId: string; emoji: string; conversationId?: string; userId?: string }) => void;
}
