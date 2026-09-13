/**
 * Golden 02 — search → favourite → conversation → offer (API-assisted).
 */
import { expect, test } from '@playwright/test';
import {
  API_BASE,
  DEMO,
  authHeaders,
  jsonOrThrow,
  login,
  skipUnlessApiUp,
} from './helpers';

test.describe('golden-02 search chat offer', () => {
  test('search → favourite → conversation → offer', async ({ request }) => {
    await skipUnlessApiUp(request);

    const seller = await login(
      request,
      DEMO.seller.email,
      DEMO.seller.password,
    );
    const buyer = await login(
      request,
      DEMO.buyer.email,
      DEMO.buyer.password,
    );
    const sellerHeaders = authHeaders(seller.accessToken);
    const buyerHeaders = authHeaders(buyer.accessToken);

    // Ensure Ori has a LIVE listing the buyer can engage with
    const catsRes = await request.get(`${API_BASE}/categories`, {
      headers: sellerHeaders,
    });
    const cats = await jsonOrThrow<{ id: string; slug: string }[]>(
      catsRes,
      'categories',
    );
    const cat = cats.find((c) => c.slug === 'electronics') ?? cats[0];

    const createRes = await request.post(`${API_BASE}/listings`, {
      headers: sellerHeaders,
      data: {
        title: `E2E Search Target ${Date.now()}`,
        description: 'Bluetooth speaker for golden-02 search path.',
        categoryId: cat!.id,
        condition: 'LIKE_NEW',
        priceKobo: 25_000_00,
        community: 'Lekki',
      },
    });
    const draft = await jsonOrThrow<{ id: string }>(createRes, 'create');
    const pubRes = await request.post(
      `${API_BASE}/listings/${draft.id}/publish`,
      { headers: sellerHeaders },
    );
    const listing = await jsonOrThrow<{ id: string; status: string }>(
      pubRes,
      'publish',
    );
    test.skip(
      listing.status !== 'LIVE',
      `listing not LIVE (${listing.status}); cannot chat/offer`,
    );

    const searchRes = await request.get(`${API_BASE}/search`, {
      params: { q: 'E2E Search Target', limit: '10' },
    });
    expect(searchRes.ok(), await searchRes.text()).toBeTruthy();

    const favRes = await request.post(
      `${API_BASE}/listings/${listing.id}/favourite`,
      { headers: buyerHeaders },
    );
    expect(favRes.ok() || favRes.status() === 201 || favRes.status() === 200).toBeTruthy();

    const convRes = await request.post(`${API_BASE}/conversations`, {
      headers: buyerHeaders,
      data: { listingId: listing.id },
    });
    const conv = await jsonOrThrow<{ id: string }>(convRes, 'conversation');
    expect(conv.id).toBeTruthy();

    const msgRes = await request.post(
      `${API_BASE}/conversations/${conv.id}/messages`,
      {
        headers: buyerHeaders,
        data: {
          type: 'TEXT',
          body: 'Hi Ori — still available? Interested via ReWorth.',
        },
      },
    );
    expect(msgRes.ok(), await msgRes.text()).toBeTruthy();

    const offerRes = await request.post(
      `${API_BASE}/listings/${listing.id}/offers`,
      {
        headers: buyerHeaders,
        data: {
          amountKobo: 22_000_00,
          note: 'Golden-02 offer',
          conversationId: conv.id,
        },
      },
    );
    const offer = await jsonOrThrow<{ id: string; status: string }>(
      offerRes,
      'offer',
    );
    expect(offer.id).toBeTruthy();
    expect(offer.status).toBe('PENDING');
  });
});
