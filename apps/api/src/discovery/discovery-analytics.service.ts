import { Injectable, Logger } from '@nestjs/common';

/** Discovery analytics — search, NL, favourites, follows (pino via Nest Logger). */
@Injectable()
export class DiscoveryAnalyticsService {
  private readonly logger = new Logger(DiscoveryAnalyticsService.name);

  log(event: string, props: Record<string, unknown> = {}): void {
    this.logger.log({ analytics: event, ...props });
  }

  searchPerformed(props: Record<string, unknown>): void {
    this.log('search_performed', props);
  }

  nlSearchUsed(props: Record<string, unknown>): void {
    this.log('nl_search_used', props);
  }

  listingSaved(props: Record<string, unknown>): void {
    this.log('listing_saved', props);
  }

  sellerFollowed(props: Record<string, unknown>): void {
    this.log('seller_followed', props);
  }

  homeRailImpression(props: Record<string, unknown>): void {
    this.log('home_rail_impression', props);
  }
}
