import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: String,
        required: true
      }
    ],
    lastMessage: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'closed'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
