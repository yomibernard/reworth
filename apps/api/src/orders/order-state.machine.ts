import { ConflictException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ['PAYMENT_PENDING', 'CANCELLED'],
  PAYMENT_PENDING: ['FUNDED', 'CANCELLED'],
  FUNDED: ['HANDED_OVER', 'DISPUTE_HOLD', 'COMPLETED', 'CANCELLED'],
  HANDED_OVER: ['RECEIVED', 'DISPUTE_HOLD', 'COMPLETED'],
  RECEIVED: ['COMPLETED', 'DISPUTE_HOLD'],
  COMPLETED: ['DISPUTE_HOLD'],
  CANCELLED: [],
  DISPUTE_HOLD: [
    'COMPLETED',
    'REFUND_REQUESTED',
    'REFUND_ISSUED',
    'RECEIVED',
  ],
  REFUND_REQUESTED: ['REFUND_ISSUED', 'COMPLETED'],
  REFUND_ISSUED: [],
};

export class OrderStateMachine {
  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return TRANSITIONS[from]?.includes(to) ?? false;
  }

  static assertTransition(from: OrderStatus, to: OrderStatus): void {
    if (!this.canTransition(from, to)) {
      throw new ConflictException(
        `Invalid order status transition: ${from} → ${to}`,
      );
    }
  }

  static allowedFrom(from: OrderStatus): OrderStatus[] {
    return [...(TRANSITIONS[from] ?? [])];
  }
}
