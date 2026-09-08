import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: string;
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
  reactions?: { [emoji: string]: string[] }; // emoji -> array of userIds
  status: 'sent' | 'delivered' | 'read';
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    conversationId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    receiverId: { type: String },
    receiverName: { type: String },
    groupId: { type: String, index: true },
    message: { type: String, default: '' }, // Made optional essentially if only a file is sent
    fileUrl: { type: String },
    fileName: { type: String },
    fileType: { type: String },
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
    isEdited: { type: Boolean, default: false },
    isDeletedForEveryone: { type: Boolean, default: false },
    deletedFor: [{ type: String }],
    reactions: { type: Map, of: [String], default: {} },
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' }
  },
  { timestamps: true }
);

// High-performance compound indexes for instant chat history & search
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
MessageSchema.index({ groupId: 1, createdAt: -1 });

export const MessageModel = mongoose.model<IMessage>('Message', MessageSchema);
