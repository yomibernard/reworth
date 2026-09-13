import { Injectable, Logger } from '@nestjs/common';
import type { PushMessage, PushProvider } from './push.provider';

@Injectable()
export class MockPushProvider implements PushProvider {
  readonly name = 'mock-push';
  private readonly logger = new Logger(MockPushProvider.name);
  readonly sent: PushMessage[] = [];

  async send(message: PushMessage): Promise<void> {
    this.sent.push(message);
    this.logger.log(
      {
        userId: message.userId,
        title: message.title,
        tokens: message.tokens.length,
        deepLink: message.deepLink,
      },
      'push:mock',
    );
  }
}
