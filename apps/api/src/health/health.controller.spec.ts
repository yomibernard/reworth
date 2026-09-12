import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: () => undefined,
          },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
    service = module.get(HealthService);
  });

  it('healthz returns ok', () => {
    expect(controller.healthz()).toEqual({ status: 'ok' });
  });

  it('readyz degrades gracefully when deps unset', async () => {
    const result = await controller.readyz();
    expect(result.status).toBe('ok');
    expect(result.checks.database).toBe('skip');
    expect(result.checks.redis).toBe('skip');
  });

  it('metrics returns prometheus-ish text', () => {
    const text = controller.metrics();
    expect(text).toContain('reworth_up 1');
    expect(text).toContain('process_uptime_seconds');
  });

  it('delegates liveness to service', () => {
    jest.spyOn(service, 'liveness').mockReturnValue({ status: 'ok' });
    expect(controller.healthz()).toEqual({ status: 'ok' });
  });
});
