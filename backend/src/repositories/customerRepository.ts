import { Types } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer.js';

export class CustomerRepository {
  /**
   * Finds a customer by ID with strict tenant scoping
   */
  static async findById(tenantId: Types.ObjectId | string, customerId: Types.ObjectId | string): Promise<ICustomer | null> {
    return Customer.findOne({
      _id: new Types.ObjectId(customerId),
      tenantId: new Types.ObjectId(tenantId),
    });
  }

  /**
   * Finds customer by account number within tenant
   */
  static async findByAccountNumber(tenantId: Types.ObjectId | string, accountNumber: string): Promise<ICustomer | null> {
    return Customer.findOne({
      tenantId: new Types.ObjectId(tenantId),
      accountNumber,
    });
  }

  /**
   * Finds customer by phone number within tenant
   */
  static async findByPhone(tenantId: Types.ObjectId | string, phone: string): Promise<ICustomer | null> {
    return Customer.findOne({
      tenantId: new Types.ObjectId(tenantId),
      phone,
    });
  }

  /**
   * Lists customers with pagination, search, and status filtering
   */
  static async listCustomers({
    tenantId,
    status,
    search,
    page = 1,
    limit = 20,
  }: {
    tenantId: Types.ObjectId | string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ customers: ICustomer[]; total: number; page: number; pages: number }> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { fullName: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { accountNumber: searchRegex },
        { 'address.area': searchRegex },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('assignedDeviceId', 'serialNumber manufacturer modelName status currentRxPowerDbm'),
      Customer.countDocuments(query),
    ]);

    return {
      customers,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Creates a new customer with tenant boundary
   */
  static async createCustomer(customerData: Partial<ICustomer> & { tenantId: Types.ObjectId | string }): Promise<ICustomer> {
    return Customer.create({
      ...customerData,
      tenantId: new Types.ObjectId(customerData.tenantId),
    });
  }

  /**
   * Updates customer status with optimistic concurrency support
   */
  static async updateStatus(
    tenantId: Types.ObjectId | string,
    customerId: Types.ObjectId | string,
    status: 'active' | 'suspended' | 'pending_installation' | 'terminated'
  ): Promise<ICustomer | null> {
    return Customer.findOneAndUpdate(
      { _id: new Types.ObjectId(customerId), tenantId: new Types.ObjectId(tenantId) },
      { $set: { status }, $inc: { __v: 1 } },
      { new: true }
    );
  }
}
