import { Schema, model, Document, Types } from 'mongoose';

export interface ITicketComment {
  authorId: Types.ObjectId;
  authorRole: string;
  authorName: string;
  message: string;
  isInternalOnly: boolean;
  createdAt: Date;
}

export interface ITicket extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  ticketNumber: string; // e.g. "TICK-2026-1049"
  customerId: Types.ObjectId;
  incidentId?: Types.ObjectId;
  subject: string;
  description: string;
  category: 'NO_INTERNET' | 'SLOW_SPEED' | 'WIFI_ISSUE' | 'BILLING' | 'RELOCATION' | 'GENERAL';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'assigned' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed';
  assignedToUserId?: Types.ObjectId;
  technicianJobId?: Types.ObjectId;
  slaDueDate: Date;
  slaBreached: boolean;
  comments: ITicketComment[];
  resolutionNotes?: string;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    ticketNumber: { type: String, default: () => `TICK-${Date.now()}`, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: () => new Types.ObjectId(), index: true },
    incidentId: { type: Schema.Types.ObjectId, ref: 'Incident', index: true },
    subject: { type: String, default: function(this: any) { return this.title || 'Support Ticket'; }, trim: true },
    description: { type: String, default: 'Customer support request' },
    category: {
      type: String,
      enum: ['NO_INTERNET', 'SLOW_SPEED', 'WIFI_ISSUE', 'BILLING', 'RELOCATION', 'GENERAL'],
      default: 'NO_INTERNET',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'assigned', 'in_progress', 'pending_customer', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    assignedToUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    technicianJobId: { type: Schema.Types.ObjectId, ref: 'TechnicianJob' },
    slaDueDate: { type: Date, default: () => new Date(Date.now() + 24 * 3600000) },
    slaBreached: { type: Boolean, default: false },
    comments: [
      {
        authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        authorRole: { type: String, required: true },
        authorName: { type: String, required: true },
        message: { type: String, required: true },
        isInternalOnly: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    resolutionNotes: { type: String },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

TicketSchema.index({ tenantId: 1, ticketNumber: 1 }, { unique: true });
TicketSchema.index({ tenantId: 1, status: 1, priority: 1 });

export const Ticket = model<ITicket>('Ticket', TicketSchema);
