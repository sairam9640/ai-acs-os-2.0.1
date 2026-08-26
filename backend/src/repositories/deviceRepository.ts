import { Types } from 'mongoose';
import { Device, IDevice } from '../models/Device.js';
import { DeviceCommand, IDeviceCommand, CommandStatus } from '../models/DeviceCommand.js';

export class DeviceRepository {
  /**
   * Finds a device by ID with tenant scoping
   */
  static async findById(tenantId: Types.ObjectId | string, deviceId: Types.ObjectId | string): Promise<IDevice | null> {
    return Device.findOne({
      _id: new Types.ObjectId(deviceId),
      tenantId: new Types.ObjectId(tenantId),
    }).populate('customerId', 'fullName phone accountNumber address');
  }

  /**
   * Finds device by serial number within tenant
   */
  static async findBySerialNumber(tenantId: Types.ObjectId | string, serialNumber: string): Promise<IDevice | null> {
    return Device.findOne({
      tenantId: new Types.ObjectId(tenantId),
      serialNumber,
    });
  }

  /**
   * Lists devices with status, PON port, and manufacturer filters
   */
  static async listDevices({
    tenantId,
    status,
    manufacturer,
    ponPortId,
    search,
    page = 1,
    limit = 20,
  }: {
    tenantId: Types.ObjectId | string;
    status?: string;
    manufacturer?: string;
    ponPortId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ devices: IDevice[]; total: number; page: number; pages: number }> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    if (status && status !== 'all') query.status = status;
    if (manufacturer && manufacturer !== 'all') query.manufacturer = manufacturer;
    if (ponPortId) query.ponPortId = new Types.ObjectId(ponPortId);

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [{ serialNumber: searchRegex }, { macAddress: searchRegex }, { deviceIdStr: searchRegex }];
    }

    const [devices, total] = await Promise.all([
      Device.find(query)
        .sort({ lastSeenAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('customerId', 'fullName phone accountNumber'),
      Device.countDocuments(query),
    ]);

    return {
      devices,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Updates device telemetry with optimistic version increment
   */
  static async updateTelemetry(
    tenantId: Types.ObjectId | string,
    deviceId: Types.ObjectId | string,
    telemetry: {
      rxPowerDbm?: number;
      txPowerDbm?: number;
      uptimeSeconds?: number;
      status?: 'online' | 'offline' | 'degraded';
    }
  ): Promise<IDevice | null> {
    const updatePayload: any = { lastSeenAt: new Date() };
    if (telemetry.rxPowerDbm !== undefined) updatePayload.currentRxPowerDbm = telemetry.rxPowerDbm;
    if (telemetry.txPowerDbm !== undefined) updatePayload.currentTxPowerDbm = telemetry.txPowerDbm;
    if (telemetry.uptimeSeconds !== undefined) updatePayload.uptimeSeconds = telemetry.uptimeSeconds;
    if (telemetry.status) updatePayload.status = telemetry.status;

    return Device.findOneAndUpdate(
      { _id: new Types.ObjectId(deviceId), tenantId: new Types.ObjectId(tenantId) },
      { $set: updatePayload, $inc: { __v: 1 } },
      { new: true }
    );
  }

  /**
   * Creates an asynchronous device command record
   */
  static async createCommand(commandData: {
    tenantId: Types.ObjectId | string;
    deviceId: Types.ObjectId | string;
    operation: string;
    commandType: any;
    parameters?: Record<string, any>;
    requestedBy: { userId: string; email: string; role: string };
    idempotencyKey?: string;
  }): Promise<IDeviceCommand> {
    return DeviceCommand.create({
      tenantId: new Types.ObjectId(commandData.tenantId),
      deviceId: new Types.ObjectId(commandData.deviceId),
      operation: commandData.operation,
      commandType: commandData.commandType,
      parameters: commandData.parameters || {},
      requestedBy: commandData.requestedBy,
      idempotencyKey: commandData.idempotencyKey || `cmd_idemp_${Date.now()}`,
      status: 'queued',
    });
  }

  /**
   * Retrieves recent commands for a device
   */
  static async getCommandsByDevice(
    tenantId: Types.ObjectId | string,
    deviceId: Types.ObjectId | string,
    limit = 10
  ): Promise<IDeviceCommand[]> {
    return DeviceCommand.find({
      tenantId: new Types.ObjectId(tenantId),
      deviceId: new Types.ObjectId(deviceId),
    })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}
