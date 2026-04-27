import { describe, it, expect } from 'vitest';
import { getMoveSpec, inverseMove, FACE_MOVES } from '../src/lib/core/move-definitions.js';

describe('move-definitions', () => {
    it('exposes all 6 face moves', () => {
        expect(FACE_MOVES).toEqual(['U', 'D', 'R', 'L', 'F', 'B']);
    });

    it('parses primitive moves with axis/layer/sign/count', () => {
        const r = getMoveSpec('R');
        expect(r).toMatchObject({ axis: 'x', layer: 1, count: 1 });
        expect(r.sign).toBe(-1);

        const lPrime = getMoveSpec("L'");
        expect(lPrime).toMatchObject({ axis: 'x', layer: -1, count: 1 });
        expect(lPrime.sign).toBe(-1); // base L sign +1 inverted

        const u2 = getMoveSpec('U2');
        expect(u2).toMatchObject({ axis: 'y', layer: 1, count: 2 });
    });

    it('whole-cube rotations have layer=null', () => {
        expect(getMoveSpec('x').layer).toBeNull();
        expect(getMoveSpec('y').layer).toBeNull();
        expect(getMoveSpec('z').layer).toBeNull();
    });

    it('slice moves M/E/S have layer=0', () => {
        expect(getMoveSpec('M').layer).toBe(0);
        expect(getMoveSpec('E').layer).toBe(0);
        expect(getMoveSpec('S').layer).toBe(0);
    });

    it('inverseMove flips sign for quarter turns and preserves it for doubles', () => {
        const r = getMoveSpec('R');
        const rInv = inverseMove(r);
        expect(rInv.sign).toBe(-r.sign);
        expect(rInv.name).toBe("R'");

        const u2 = getMoveSpec('U2');
        const u2Inv = inverseMove(u2);
        expect(u2Inv.sign).toBe(u2.sign);
        expect(u2Inv.name).toBe('U2');

        const rPrime = getMoveSpec("R'");
        expect(inverseMove(rPrime).name).toBe('R');
    });

    it('rejects unknown moves', () => {
        expect(() => getMoveSpec('Q')).toThrow();
        expect(() => getMoveSpec('R3')).toThrow();
        expect(() => getMoveSpec('')).toThrow();
    });
});
