import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PayoutStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CompensationPeriodQueryDto } from './dto/compensation-period-query.dto';
import { CreateCompensationPayoutDto } from './dto/create-compensation-payout.dto';
import { ListCompensationPayoutsQueryDto } from './dto/list-compensation-payouts-query.dto';
import { UpdateCompensationPayoutDto } from './dto/update-compensation-payout.dto';
import { toNumber } from '../shared/utils/decimal.util';

const employeeSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
  fullName: true,
  role: true,
  storeId: true,
  baseSalary: true,
  commissionPercent: true,
  compensationStartDate: true,
  isCompensationEnabled: true,
  createdAt: true,
  updatedAt: true,
  store: { select: { id: true, name: true, code: true, location: true } },
});

const summaryOrderSelect = Prisma.validator<Prisma.OrderSelect>()({
  id: true,
  receiptNumber: true,
  salespersonId: true,
  storeId: true,
  grandTotal: true,
  createdAt: true,
  paymentMethod: true,
  status: true,
});

const summaryAdjustmentSelect =
  Prisma.validator<Prisma.OrderAdjustmentSelect>()({
    id: true,
    originalOrderId: true,
    salespersonId: true,
    storeId: true,
    type: true,
    status: true,
    refundAmount: true,
    additionalChargeAmount: true,
    netAmount: true,
    notes: true,
    createdAt: true,
  });

const payoutInclude =
  Prisma.validator<Prisma.EmployeeCompensationPayoutInclude>()({
    user: { select: { id: true, email: true, fullName: true, role: true } },
    generatedBy: {
      select: { id: true, email: true, fullName: true, role: true },
    },
  });

type CompensationEmployee = Prisma.UserGetPayload<{
  select: typeof employeeSelect;
}>;
type SummaryOrder = Prisma.OrderGetPayload<{
  select: typeof summaryOrderSelect;
}>;
type SummaryAdjustment = Prisma.OrderAdjustmentGetPayload<{
  select: typeof summaryAdjustmentSelect;
}>;

@Injectable()
export class CompensationService {
  private readonly logger = new Logger(CompensationService.name);
  constructor(private readonly prisma: PrismaService) {}

  private parseBoundaryDate(value: string, boundary: 'start' | 'end') {
    const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (dateOnlyPattern.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return boundary === 'start'
        ? new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
        : new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
      throw new BadRequestException(`Invalid ${boundary} date`);
    return parsed;
  }

  private resolvePeriod(periodStart: string, periodEnd: string) {
    const start = this.parseBoundaryDate(periodStart, 'start');
    const end = this.parseBoundaryDate(periodEnd, 'end');
    if (end < start)
      throw new BadRequestException('periodEnd must be ≥ periodStart');
    return { start, end };
  }

  private round(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private buildSummaryItem(
    employee: CompensationEmployee,
    orders: SummaryOrder[],
    adjustments: SummaryAdjustment[],
  ) {
    const grossSales = this.round(
      orders.reduce((sum, o) => sum + toNumber(o.grandTotal), 0),
    );
    const refunds = this.round(
      adjustments.reduce((sum, a) => sum + toNumber(a.refundAmount), 0),
    );
    const additionalCharges = this.round(
      adjustments.reduce(
        (sum, a) => sum + toNumber(a.additionalChargeAmount),
        0,
      ),
    );
    const rawNet = grossSales - refunds + additionalCharges;
    const netCommissionableSales = this.round(Math.max(0, rawNet));
    const baseSalary = this.round(toNumber(employee.baseSalary));
    // Only EMPLOYEE-role users earn percentage commission; every other
    // non-admin role is salary-only, so their effective rate is 0.
    const commissionPercent =
      employee.role === Role.EMPLOYEE
        ? this.round(toNumber(employee.commissionPercent))
        : 0;
    const commissionAmount = this.round(
      (netCommissionableSales * commissionPercent) / 100,
    );
    const totalPayableAmount = this.round(baseSalary + commissionAmount);

    return {
      userId: employee.id,
      employee,
      role: employee.role,
      store: employee.store,
      baseSalary,
      commissionPercent,
      orderCount: orders.length,
      grossSales,
      refunds,
      additionalCharges,
      netCommissionableSales,
      commissionAmount,
      totalPayableAmount,
    };
  }

  private async getEligibleEmployees(storeId?: string) {
    return this.prisma.user.findMany({
      where: {
        // Everyone except admins can receive compensation (salary for all
        // eligible roles, commission only for EMPLOYEE — see buildSummaryItem).
        role: { not: Role.ADMIN },
        isCompensationEnabled: true,
        isActive: true,
        ...(storeId ? { storeId } : {}),
      },
      orderBy: { email: 'asc' },
      select: employeeSelect,
    });
  }

  // Prisma returns Decimal columns, which serialize to JSON strings. Convert
  // the money/percent fields to numbers so clients can do numeric math
  // (e.g. value.toFixed) without runtime errors.
  private serializePayout<
    T extends {
      baseSalaryAmount: Prisma.Decimal;
      commissionPercentSnapshot: Prisma.Decimal;
      commissionableSalesAmount: Prisma.Decimal;
      commissionAmount: Prisma.Decimal;
      adjustmentAmount: Prisma.Decimal;
      totalPayableAmount: Prisma.Decimal;
    },
  >(payout: T) {
    return {
      ...payout,
      baseSalaryAmount: toNumber(payout.baseSalaryAmount),
      commissionPercentSnapshot: toNumber(payout.commissionPercentSnapshot),
      commissionableSalesAmount: toNumber(payout.commissionableSalesAmount),
      commissionAmount: toNumber(payout.commissionAmount),
      adjustmentAmount: toNumber(payout.adjustmentAmount),
      totalPayableAmount: toNumber(payout.totalPayableAmount),
    };
  }

  async getSummary(query: CompensationPeriodQueryDto) {
    try {
      const { start, end } = this.resolvePeriod(
        query.periodStart,
        query.periodEnd,
      );
      const employees = await this.getEligibleEmployees(query.storeId);
      if (!employees.length)
        return {
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
          data: [],
          totals: this.zeroTotals(),
        };

      const employeeIds = employees.map((e) => e.id);
      const baseWhere = {
        salespersonId: { in: employeeIds },
        ...(query.storeId ? { storeId: query.storeId } : {}),
        createdAt: { gte: start, lte: end },
      };
      const [orders, adjustments] = await Promise.all([
        this.prisma.order.findMany({
          where: { ...baseWhere, status: 'COMPLETED' },
          select: summaryOrderSelect,
        }),
        this.prisma.orderAdjustment.findMany({
          where: { ...baseWhere, status: 'COMPLETED' },
          select: summaryAdjustmentSelect,
        }),
      ]);

      const ordersBy = new Map<string, SummaryOrder[]>();
      orders.forEach((o) => {
        if (!o.salespersonId) return;
        ordersBy.set(o.salespersonId, [
          ...(ordersBy.get(o.salespersonId) ?? []),
          o,
        ]);
      });
      const adjBy = new Map<string, SummaryAdjustment[]>();
      adjustments.forEach((a) => {
        if (!a.salespersonId) return;
        adjBy.set(a.salespersonId, [...(adjBy.get(a.salespersonId) ?? []), a]);
      });

      const data = employees.map((e) =>
        this.buildSummaryItem(
          e,
          ordersBy.get(e.id) ?? [],
          adjBy.get(e.id) ?? [],
        ),
      );

      return {
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        data,
        totals: {
          employees: data.length,
          orderCount: data.reduce((s, i) => s + i.orderCount, 0),
          grossSales: this.round(data.reduce((s, i) => s + i.grossSales, 0)),
          refunds: this.round(data.reduce((s, i) => s + i.refunds, 0)),
          additionalCharges: this.round(
            data.reduce((s, i) => s + i.additionalCharges, 0),
          ),
          netCommissionableSales: this.round(
            data.reduce((s, i) => s + i.netCommissionableSales, 0),
          ),
          commissionAmount: this.round(
            data.reduce((s, i) => s + i.commissionAmount, 0),
          ),
          baseSalaryAmount: this.round(
            data.reduce((s, i) => s + i.baseSalary, 0),
          ),
          totalPayableAmount: this.round(
            data.reduce((s, i) => s + i.totalPayableAmount, 0),
          ),
        },
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getEmployeeBreakdown(
    userId: string,
    query: CompensationPeriodQueryDto,
  ) {
    try {
      const { start, end } = this.resolvePeriod(
        query.periodStart,
        query.periodEnd,
      );
      const employee = await this.prisma.user.findFirst({
        where: { id: userId, role: { not: Role.ADMIN } },
        select: employeeSelect,
      });
      if (!employee) throw new NotFoundException('Employee not found');
      if (!employee.isCompensationEnabled)
        throw new BadRequestException('Compensation disabled for employee');

      const [orders, adjustments, payouts] = await Promise.all([
        this.prisma.order.findMany({
          where: {
            salespersonId: userId,
            status: 'COMPLETED',
            ...(query.storeId ? { storeId: query.storeId } : {}),
            createdAt: { gte: start, lte: end },
          },
          select: summaryOrderSelect,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.orderAdjustment.findMany({
          where: {
            salespersonId: userId,
            status: 'COMPLETED',
            ...(query.storeId ? { storeId: query.storeId } : {}),
            createdAt: { gte: start, lte: end },
          },
          select: summaryAdjustmentSelect,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.employeeCompensationPayout.findMany({
          where: { userId },
          include: payoutInclude,
          orderBy: { createdAt: 'desc' },
          take: 12,
        }),
      ]);

      const summary = this.buildSummaryItem(employee, orders, adjustments);
      return {
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        ...summary,
        orders,
        adjustments,
        payouts: payouts.map((p) => this.serializePayout(p)),
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createPayoutSnapshot(
    dto: CreateCompensationPayoutDto,
    generatedById?: string,
  ) {
    try {
      const breakdown = await this.getEmployeeBreakdown(dto.userId, {
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
      });
      const periodStart = new Date(breakdown.periodStart);
      const periodEnd = new Date(breakdown.periodEnd);

      // A period may carry many snapshots over its lifetime, but only one
      // active (non-cancelled) snapshot at a time. Re-creating is allowed once
      // every prior snapshot for the period has been cancelled.
      const activeSnapshot =
        await this.prisma.employeeCompensationPayout.findFirst({
          where: {
            userId: dto.userId,
            periodStart,
            periodEnd,
            status: { not: PayoutStatus.CANCELLED },
          },
        });
      if (activeSnapshot)
        throw new BadRequestException(
          'An active payout snapshot already exists for this period. Cancel it before creating a new one.',
        );

      const adjustmentAmount = this.round(dto.adjustmentAmount ?? 0);
      const totalPayableAmount = this.round(
        breakdown.totalPayableAmount + adjustmentAmount,
      );

      const payout = await this.prisma.employeeCompensationPayout.create({
        data: {
          userId: dto.userId,
          periodStart,
          periodEnd,
          baseSalaryAmount: breakdown.baseSalary,
          commissionPercentSnapshot: breakdown.commissionPercent,
          commissionableSalesAmount: breakdown.netCommissionableSales,
          commissionAmount: breakdown.commissionAmount,
          adjustmentAmount,
          totalPayableAmount,
          status: PayoutStatus.DRAFT,
          notes: dto.notes?.trim() || null,
          generatedById,
        },
        include: payoutInclude,
      });
      return this.serializePayout(payout);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async listPayouts(query: ListCompensationPayoutsQueryDto) {
    try {
      const where: Prisma.EmployeeCompensationPayoutWhereInput = {};
      if (query.userId) where.userId = query.userId;
      if (query.status) where.status = query.status;
      if (query.periodStart || query.periodEnd) {
        where.AND = [];
        if (query.periodStart)
          where.AND.push({
            periodEnd: {
              gte: this.parseBoundaryDate(query.periodStart, 'start'),
            },
          });
        if (query.periodEnd)
          where.AND.push({
            periodStart: {
              lte: this.parseBoundaryDate(query.periodEnd, 'end'),
            },
          });
      }
      const payouts = await this.prisma.employeeCompensationPayout.findMany({
        where,
        include: payoutInclude,
        orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
      });
      return payouts.map((p) => this.serializePayout(p));
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getPayout(id: string) {
    const payout = await this.prisma.employeeCompensationPayout.findUnique({
      where: { id },
      include: payoutInclude,
    });
    if (!payout) throw new NotFoundException('Payout not found');
    return this.serializePayout(payout);
  }

  async updatePayout(id: string, dto: UpdateCompensationPayoutDto) {
    try {
      const payout = await this.getPayout(id);
      if (
        payout.status === PayoutStatus.PAID &&
        dto.status !== PayoutStatus.CANCELLED
      )
        throw new BadRequestException(
          'A PAID payout can only be CANCELLED, not edited',
        );

      const data: Prisma.EmployeeCompensationPayoutUpdateInput = {};
      if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;
      if (dto.adjustmentAmount !== undefined) {
        const newAdj = this.round(dto.adjustmentAmount);
        const totalBeforeAdj =
          toNumber(payout.totalPayableAmount) -
          toNumber(payout.adjustmentAmount);
        data.adjustmentAmount = newAdj;
        data.totalPayableAmount = this.round(totalBeforeAdj + newAdj);
      }
      if (dto.status !== undefined) {
        data.status = dto.status;
        if (dto.status === PayoutStatus.PAID) data.paidAt = new Date();
        if (dto.status !== PayoutStatus.PAID) data.paidAt = null;
      }

      const updated = await this.prisma.employeeCompensationPayout.update({
        where: { id },
        data,
        include: payoutInclude,
      });
      return this.serializePayout(updated);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private zeroTotals() {
    return {
      employees: 0,
      orderCount: 0,
      grossSales: 0,
      refunds: 0,
      additionalCharges: 0,
      netCommissionableSales: 0,
      commissionAmount: 0,
      baseSalaryAmount: 0,
      totalPayableAmount: 0,
    };
  }
}
