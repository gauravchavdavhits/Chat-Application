import { ChatMessage, UserPayload } from '../types/chat.types';

/**
 * Chat Service to handle message processing and in-memory active users
 */
class ChatService {
  private messages: ChatMessage[] = [];
  private activeUsers: Map<string, UserPayload> = new Map();

  /**
   * Save message to in-memory store
   */
  public addMessage(message: ChatMessage): ChatMessage {
    this.messages.push(message);
    return message;
  }

  /**
   * Get all messages
   */
  public getMessages(): ChatMessage[] {
    return this.messages;
  }

  /**
   * Add user to active users map
   */
  public addUser(socketId: string, user: UserPayload): void {
    this.activeUsers.set(socketId, user);
  }

  /**
   * Remove user from active users map
   */
  public removeUser(socketId: string): UserPayload | undefined {
    const user = this.activeUsers.get(socketId);
    if (user) {
      this.activeUsers.delete(socketId);
    }
    return user;
  }

  /**
   * Get active users
   */
  public getActiveUsers(): UserPayload[] {
    return Array.from(this.activeUsers.values());
  }
}

export const chatService = new ChatService();
