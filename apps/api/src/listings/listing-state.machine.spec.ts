import { ConflictException } from '@nestjs/common';
import { ListingStateMachine } from './listing-state.machine';

describe('ListingStateMachine', () => {
  it('allows DRAFT → LIVE', () => {
    expect(ListingStateMachine.canTransition('DRAFT', 'LIVE')).toBe(true);
  });

  it('allows DRAFT → UNDER_REVIEW', () => {
    expect(ListingStateMachine.canTransition('DRAFT', 'UNDER_REVIEW')).toBe(
      true,
    );
  });

  it('allows DRAFT → REJECTED (moderation)', () => {
    expect(ListingStateMachine.canTransition('DRAFT', 'REJECTED')).toBe(true);
  });

  it('allows REJECTED → UNDER_REVIEW (appeal approved)', () => {
    expect(
      ListingStateMachine.canTransition('REJECTED', 'UNDER_REVIEW'),
    ).toBe(true);
  });

  it('throws ConflictException on invalid transition', () => {
    expect(() =>
      ListingStateMachine.assertTransition('SOLD', 'LIVE'),
    ).toThrow(ConflictException);
  });

  it('rejects LIVE → DRAFT', () => {
    expect(ListingStateMachine.canTransition('LIVE', 'DRAFT')).toBe(false);
  });

  it('allows LIVE → EXPIRED', () => {
    expect(ListingStateMachine.canTransition('LIVE', 'EXPIRED')).toBe(true);
  });
});
