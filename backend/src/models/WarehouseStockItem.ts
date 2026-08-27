import { Schema, model, Document, Types } from 'mongoose';

export type StockCategory =
  | 'ONT'
  | 'ROUTER'
  | 'OLT_CARD'
  | 'SFP_TRANSCEIVER'
  | 'SPLITTER'
  | 'FIBER_CABLE_DRUM'
  | 'CLOSURE'
  | 'FAT_BOX'
  | 'ACCESSORY';

export type StockStatus = 'IN_STOCK' | 'DEPLOYED' | 'RESERVED' | 'FAULTY_RMA' | 'SCRAPPED';

export interface IStockMovementLog {
  action: 'STOCK_IN' | 'STOCK_OUT' | 'RMA_RETURN' | 'TRANSFER' | 'DEPLOYMENT';
  date: Date;
  actorId: string;
  actorEmail: string;
  destinationType?: 'CUSTOMER' | 'TECHNICIAN_VAN' | 'NETWORK_NODE' | 'WAREHOUSE';
  destinationIdentifier?: string;
  note: string;
}

export interface IWarehouseStockItem extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  itemCode: string;
  category: StockCategory;
  modelName: string;
  brand: string;
  serialNumber?: string;
  batchNumber?: string;
  barcode?: string;
  status: StockStatus;
  warehouseLocation: string; // e.g. "Rack A-3, Main Warehouse"
  assignedTo?: {
    destinationType: 'CUSTOMER' | 'TECHNICIAN_VAN' | 'NETWORK_NODE';
    targetId?: Types.ObjectId;
    targetIdentifier: string; // Account # or Node Code or Technician Name
    assignedAt: Date;
  };
  vendorId?: Types.ObjectId;
  purchaseOrderNumber?: string;
  purchasePrice: number;
  purchaseDate?: Date;
  warrantyExpiryDate?: Date;
  cableDrumMetersRemaining?: number;
  specifications: {
    ponStandard?: string;
    wifiStandard?: string;
    splitRatio?: string;
    fiberCores?: number;
    sfpClass?: string;
  };
  movementHistory: IStockMovementLog[];
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseStockItemSchema = new Schema<IWarehouseStockItem>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    itemCode: { type: String, required: true, uppercase: true, trim: true },
    category: {
      type: String,
      enum: [
        'ONT',
        'ROUTER',
        'OLT_CARD',
        'SFP_TRANSCEIVER',
        'SPLITTER',
        'FIBER_CABLE_DRUM',
        'CLOSURE',
        'FAT_BOX',
        'ACCESSORY',
      ],
      required: true,
      index: true,
    },
    modelName: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    serialNumber: { type: String, trim: true, index: true },
    batchNumber: { type: String, trim: true },
    barcode: { type: String, trim: true, index: true },
    status: {
      type: String,
      enum: ['IN_STOCK', 'DEPLOYED', 'RESERVED', 'FAULTY_RMA', 'SCRAPPED'],
      default: 'IN_STOCK',
      index: true,
    },
    warehouseLocation: { type: String, default: 'Main Warehouse' },
    assignedTo: {
      destinationType: { type: String, enum: ['CUSTOMER', 'TECHNICIAN_VAN', 'NETWORK_NODE'] },
      targetId: { type: Schema.Types.ObjectId },
      targetIdentifier: { type: String },
      assignedAt: { type: Date },
    },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    purchaseOrderNumber: { type: String, default: '' },
    purchasePrice: { type: Number, default: 0, min: 0 },
    purchaseDate: { type: Date },
    warrantyExpiryDate: { type: Date, index: true },
    cableDrumMetersRemaining: { type: Number },
    specifications: {
      ponStandard: { type: String },
      wifiStandard: { type: String },
      splitRatio: { type: String },
      fiberCores: { type: Number },
      sfpClass: { type: String },
    },
    movementHistory: [
      {
        action: {
          type: String,
          enum: ['STOCK_IN', 'STOCK_OUT', 'RMA_RETURN', 'TRANSFER', 'DEPLOYMENT'],
          required: true,
        },
        date: { type: Date, default: Date.now },
        actorId: { type: String, required: true },
        actorEmail: { type: String, required: true },
        destinationType: { type: String },
        destinationIdentifier: { type: String },
        note: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

WarehouseStockItemSchema.index({ tenantId: 1, category: 1, status: 1 });
WarehouseStockItemSchema.index({ tenantId: 1, serialNumber: 1 }, { sparse: true });

export const WarehouseStockItem = model<IWarehouseStockItem>(
  'WarehouseStockItem',
  WarehouseStockItemSchema
);
