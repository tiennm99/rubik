// Pure-JS smoke test of the cube core (no Three.js, no Svelte).
// Run with: `node scripts/smoke-test-core.mjs`. Exits non-zero on any failure.

import { createSolvedCube } from '../src/lib/core/cubie-model.js';
import { getMoveSpec, inverseMove } from '../src/lib/core/move-definitions.js';
import { applyMove } from '../src/lib/core/apply-move.js';
import { isSolved } from '../src/lib/core/solved-check.js';
import { parseAlgorithm } from '../src/lib/core/move-parser.js';
import { generateScramble } from '../src/lib/core/scrambler.js';

let pass = 0;
let fail = 0;
const test = (name, ok) => {
    if (ok) { pass++; console.log('  pass', name); }
    else    { fail++; console.log('  FAIL', name); }
};

let c = createSolvedCube();
test('27 cubies', c.length === 27);
test('fresh = solved', isSolved(c));

for (const f of ['R', 'L', 'U', 'D', 'F', 'B']) {
    c = createSolvedCube();
    for (let i = 0; i < 4; i++) applyMove(c, getMoveSpec(f));
    test(`${f} x4 = solved`, isSolved(c));
}

c = createSolvedCube();
applyMove(c, getMoveSpec('R'));
applyMove(c, getMoveSpec("R'"));
test("R R' = solved", isSolved(c));

c = createSolvedCube();
applyMove(c, getMoveSpec('R2'));
applyMove(c, getMoveSpec('R2'));
test('R2 R2 = solved', isSolved(c));

c = createSolvedCube();
const sexy = parseAlgorithm("R U R' U'");
for (let i = 0; i < 6; i++) for (const m of sexy) applyMove(c, m);
test('(R U R\' U\') x6 = solved', isSolved(c));

c = createSolvedCube();
const alg = generateScramble(20);
const moves = parseAlgorithm(alg);
for (const m of moves) applyMove(c, m);
test('scramble != solved', !isSolved(c));
const undo = [...moves].reverse().map(inverseMove);
for (const m of undo) applyMove(c, m);
test('reversed scramble = solved', isSolved(c));

let threw = false;
try { parseAlgorithm('Q'); } catch { threw = true; }
test('parser rejects unknown', threw);

test('scramble length', generateScramble(20).split(' ').length === 20);

console.log(`--- ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
