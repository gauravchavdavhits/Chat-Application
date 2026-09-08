import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      index: true
    },
    sender: {
      type: String,
      enum: ['user', 'bot', 'system'],
      required: true
    },
    senderId: {
      type: String,
      default: null
    },
    text: {
      type: String,
      required: true
    },
    metadata: {
      type: Map,
      of: String,
      default: {}
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent'
    },
    isDeletedForEveryone: {
      type: Boolean,
      default: false
    },
    deletedFor: {
      type: [String],
      default: []
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
