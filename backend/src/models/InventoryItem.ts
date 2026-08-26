import { Schema, model, Document, Types } from 'mongoose';

export type InventoryItemType =
  | 'GPON_ONT'
  | 'EPON_ONT'
  | 'XPON_ONT'
  | 'OLT_CHASSIS'
  | 'OLT_LINE_CARD'
  | 'SFP_MODULE'
  | 'FIBER_PATCH_CORD'
  | 'FAT_NAP_BOX';

export type InventoryLifecycleStatus =
  | 'available'
  | 'assigned'
  | 'installed'
  | 'faulty'
  | 'in_repair'
  | 'retired';

export interface IInventoryItem extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  assetTag: string; // e.g. "AST-ONT-10084"
  itemType: InventoryItemType;
  vendor: string; // e.g. "Huawei", "ZTE", "Nokia", "Netlink"
  modelName: string;
  serialNumber: string;
  macAddress?: string;
  status: InventoryLifecycleStatus;
  warehouseLocation: string; // e.g. "Main POP Warehouse - Bin B3"
  assignedCustomerId?: Types.ObjectId;
  assignedTechnicianUserId?: Types.ObjectId;
  assignedDeviceId?: Types.ObjectId;
  purchasePrice?: number;
  batchNumber?: string;
  notes?: string;
  installedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    assetTag: { type: String, required: true, trim: true },
    itemType: {
      type: String,
      enum: [
        'GPON_ONT',
        'EPON_ONT',
        'XPON_ONT',
        'OLT_CHASSIS',
        'OLT_LINE_CARD',
        'SFP_MODULE',
        'FIBER_PATCH_CORD',
        'FAT_NAP_BOX',
      ],
      default: 'GPON_ONT',
      index: true,
    },
    vendor: { type: String, required: true },
    modelName: { type: String, required: true },
    serialNumber: { type: String, required: true, trim: true, index: true },
    macAddress: { type: String, trim: true },
    status: {
      type: String,
      enum: ['available', 'assigned', 'installed', 'faulty', 'in_repair', 'retired'],
      default: 'available',
      index: true,
    },
    warehouseLocation: { type: String, default: 'Main POP Warehouse' },
    assignedCustomerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    assignedTechnicianUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedDeviceId: { type: Schema.Types.ObjectId, ref: 'Device' },
    purchasePrice: { type: Number },
    batchNumber: { type: String },
    notes: { type: String, default: '' },
    installedAt: { type: Date },
  },
  { timestamps: true }
);

InventoryItemSchema.index({ tenantId: 1, serialNumber: 1 }, { unique: true });
InventoryItemSchema.index({ tenantId: 1, status: 1, itemType: 1 });

export const InventoryItem = model<IInventoryItem>('InventoryItem', InventoryItemSchema);
