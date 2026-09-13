import { consignmentFeeMath } from './consignment.service';

describe('Consignment fee math (Phase 3.1)', () => {
  it('fee = floor(sold * feeBps / 10000); net = sold - fee', () => {
    const cases: Array<[number, number, number, number]> = [
      // soldKobo, feeBps, expectedFee, expectedNet
      [10_000_000, 1500, 1_500_000, 8_500_000], // ₦100,000 @ 15%
      [1, 1500, 0, 1],
      [99, 1500, 14, 85],
      [10_000, 1500, 1_500, 8_500],
      [25_000_000, 2000, 5_000_000, 20_000_000], // ₦250,000 @ 20%
      [333_333, 1500, 49_999, 283_334],
    ];
    for (const [sold, bps, fee, net] of cases) {
      const r = consignmentFeeMath(sold, bps);
      expect(r.feeKobo).toBe(fee);
      expect(r.netPayoutKobo).toBe(net);
      expect(r.feeKobo + r.netPayoutKobo).toBe(sold);
    }
  });

  it('property: fee never exceeds sold; net + fee === sold', () => {
    const solds = [0, 1, 7, 999, 100_00, 1_234_567_00];
    const bpsList = [0, 500, 1500, 2500, 10000];
    for (const sold of solds) {
      for (const bps of bpsList) {
        const { feeKobo, netPayoutKobo } = consignmentFeeMath(sold, bps);
        expect(feeKobo).toBeLessThanOrEqual(sold);
        expect(feeKobo + netPayoutKobo).toBe(sold);
        expect(feeKobo).toBe(Math.floor((sold * bps) / 10_000));
      }
    }
  });
});
