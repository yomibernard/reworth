import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, raw } from 'express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  app.useLogger(app.get(Logger));

  // Preserve raw body for Paystack webhook HMAC (ADR-002)
  app.use(
    '/api/v1/webhooks/paystack',
    raw({ type: '*/*' }),
    (
      req: { body?: Buffer | unknown; rawBody?: Buffer },
      _res: unknown,
      next: () => void,
    ) => {
      if (Buffer.isBuffer(req.body)) {
        req.rawBody = req.body;
        try {
          req.body = JSON.parse(req.body.toString('utf8'));
        } catch {
          /* leave as-is if not JSON */
        }
      }
      next();
    },
  );
  app.use(json({ limit: '2mb' }));

  // All routes under /api/v1 including healthz (PRD §43 / Phase 0 brief)
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}

bootstrap();
