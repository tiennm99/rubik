import { describe, it, expect } from 'vitest';
import { generateScramble } from '../src/lib/core/scrambler.js';
import { parseAlgorithm } from '../src/lib/core/move-parser.js';

describe('scrambler', () => {
    it('produces the requested number of moves', () => {
        const moves = generateScramble(20).split(/\s+/);
        expect(moves).toHaveLength(20);
    });

    it('produces tokens parsable by the move parser', () => {
        const algo = generateScramble(25);
        const moves = parseAlgorithm(algo);
        expect(moves).toHaveLength(25);
        for (const m of moves) {
            expect(['U', 'D', 'R', 'L', 'F', 'B']).toContain(m.name[0]);
        }
    });

    it('never repeats the same face on consecutive moves', () => {
        for (let trial = 0; trial < 5; trial++) {
            const tokens = generateScramble(40).split(/\s+/);
            for (let i = 1; i < tokens.length; i++) {
                expect(tokens[i][0]).not.toBe(tokens[i - 1][0]);
            }
        }
    });
});
