import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  avatar?: string;
  adminId: string;
  members: string[];
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    avatar: { type: String, default: '' },
    adminId: { type: String, required: true },
    members: [{ type: String, required: true }]
  },
  { timestamps: true }
);

export const GroupModel = mongoose.model<IGroup>('Group', GroupSchema);
