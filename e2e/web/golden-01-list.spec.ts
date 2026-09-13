/**
 * Golden 01 — list: login demo Ori → create listing → assist → publish.
 * Optional web smoke via HTTP GET (no browser dependency for CI).
 */
import { expect, test } from '@playwright/test';
import {
  API_BASE,
  DEMO,
  WEB_BASE,
  authHeaders,
  jsonOrThrow,
  login,
  skipUnlessApiUp,
} from './helpers';

test.describe('golden-01 list', () => {
  test('web smoke + Ori create → assist → publish via API', async ({
    request,
  }) => {
    await skipUnlessApiUp(request);

    // Soft web smoke — ignore failures if web is not running
    try {
      const webRes = await request.get(WEB_BASE, { timeout: 5_000 });
      if (webRes.ok()) {
        const html = await webRes.text();
        expect(html.length).toBeGreaterThan(0);
      }
    } catch {
      // Web optional for this API-first golden path
    }

    const { accessToken } = await login(
      request,
      DEMO.seller.email,
      DEMO.seller.password,
    );
    const headers = authHeaders(accessToken);

    const catsRes = await request.get(`${API_BASE}/categories`, {
      headers,
    });
    const cats = await jsonOrThrow<{ id: string; slug: string }[]>(
      catsRes,
      'categories',
    );
    const furniture =
      cats.find((c) => c.slug === 'home-furniture') ?? cats[0];
    expect(furniture?.id).toBeTruthy();

    const createRes = await request.post(`${API_BASE}/listings`, {
      headers,
      data: {
        title: `E2E Sofa ${Date.now()}`,
        description: 'Playwright golden-01 listing — Lekki meetup.',
        categoryId: furniture!.id,
        condition: 'GOOD',
        priceKobo: 85_000_00,
        community: 'Lekki',
        negotiable: true,
      },
    });
    const listing = await jsonOrThrow<{ id: string; status: string }>(
      createRes,
      'create listing',
    );
    expect(listing.id).toBeTruthy();
    expect(listing.status).toBe('DRAFT');

    const assistRes = await request.post(
      `${API_BASE}/listings/${listing.id}/assist`,
      { headers, data: {} },
    );
    expect(assistRes.ok(), await assistRes.text()).toBeTruthy();

    const publishRes = await request.post(
      `${API_BASE}/listings/${listing.id}/publish`,
      { headers },
    );
    const published = await jsonOrThrow<{ id: string; status: string }>(
      publishRes,
      'publish',
    );
    expect(['LIVE', 'UNDER_REVIEW']).toContain(published.status);
  });
});
