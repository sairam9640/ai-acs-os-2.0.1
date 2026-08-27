import { Types } from 'mongoose';
import { WarehouseStockItem, IWarehouseStockItem, StockCategory, StockStatus } from '../models/WarehouseStockItem.js';
import { Vendor, IVendor } from '../models/Vendor.js';
import { recordAuditLog } from '../middleware/audit.js';

export class WarehouseInventoryService {
  /**
   * List Warehouse Stock items with multi-criteria filters
   */
  static async getStockItems(params: {
    tenantId: string | Types.ObjectId;
    category?: string;
    status?: string;
    search?: string;
    brand?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: IWarehouseStockItem[]; total: number; page: number; totalPages: number }> {
    const tId = new Types.ObjectId(params.tenantId);
    const query: any = { tenantId: tId };

    if (params.category && params.category !== 'ALL') query.category = params.category;
    if (params.status && params.status !== 'ALL') query.status = params.status;
    if (params.brand && params.brand !== 'ALL') query.brand = params.brand;

    if (params.search) {
      const s = String(params.search).trim();
      query.$or = [
        { itemCode: new RegExp(s, 'i') },
        { modelName: new RegExp(s, 'i') },
        { serialNumber: new RegExp(s, 'i') },
        { batchNumber: new RegExp(s, 'i') },
        { barcode: new RegExp(s, 'i') },
        { brand: new RegExp(s, 'i') },
      ];
    }

    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));

    const [items, total] = await Promise.all([
      WarehouseStockItem.find(query)
        .populate('vendorId', 'name code')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      WarehouseStockItem.countDocuments(query),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Receive New Hardware into Warehouse (Stock-In)
   */
  static async stockIn(params: {
    tenantId: string | Types.ObjectId;
    category: StockCategory;
    modelName: string;
    brand: string;
    quantity?: number;
    serialNumbers?: string[];
    batchNumber?: string;
    warehouseLocation?: string;
    vendorId?: string;
    purchaseOrderNumber?: string;
    purchasePrice?: number;
    purchaseDate?: Date;
    warrantyMonths?: number;
    cableDrumMeters?: number;
    specifications?: any;
    actor: { id: string; email: string; role: string };
  }): Promise<IWarehouseStockItem[]> {
    const tId = new Types.ObjectId(params.tenantId);
    const createdItems: IWarehouseStockItem[] = [];

    const warrantyExpiryDate = params.warrantyMonths
      ? new Date(Date.now() + params.warrantyMonths * 30 * 86400000)
      : new Date(Date.now() + 365 * 86400000); // default 1-year warranty

    const serials = params.serialNumbers && params.serialNumbers.length > 0
      ? params.serialNumbers
      : Array.from({ length: params.quantity || 1 }).map(
          (_, i) => `${params.category.slice(0, 3)}-${Date.now().toString().slice(-6)}-${i + 1}`
        );

    for (const sn of serials) {
      const itemCode = `STK-${params.category.slice(0, 3)}-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 900 + 100)}`;

      const stockItem = await WarehouseStockItem.create({
        tenantId: tId,
        itemCode,
        category: params.category,
        modelName: params.modelName,
        brand: params.brand,
        serialNumber: sn,
        batchNumber: params.batchNumber || `BATCH-${new Date().toISOString().slice(0, 7)}`,
        status: 'IN_STOCK',
        warehouseLocation: params.warehouseLocation || 'Main Warehouse',
        vendorId: params.vendorId ? new Types.ObjectId(params.vendorId) : undefined,
        purchaseOrderNumber: params.purchaseOrderNumber || '',
        purchasePrice: params.purchasePrice || 0,
        purchaseDate: params.purchaseDate || new Date(),
        warrantyExpiryDate,
        cableDrumMetersRemaining: params.cableDrumMeters,
        specifications: params.specifications || {},
        movementHistory: [
          {
            action: 'STOCK_IN',
            date: new Date(),
            actorId: params.actor.id,
            actorEmail: params.actor.email,
            note: `Stock In: Received PO #${params.purchaseOrderNumber || 'DIRECT'}`,
          },
        ],
      });

      createdItems.push(stockItem);
    }

    await recordAuditLog({
      tenantId: tId,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      actorRole: params.actor.role,
      action: 'WAREHOUSE_STOCK_IN',
      targetResource: 'WarehouseStockItem',
      targetId: createdItems[0]?._id?.toString() || 'batch',
      targetIdentifier: `${params.category} - ${params.modelName} (Qty: ${createdItems.length})`,
      correlationId: `stk_in_${Date.now()}`,
    });

    return createdItems;
  }

  /**
   * Dispatch / Assign Hardware from Warehouse (Stock-Out)
   */
  static async stockOut(params: {
    tenantId: string | Types.ObjectId;
    itemId: string;
    destinationType: 'CUSTOMER' | 'TECHNICIAN_VAN' | 'NETWORK_NODE';
    targetIdentifier: string;
    targetId?: string;
    note?: string;
    actor: { id: string; email: string; role: string };
  }): Promise<IWarehouseStockItem> {
    const tId = new Types.ObjectId(params.tenantId);
    const item = await WarehouseStockItem.findOne({ _id: params.itemId, tenantId: tId });
    if (!item) throw new Error('Stock item not found');

    if (item.status !== 'IN_STOCK' && item.status !== 'RESERVED') {
      throw new Error(`Cannot stock out item with status "${item.status}"`);
    }

    item.status = 'DEPLOYED';
    item.assignedTo = {
      destinationType: params.destinationType,
      targetId: params.targetId ? new Types.ObjectId(params.targetId) : undefined,
      targetIdentifier: params.targetIdentifier,
      assignedAt: new Date(),
    };

    item.movementHistory.push({
      action: 'STOCK_OUT',
      date: new Date(),
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      destinationType: params.destinationType,
      destinationIdentifier: params.targetIdentifier,
      note: params.note || `Dispatched to ${params.destinationType} (${params.targetIdentifier})`,
    });

    await item.save();

    await recordAuditLog({
      tenantId: tId,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      actorRole: params.actor.role,
      action: 'WAREHOUSE_STOCK_OUT',
      targetResource: 'WarehouseStockItem',
      targetId: item._id.toString(),
      targetIdentifier: `${item.itemCode} (${item.serialNumber}) -> ${params.targetIdentifier}`,
      correlationId: `stk_out_${Date.now()}`,
    });

    return item;
  }

  /**
   * Low Stock & Threshold Health Check
   */
  static async getLowStockAlerts(tenantId: string | Types.ObjectId): Promise<any[]> {
    const tId = new Types.ObjectId(tenantId);
    const categories: StockCategory[] = [
      'ONT',
      'ROUTER',
      'OLT_CARD',
      'SFP_TRANSCEIVER',
      'SPLITTER',
      'FIBER_CABLE_DRUM',
      'CLOSURE',
      'FAT_BOX',
    ];

    const thresholds: Record<StockCategory, number> = {
      ONT: 10,
      ROUTER: 5,
      OLT_CARD: 2,
      SFP_TRANSCEIVER: 8,
      SPLITTER: 10,
      FIBER_CABLE_DRUM: 2,
      CLOSURE: 5,
      FAT_BOX: 5,
      ACCESSORY: 20,
    };

    const alerts: any[] = [];

    for (const cat of categories) {
      const inStockCount = await WarehouseStockItem.countDocuments({
        tenantId: tId,
        category: cat,
        status: 'IN_STOCK',
      });

      const minThreshold = thresholds[cat] || 5;
      if (inStockCount <= minThreshold) {
        alerts.push({
          category: cat,
          inStockCount,
          minThreshold,
          severity: inStockCount === 0 ? 'CRITICAL' : 'WARNING',
          message: `${cat} inventory is low (${inStockCount} units in stock, recommended minimum: ${minThreshold}).`,
        });
      }
    }

    return alerts;
  }

  /**
   * Warranty Expiration Tracking (Next 30/60/90 days)
   */
  static async getExpiringWarrantyItems(
    tenantId: string | Types.ObjectId,
    daysAhead = 60
  ): Promise<IWarehouseStockItem[]> {
    const tId = new Types.ObjectId(tenantId);
    const futureLimit = new Date(Date.now() + daysAhead * 86400000);

    return WarehouseStockItem.find({
      tenantId: tId,
      warrantyExpiryDate: { $gte: new Date(), $lte: futureLimit },
    }).populate('vendorId', 'name contactPerson phone');
  }
}
