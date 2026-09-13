import { ChatScanService } from './chat-scan.service';

describe('ChatScanService', () => {
  it('matches bank / pay directly phrases from seeded patterns', async () => {
    const prisma = {
      chatScanRule: {
        findMany: jest.fn().mockResolvedValue([
          { pattern: 'bank account', kind: 'OFF_PLATFORM_PAYMENT' },
          { pattern: 'pay directly', kind: 'OFF_PLATFORM_PAYMENT' },
          { pattern: 'https?://', kind: 'EXTERNAL_LINK' },
        ]),
      },
    };
    const service = new ChatScanService(prisma as never);
    const hit = await service.scan(
      'please pay directly to my bank account',
    );
    expect(hit).not.toBeNull();
    expect(hit?.kind).toBe('OFF_PLATFORM_PAYMENT');
  });
});
