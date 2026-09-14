import { Injectable, Logger } from '@nestjs/common';
import type { PushMessage, PushProvider } from './push.provider';

/**
 * Expo Push API adapter (store-ready). Default remains MockPushProvider.
 * Set PUSH_PROVIDER=expo. Optional EXPO_ACCESS_TOKEN for higher rate limits.
 * Spec: https://docs.expo.dev/push-notifications/sending-notifications/
 */
@Injectable()
export class ExpoPushProvider implements PushProvider {
  readonly name = 'expo-push';
  private readonly logger = new Logger(ExpoPushProvider.name);
  private readonly endpoint =
    process.env.EXPO_PUSH_URL ?? 'https://exp.host/--/api/v2/push/send';

  async send(message: PushMessage): Promise<void> {
    const expoTokens = message.tokens.filter((t) =>
      t.startsWith('ExponentPushToken['),
    );
    if (expoTokens.length === 0) {
      this.logger.warn(
        { userId: message.userId, count: message.tokens.length },
        'push:expo skipped — no Expo tokens',
      );
      return;
    }

    const messages = expoTokens.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      data: {
        ...(message.meta ?? {}),
        ...(message.deepLink ? { deepLink: message.deepLink } : {}),
      },
      sound: 'default' as const,
    }));

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };
    const accessToken = process.env.EXPO_ACCESS_TOKEN;
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(
        { status: res.status, body: text.slice(0, 400) },
        'push:expo failed',
      );
      throw new Error(`Expo push failed: HTTP ${res.status}`);
    }

    this.logger.log(
      {
        userId: message.userId,
        tokens: expoTokens.length,
        deepLink: message.deepLink,
      },
      'push:expo sent',
    );
  }
}
