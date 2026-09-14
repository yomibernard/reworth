export type AssistantToolName =
  | 'search'
  | 'bundle'
  | 'valuation'
  | 'listing_help'
  | 'order_help'
  | 'marketplace_qa'
  | 'create_listing'
  | 'make_offer';

export const MUTATION_TOOLS: ReadonlySet<AssistantToolName> = new Set([
  'create_listing',
  'make_offer',
]);

export type AssistantToolCall = {
  toolName: AssistantToolName;
  args: Record<string, unknown>;
};

export type AssistantProposal = {
  kind: 'proposal';
  toolName: AssistantToolName;
  summary: string;
  payload: Record<string, unknown>;
  confirmToken: string;
};

export type AssistantToolResult = {
  toolName: AssistantToolName;
  content: string;
  payload: Record<string, unknown>;
  proposal?: AssistantProposal;
  degraded?: boolean;
  latencyMs: number;
  costMicros: number;
};

export type AssistantTurnInput = {
  sessionId: string;
  userId: string;
  city: string;
  content: string;
  confirmToken?: string;
  /** Injected listings for bundle/search tools (tests / service). */
  listingCatalog?: Array<{
    id: string;
    title: string;
    priceKobo: number;
    city: string;
    categoryId: string | null;
    categorySlug?: string | null;
    geoLat?: number | null;
    geoLng?: number | null;
  }>;
  lat?: number;
  lng?: number;
};

export type AssistantTurnResult = {
  reply: string;
  toolResult: AssistantToolResult;
  confirmed: boolean;
};

export interface AssistantProvider {
  readonly name: string;
  routeAndRun(input: AssistantTurnInput): Promise<AssistantTurnResult>;
}

export const ASSISTANT_PROVIDER = Symbol('ASSISTANT_PROVIDER');

/** Soft budgets for mock / prod adapters. */
export const ASSISTANT_LATENCY_BUDGET_MS = 2_500;
export const ASSISTANT_COST_BUDGET_MICROS = 50_000;
