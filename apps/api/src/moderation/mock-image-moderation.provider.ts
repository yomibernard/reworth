import { Injectable } from '@nestjs/common';
import type {
  ImageModerationInput,
  ImageModerationProvider,
  ImageModerationResult,
} from './image-moderation.provider';

/**
 * Deterministic mock — flags keys/meta containing "nsfw" (case-insensitive).
 */
@Injectable()
export class MockImageModerationProvider implements ImageModerationProvider {
  readonly name = 'mock-image-moderation';

  async scan(input: ImageModerationInput): Promise<ImageModerationResult> {
    const reasons: string[] = [];
    const matchedKeys: string[] = [];

    for (const key of input.imageKeys) {
      if (/nsfw/i.test(key)) {
        reasons.push('IMAGE_NSFW_KEY');
        matchedKeys.push(key);
      }
    }

    for (const flag of input.metaFlags ?? []) {
      if (/nsfw/i.test(flag)) {
        reasons.push('IMAGE_NSFW_META');
      }
    }

    return {
      nsfw: reasons.length > 0,
      reasons: [...new Set(reasons)],
      detail: { matchedKeys, provider: this.name },
    };
  }
}
