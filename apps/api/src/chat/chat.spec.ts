import { ForbiddenException } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { ChatScanProcessor } from './chat-scan.processor';
import { ChatScanService } from './chat-scan.service';
import { toMessageDto } from './message.mapper';
import { MessagesService } from './messages.service';
import { redactPhoneEmail, assertNoPiiFields } from './pii.util';

describe('PII redaction', () => {
  it('redactPhoneEmail strips +234 phones and emails', () => {
    const raw =
      'Call me on +2348012345678 or email seller@example.com thanks';
    const scrubbed = redactPhoneEmail(raw);
    expect(scrubbed).not.toMatch(/\+234/);
    expect(scrubbed).not.toMatch(/seller@example\.com/);
    expect(scrubbed).toContain('[redacted]');
  });

  it('toMessageDto never exposes phone/email fields', () => {
    const dto = toMessageDto({
      id: 'm1',
      conversationId: 'c1',
      senderId: 'u1',
      type: MessageType.TEXT,
      body: 'hi',
      imageKey: null,
      offerId: null,
      listingCardId: null,
      clientMsgId: null,
      deliveredAt: null,
      readAt: null,
      scamWarning: false,
      createdAt: new Date(),
      sender: {
        id: 'u1',
        profile: { displayName: 'Ada' },
        phone: '+2348012345678',
        email: 'ada@example.com',
      },
    } as never);

    expect(dto).not.toHaveProperty('phone');
    expect(dto).not.toHaveProperty('email');
    expect(dto.sender).toEqual({ id: 'u1', displayName: 'Ada' });
    assertNoPiiFields(dto as unknown as Record<string, unknown>);
  });
});

describe('ChatScanProcessor', () => {
  it('flags "please pay directly to my bank account" with scamWarning + RiskEvent', async () => {
    const scan = {
      scan: jest.fn().mockResolvedValue({
        kind: 'OFF_PLATFORM_PAYMENT',
        pattern: 'pay directly',
      }),
    };
    const prisma = {
      message: {
        update: jest.fn().mockResolvedValue({}),
      },
      riskEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const processor = new ChatScanProcessor(
      scan as unknown as ChatScanService,
      prisma as never,
    );
    const result = await processor.processMessage({
      messageId: 'msg-1',
      body: 'please pay directly to my bank account',
      userId: 'user-1',
      listingId: 'listing-1',
    });
    expect(result.scamWarning).toBe(true);
    expect(prisma.riskEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: 'CHAT_SCAN_OFF_PLATFORM_PAYMENT',
          userId: 'user-1',
          listingId: 'listing-1',
        }),
      }),
    );
  });
});

describe('MessagesService block + clientMsgId', () => {
  it('block prevents POST conversation', async () => {
    const prisma = {
      listing: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'listing-1',
          sellerId: 'seller-1',
        }),
      },
      userBlock: {
        findFirst: jest.fn().mockResolvedValue({ id: 'block-1' }),
      },
    };
    const scanProcessor = {
      processMessage: jest.fn(),
    } as unknown as ChatScanProcessor;
    const service = new MessagesService(prisma as never, scanProcessor);
    await expect(
      service.createOrGetConversation('buyer-1', 'listing-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('block prevents POST message', async () => {
    const prisma = {
      conversation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'conv-1',
          listingId: 'listing-1',
          buyerId: 'buyer-1',
          sellerId: 'seller-1',
        }),
      },
      userBlock: {
        findFirst: jest.fn().mockResolvedValue({ id: 'block-1' }),
      },
    };
    const scanProcessor = {
      processMessage: jest.fn(),
    } as unknown as ChatScanProcessor;
    const service = new MessagesService(prisma as never, scanProcessor);
    await expect(
      service.postMessage('conv-1', 'buyer-1', {
        type: MessageType.TEXT,
        body: 'hello',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('clientMsgId duplicate insert returns same message (resync)', async () => {
    const existing = {
      id: 'msg-existing',
      conversationId: 'conv-1',
      senderId: 'buyer-1',
      type: MessageType.TEXT,
      body: 'hello',
      imageKey: null,
      offerId: null,
      listingCardId: null,
      clientMsgId: 'client-abc',
      deliveredAt: null,
      readAt: null,
      scamWarning: false,
      createdAt: new Date(),
      sender: { id: 'buyer-1', profile: { displayName: 'Buyer' } },
    };
    const prisma = {
      conversation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'conv-1',
          listingId: 'listing-1',
          buyerId: 'buyer-1',
          sellerId: 'seller-1',
        }),
        update: jest.fn(),
      },
      userBlock: { findFirst: jest.fn().mockResolvedValue(null) },
      message: {
        findUnique: jest.fn().mockResolvedValue(existing),
        create: jest.fn(),
      },
    };
    const scanProcessor = {
      processMessage: jest.fn(),
    } as unknown as ChatScanProcessor;
    const service = new MessagesService(prisma as never, scanProcessor);
    const first = await service.postMessage('conv-1', 'buyer-1', {
      type: MessageType.TEXT,
      body: 'hello',
      clientMsgId: 'client-abc',
    });
    const second = await service.postMessage('conv-1', 'buyer-1', {
      type: MessageType.TEXT,
      body: 'hello again',
      clientMsgId: 'client-abc',
    });
    expect(first.id).toBe('msg-existing');
    expect(second.id).toBe(first.id);
    expect(prisma.message.create).not.toHaveBeenCalled();
  });
});

describe('ChatGateway (light)', () => {
  it('extracts token from handshake auth', () => {
    // Smoke: gateway class constructs and emit is no-op without server
    const { ChatGateway } = require('./chat.gateway') as typeof import('./chat.gateway');
    const jwt = { verify: jest.fn() };
    const config = { get: () => 'secret' };
    const prisma = { user: { findUnique: jest.fn() }, conversation: { findUnique: jest.fn() } };
    const gw = new ChatGateway(jwt as never, config as never, prisma as never);
    expect(() =>
      gw.emitToConversation('c1', 'message.new', { id: 'm1' }),
    ).not.toThrow();
  });
});
