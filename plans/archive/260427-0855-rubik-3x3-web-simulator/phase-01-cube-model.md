# Phase 1 — Cube Model + Move Logic (Pure JS)

**Priority:** blocker (everything else depends on this)
**Status:** pending
**LOC budget:** ~300 across 6 files

## Goal

A fully testable, DOM-free cube state with move application, scramble generation, notation parsing, and solved detection. No Three.js dependency yet — but use vec3/quat representations Three.js can adopt directly.

## Architecture Decision

**3D coordinates are authoritative.** Each cubie:
```
{
  initialPosition: [x,y,z]   // home, in {-1,0,1}^3
  position:        [x,y,z]   // current, snapped to integers each move
  quaternion:      [x,y,z,w] // current orientation (identity at home)
}
```

26 visible cubies (the (0,0,0) center is omitted; or include it for symmetry, doesn't matter). Convention: include all 27 with center at (0,0,0) for cleanest indexing.

Move = `{ axis: 'x'|'y'|'z', layer: -1|0|1, sign: +1|-1, count: 1|2 }`. Layer is the integer coord on `axis` whose cubies move (e.g., R = `{axis:'x', layer:1, sign:-1, count:1}` because looking down +x, CW rotation is -90° around +x).

## Files

### `src/lib/core/cubie-model.js` (~60 LOC)
- `createSolvedCube()` → array of 27 cubies at integer positions in `[-1,1]^3` with identity quaternions.
- Cubies as plain objects, not classes. Helper `cloneCubies(cubies)`.

### `src/lib/core/move-definitions.js` (~80 LOC)
- Constant `MOVES` keyed by name: `U U' U2 D D' D2 R R' R2 L L' L2 F F' F2 B B' B2 M M' M2 E E' E2 S S' S2 x x' x2 y y' y2 z z' z2` mapping to `{axis, layer, sign, count}` — for full-cube rotations layer=null and we rotate all 27.
- Helper `getMoveSpec(name)` and `inverseMove(spec)`.

### `src/lib/core/apply-move.js` (~80 LOC)
- `applyMove(cubies, spec)` mutates cubies in place:
  1. Filter cubies on the target layer (`Math.round(c.position[axisIdx]) === layer`, or all if `layer===null`).
  2. For each, build axis-angle quaternion `q = quatFromAxisAngle(axisVec, sign * count * π/2)`.
  3. New position = rotate `c.position` by `q`. New quaternion = `q * c.quaternion`.
  4. Snap each new position component to `Math.round`. Re-normalize quaternion.
- Tiny inline vec3/quat helpers (mul, rotateVec). Keep self-contained — no Three.js import.

### `src/lib/core/move-parser.js` (~60 LOC)
- `parseAlgorithm("R U R' U2 (R U R')")` → `[spec, spec, ...]`.
- Strip parens/commas, split whitespace, regex per token: `^([UDRLFBMESxyz][w]?)(2|')?$`.
- Return `[]` for empty, throw `Error('Unknown move: X')` on unknown token.

### `src/lib/core/scrambler.js` (~50 LOC)
- `generateScramble(length=20)` → notation string.
- Pick from `[U,D,R,L,F,B]` × `['', "'", '2']`. Reject if same face as last move; reject if opposite face equals two-back face (no `R L R` sandwich).

### `src/lib/core/solved-check.js` (~30 LOC)
- `isSolved(cubies)` → bool. For each cubie, position equals initialPosition AND quaternion is approximately identity (|x|+|y|+|z| < ε, |w-1| < ε OR |w+1| < ε since q and -q are same rotation).

## Acceptance

- `applyMove(cube, R)` then `applyMove(cube, R')` returns to solved.
- `applyMove(cube, R)` four times returns to solved.
- `parseAlgorithm("R U R' U' R U2 R'")` returns 7 specs.
- `generateScramble(20)` produces 20 valid moves with no consecutive same-face or sandwich.
- All 6 files compile with no errors and < 200 LOC each.

## Risks

- **Floating-point drift on quaternions.** Mitigation: snap positions to ints after every move and renormalize quaternions.
- **Off-by-one on layer indices.** Convention: positions are in `{-1, 0, 1}`, layer = -1 means the slab at x=-1 (the L face cubies). Test by applying R then verifying x=1 cubies have rotated.
