import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  avatar: string;
  role: 'admin' | 'user';
  isOnline: boolean;
  isEmailVerified: boolean;
  emailOtp?: string;
  emailOtpExpires?: Date;
  settings?: any;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['admin', 'user'], default: 'admin' },
    isOnline: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    emailOtp: { type: String, default: null },
    emailOtpExpires: { type: Date, default: null },
    settings: {
      type: Object,
      default: {
        privacy: {
          onlineVisibility: 'everyone',
          lastSeenVisibility: 'everyone',
          readReceipts: true,
          blockedUsers: []
        },
        notifications: {
          messages: true,
          calls: true,
          sounds: true
        },
        appearance: {
          mode: 'dark',
          themeColor: '#6366f1',
          wallpaper: ''
        },
        chat: {
          enterToSend: true,
          fontSize: 'medium'
        }
      }
    }
  },
  { timestamps: true }
);

// Indexes for fast people search and online status polling
UserSchema.index({ isOnline: 1 });
UserSchema.index({ createdAt: -1 });

// Hash password before saving if modified or new
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// Compare password method supporting both hashed and legacy plaintext passwords
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  // If password is already bcrypt hashed ($2a$, $2b$, or $2y$)
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$') || this.password.startsWith('$2y$')) {
    return bcrypt.compare(candidatePassword, this.password);
  }
  // Fallback for legacy plain text passwords created previously
  return this.password === candidatePassword;
};

export const UserModel = mongoose.model<IUser>('User', UserSchema);

