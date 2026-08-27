import { Schema, model, Document, Types } from 'mongoose';

export type UserRole =
  | 'super_admin'
  | 'operator_admin'
  | 'noc_operator'
  | 'fiber_planner'
  | 'technician'
  | 'accountant'
  | 'support_agent'
  | 'customer';

export interface IUserSession {
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
  lastActive: Date;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  tenantId?: Types.ObjectId; // null for super_admin
  email: string;
  phone: string;
  fullName: string;
  role: UserRole;
  permissions: string[];
  passwordHash?: string;
  otpSecret?: string;
  otpCode?: string;
  otpExpiresAt?: Date;
  twoFactorEnabled: boolean;
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt?: Date;
  activeSessions: IUserSession[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: [
        'super_admin',
        'operator_admin',
        'noc_operator',
        'fiber_planner',
        'technician',
        'accountant',
        'support_agent',
        'customer',
      ],
      required: true,
      index: true,
    },
    permissions: [{ type: String }],
    passwordHash: { type: String },
    otpCode: { type: String },
    otpExpiresAt: { type: Date },
    twoFactorEnabled: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true,
    },
    lastLoginAt: { type: Date },
    activeSessions: [
      {
        sessionId: { type: String, required: true },
        ipAddress: { type: String, default: '127.0.0.1' },
        userAgent: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
        lastActive: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, phone: 1 });

export const User = model<IUser>('User', UserSchema);
