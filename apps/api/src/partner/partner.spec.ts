/* eslint-disable @typescript-eslint/no-explicit-any */
import { UnauthorizedException } from '@nestjs/common';
import {
  PartnerService,
  signPartnerPayload,
} from './partner.service';
import { hashPartnerApiKey } from './partner-api-key.guard';

describe('Phase 3.2 estate partner API', () => {
  const secret = 'whsec_test_partner';

  it('HMAC sha512 signature verification', () => {
    const prisma: any = {};
    const svc = new PartnerService(prisma);
    const body = JSON.stringify({
      eventId: 'evt-1',
      eventType: 'member.join',
      userId: '00000000-0000-0000-0000-000000000001',
    });
    const sig = signPartnerPayload(secret, body);
    expect(() =>
      svc.verifyWebhookSignature(secret, body, sig),
    ).not.toThrow();
    expect(() =>
      svc.verifyWebhookSignature(secret, body, 'deadbeef'),
    ).toThrow(UnauthorizedException);
  });

  it('replay-safe: duplicate eventId returns replay without re-mutating', async () => {
    const membershipUpdates: any[] = [];
    const events: any[] = [
      {
        estatePartnerId: 'p1',
        eventId: 'evt-dup',
        eventType: 'member.join',
      },
    ];

    const prisma: any = {
      estatePartnerWebhookEvent: {
        findUnique: jest.fn(async ({ where }: any) => {
          const key = where.estatePartnerId_eventId;
          return (
            events.find(
              (e) =>
                e.estatePartnerId === key.estatePartnerId &&
                e.eventId === key.eventId,
            ) ?? null
          );
        }),
        create: jest.fn(async ({ data }: any) => {
          events.push(data);
          return data;
        }),
      },
      user: {
        findUnique: jest.fn(async () => ({ id: 'user-1', phone: '+234801' })),
      },
      communityMembership: {
        upsert: jest.fn(async ({ create, update }: any) => {
          membershipUpdates.push({ create, update });
          return {
            id: 'm1',
            communityId: 'c1',
            userId: 'user-1',
            status: 'MEMBER',
            joinedAt: new Date(),
          };
        }),
      },
    };

    const svc = new PartnerService(prisma);
    const first = await svc.syncMember(
      'p1',
      'c1',
      {
        eventId: 'evt-dup',
        eventType: 'member.join',
        userId: 'user-1',
      },
      {},
    );
    expect(first.replay).toBe(true);
    expect(membershipUpdates).toHaveLength(0);

    // Fresh event processes
    const second = await svc.syncMember(
      'p1',
      'c1',
      {
        eventId: 'evt-new',
        eventType: 'member.join',
        userId: 'user-1',
      },
      { ok: true },
    );
    expect(second.replay).toBe(false);
    expect(membershipUpdates).toHaveLength(1);
    expect(second.membership?.status).toBe('MEMBER');
  });

  it('member.leave propagates LEFT immediately', async () => {
    const prisma: any = {
      estatePartnerWebhookEvent: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => data),
      },
      user: {
        findUnique: jest.fn(async () => ({ id: 'user-2' })),
      },
      communityMembership: {
        upsert: jest.fn(async ({ update }: any) => ({
          id: 'm2',
          communityId: 'c1',
          userId: 'user-2',
          status: update.status,
          joinedAt: update.joinedAt ?? null,
        })),
      },
    };
    const svc = new PartnerService(prisma);
    const out = await svc.syncMember(
      'p1',
      'c1',
      { eventId: 'leave-1', eventType: 'member.leave', userId: 'user-2' },
      {},
    );
    expect(out.membership?.status).toBe('LEFT');
  });

  it('hashes partner API keys consistently', () => {
    const a = hashPartnerApiKey('rwk_abc');
    const b = hashPartnerApiKey('rwk_abc');
    expect(a).toBe(b);
    expect(a).not.toBe('rwk_abc');
  });
});
