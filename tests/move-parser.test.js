import { describe, it, expect } from 'vitest';
import { parseAlgorithm, stringifyMoves } from '../src/lib/core/move-parser.js';

describe('move-parser', () => {
    it('parses an empty string to an empty array', () => {
        expect(parseAlgorithm('')).toEqual([]);
        expect(parseAlgorithm(null)).toEqual([]);
    });

    it('parses a simple algorithm to specs', () => {
        const moves = parseAlgorithm("R U R' U'");
        expect(moves.map((m) => m.name)).toEqual(['R', 'U', "R'", "U'"]);
    });

    it('treats commas, parentheses, and extra spaces as separators', () => {
        const moves = parseAlgorithm('  (R, U), R\' U\' ');
        expect(moves.map((m) => m.name)).toEqual(['R', 'U', "R'", "U'"]);
    });

    it('round-trips parse → stringify', () => {
        const algo = "R U2 R' x F2 M";
        expect(stringifyMoves(parseAlgorithm(algo))).toBe(algo);
    });

    it('rejects garbage tokens', () => {
        expect(() => parseAlgorithm('R Q')).toThrow();
        expect(() => parseAlgorithm('RR')).toThrow();
    });
});
