import mongoose, { Schema, Document } from 'mongoose';

export interface IScreenshot extends Document {
  targetUserId: mongoose.Types.ObjectId;
  targetUsername: string;
  capturedBy: mongoose.Types.ObjectId;
  capturedByName: string;
  imageUrl: string;
  captureType: 'manual' | 'interval';
  intervalSeconds?: number;
  metadata?: any;
  createdAt: Date;
}

const ScreenshotSchema: Schema = new Schema(
  {
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetUsername: { type: String, required: true },
    capturedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    capturedByName: { type: String, required: true },
    imageUrl: { type: String, required: true },
    captureType: { type: String, enum: ['manual', 'interval'], default: 'interval' },
    intervalSeconds: { type: Number, default: 30 },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

ScreenshotSchema.index({ createdAt: -1 });

export const ScreenshotModel = mongoose.model<IScreenshot>('Screenshot', ScreenshotSchema);
