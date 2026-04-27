// Parse an algorithm string like "R U R' U' x2 (R U R' U')" into move specs.
// Whitespace, commas, and parentheses are treated as separators.

import { getMoveSpec } from './move-definitions.js';

const TOKEN_RE = /^([UDRLFBMESxyz])(2|')?$/;

export function parseAlgorithm(algorithm) {
    if (!algorithm) return [];
    const tokens = String(algorithm)
        .replace(/[(),]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
    const moves = [];
    for (const token of tokens) {
        const match = TOKEN_RE.exec(token);
        if (!match) {
            throw new Error(`Unknown move token: "${token}"`);
        }
        moves.push(getMoveSpec(token));
    }
    return moves;
}

export function stringifyMoves(moves) {
    return moves.map((m) => m.name).join(' ');
}
