# Rubik's Cube 3x3 Simulator: Math, Data Structures & Algorithms

**Report Date:** 2026-04-27 | **Target:** Vite + Svelte 5 cube logic layer (`src/lib/core/`)

---

## Executive Summary

Use a **hybrid model**: cubie permutation + orientation as the authoritative state, with a **3D coordinate layer** for rendering and a **sticker array** derived on-demand for solver input. This balances mathematical elegance (solver-ready), rendering simplicity (Three.js-native), and code testability. Recommended solver: **cubejs** (MIT, 0.01–0.4s solve time, 4-5s init, 22 moves max).

---

## 1. State Representation: Recommended Hybrid

### Option A: Face/Sticker Array (54 stickers)
- **Pros:** Direct to render (flatten 6×9 into texture).
- **Cons:** Move logic fragile (cycling indices), hard to validate, inefficient for solving.

### Option B: Cubie Permutation + Orientation ⭐ **Authority**
- **8 corners:** position [0..7], orientation [0..2] (3 rotations).
- **12 edges:** position [0..11], orientation [0..1] (flip/no-flip).
- **Math foundation:** Permutation group S₈ × ℤ₃⁸ for corners, S₁₂ × ℤ₂¹² for edges.
- **State size:** 2 × 64-bit integers + metadata (tight).
- **Move application:** Clean cycle logic, trivial inverse, solver input format.
- **Validation:** Parity check (both permutations must have same parity).

### Option C: 3D Coordinate Model (cubie position + rotation matrix)
- **Pros:** Native for Three.js mesh animation, intuitive for rotations.
- **Cons:** Floating-point drift if not careful, harder to parse for solver.

### Architecture: **Use B as source of truth, derive A and C on-demand**

**Pseudocode state object:**
```javascript
// src/lib/core/cube-state.js
class CubeState {
  // Corners: [pos0..pos7, ori0..ori7]
  cornersPerm = new Uint8Array(8);
  cornersOri = new Uint8Array(8);
  
  // Edges: [pos0..pos11, ori0..ori11]
  edgesPerm = new Uint8Array(12);
  edgesOri = new Uint8Array(12);
  
  // Derived views (computed on-demand, cached if hot)
  toStickerArray() { /* expand to 54-element array for solver */ }
  to3DCoordinates() { /* return cubies as {pos:vec3, ori:quat} */ }
  
  isValid() { 
    // Parity check: permutation inversion count modulo 2
    return countSwaps(this.cornersPerm) % 2 === countSwaps(this.edgesPerm) % 2;
  }
}
```

---

## 2. Move Set & Notation

### Standard 18 Moves (WCA Standard / Singmaster)

| Move | Axis | Layer | Dir | Notes |
|------|------|-------|-----|-------|
| U, U', U2 | Y | 2 (top) | ±1, 2 | Up face |
| D, D', D2 | Y | 0 (bot) | ±1, 2 | Down face |
| R, R', R2 | X | 2 (right) | ±1, 2 | Right face |
| L, L', L2 | X | 0 (left) | ±1, 2 | Left face |
| F, F', F2 | Z | 2 (front) | ±1, 2 | Front face |
| B, B', B2 | Z | 0 (back) | ±1, 2 | Back face |

### Slice & Wide Moves (Extended)

| Move | Type | Definition |
|------|------|-----------|
| M, M2 | Slice | Middle layer (between L & R), axis = X, layer = 1 |
| E, E2 | Slice | Equatorial (between U & D), axis = Y, layer = 1 |
| S, S2 | Slice | Standing (between F & B), axis = Z, layer = 1 |
| r, r2, r' | Wide | Right + middle (layer 1–2), axis = X |
| u, u2, u' | Wide | Up + top-middle (layer 1–2), axis = Y |
| x, y, z | Rotation | Whole cube rotate (x around X-axis, etc.) |

**Inverse rule:** `move' = -move`, `move2 = move + move`.

---

## 3. Applying a Move to the 3D Coordinate Model

**Algorithm: Select → Rotate → Snap**

```javascript
applyMove(state, move) {
  // move = {axis: 'X'|'Y'|'Z', layer: 0|1|2, dir: ±1, count: 1|2|4}
  
  const axisVec = {X: [1,0,0], Y: [0,1,0], Z: [0,0,1]}[move.axis];
  const threshold = (move.layer === 0) ? -1 : (move.layer === 2) ? 1 : 0;
  
  // 1. Select cubies on the target layer
  const selectedIndices = state.cubies
    .map((c, i) => (c.position[axisIdx] >= threshold - 0.1 && 
                     c.position[axisIdx] <= threshold + 0.1) ? i : -1)
    .filter(i => i >= 0);
  
  // 2. Rotate each cubie's position and orientation
  const angle = (move.dir * 90 * move.count) * Math.PI / 180;
  selectedIndices.forEach(i => {
    // Rotate position around axis by angle
    state.cubies[i].position = rotateVec3(state.cubies[i].position, axisVec, angle);
    
    // Rotate orientation matrix
    state.cubies[i].orientation = multiplyQuats(
      state.cubies[i].orientation,
      axisAngleToQuat(axisVec, angle)
    );
  });
  
  // 3. Snap to integer grid (round to nearest 0.5 or nearest integer)
  state.cubies.forEach(c => {
    c.position = c.position.map(v => Math.round(v * 2) / 2);
  });
  
  // 4. Update permutation state from new coordinates
  updatePermutationFromCoordinates(state);
}
```

**Drift prevention:** Snap after every move; store permutation as the _ground truth_, not the coordinates.

---

## 4. Detecting Solved State & Validity

### Solved State (Fast)
```javascript
isSolved(state) {
  // All corners at home position with identity orientation
  for (let i = 0; i < 8; i++) {
    if (state.cornersPerm[i] !== i || state.cornersOri[i] !== 0) return false;
  }
  // All edges at home position with identity orientation
  for (let i = 0; i < 12; i++) {
    if (state.edgesPerm[i] !== i || state.edgesOri[i] !== 0) return false;
  }
  return true;
}
```

**Cost:** O(1), no search.

### Validity Check (Permutation Parity)
```javascript
isValid(state) {
  const cornerSwaps = countInversions(state.cornersPerm);
  const edgeSwaps = countInversions(state.edgesPerm);
  
  // For 3x3, parities must match (both even or both odd)
  // In practice, only even-parity states are reachable
  return (cornerSwaps % 2) === (edgeSwaps % 2);
}

function countInversions(perm) {
  let count = 0;
  for (let i = 0; i < perm.length; i++) {
    for (let j = i + 1; j < perm.length; j++) {
      if (perm[i] > perm[j]) count++;
    }
  }
  return count;
}
```

**Reachability:** Only even-parity states reachable from identity via legal moves. Use this to reject user-injected invalid states before passing to solver.

---

## 5. Scrambling: WCA-Style Generator

**Rule:** No two consecutive moves on same face; no redundant parallel-face chains.

```javascript
function generateScramble(moveCount = 20) {
  const moves = [
    'U', 'D', 'R', 'L', 'F', 'B',
    'M', 'E', 'S', 'x', 'y', 'z',  // rotations (optional for WCA)
  ];
  const modifiers = ['', "'", '2'];
  
  const scramble = [];
  let lastFace = null;
  
  for (let i = 0; i < moveCount; i++) {
    let move;
    do {
      const face = moves[Math.floor(Math.random() * 6)]; // stick to basic 18
      const mod = modifiers[Math.floor(Math.random() * 3)];
      move = face + mod;
      
      // Reject if same face as last move
      if (face === lastFace) continue;
      // Reject if opposite face (L & R, U & D, F & B) with same last move
      const opposites = {L: 'R', R: 'L', U: 'D', D: 'U', F: 'B', B: 'F'};
      if (opposites[face] === lastFace && mod === '') continue; // greedy: skip redundant
      
      break;
    } while (true);
    
    scramble.push(move);
    lastFace = move[0];
  }
  
  return scramble.join(' ');
}
```

**Note:** WCA official uses random-state generation (pick random solvable position, output inverse solution), not random moves. For MVP, random-move with the above rules is sufficient.

---

## 6. Solver: Recommended Choice

### Comparison

| Library | Algo | Bundle | Solve Time | Init Time | License | Notes |
|---------|------|--------|-----------|-----------|---------|-------|
| **cubejs** ⭐ | Kociemba 2-phase | ~80 KB | 0.01–0.4s | 4–5s | MIT | ✓ Pure JS, npm, works in browser |
| min2phase | Kociemba 2-phase | Java → JS | ~500ms | 200ms (with init) | GPLv3/MIT | Java GWT compiled; large bundle |
| cube-solver | Kociemba 2-phase | ~200 KB | Similar | Similar | ? | Fewer stars; less maintained |

### Recommendation: **cubejs**

**Why:**
- MIT license (clean for commercial).
- Smallest bundle (~80 KB gzipped estimate).
- 4–5s initialization (one-time on app load, cached).
- 22 moves guaranteed (God's Number); typical 18–20 moves.
- Pure JavaScript (no FFI, no external binaries).
- Web worker compatible.
- High community adoption (355 GitHub stars).

**Implementation sketch:**
```javascript
// src/lib/solvers/cubejs-solver.js
import Cube from 'cubejs';

let solverInstance = null;

export async function initSolver() {
  if (!solverInstance) {
    solverInstance = new Cube();
    // Initialization takes 4–5s; do once at app startup
    await solverInstance.solve(); // warm up
  }
  return solverInstance;
}

export function solve(scrambleString) {
  // scrambleString = "R U R' U' R U2 R'"
  const cube = new Cube(scrambleString);
  const solution = cube.solve(); // returns string like "R U' R' U'"
  return solution;
}
```

### Alternative: Skip Kociemba for MVP, Offer CFOP Step-by-Step

If bundle size is critical, provide a **step-by-step solver** (cross → F2L → OLL → PLL) that guides users interactively instead of auto-solving. Much smaller footprint, pedagogical value.

---

## 7. Move Parser

**Input:** `"R U R' U' x2 (R U R' U')"` → Array of move objects.

```javascript
function parseAlgorithm(algorithmString) {
  // Normalize: strip parens, split on whitespace and commas
  const tokens = algorithmString
    .replace(/[()]/g, ' ')
    .split(/[\s,]+/)
    .filter(t => t.length > 0);
  
  const moves = [];
  const faceMap = {
    // Standard faces
    'U': {axis: 'Y', layer: 2},  'D': {axis: 'Y', layer: 0},
    'R': {axis: 'X', layer: 2},  'L': {axis: 'X', layer: 0},
    'F': {axis: 'Z', layer: 2},  'B': {axis: 'Z', layer: 0},
    // Slices
    'M': {axis: 'X', layer: 1},  'E': {axis: 'Y', layer: 1},  'S': {axis: 'Z', layer: 1},
    // Rotations
    'x': {axis: 'X', layer: 'all'}, 'y': {axis: 'Y', layer: 'all'}, 'z': {axis: 'Z', layer: 'all'},
  };
  
  for (const token of tokens) {
    // Regex: ([A-Za-z]+)([2']?)
    const match = token.match(/^([A-Za-z]+)(2|')?$/);
    if (!match) continue; // skip invalid
    
    const face = match[1];
    const modifier = match[2] || '';
    
    if (!faceMap[face]) continue; // unknown move
    
    const baseMove = faceMap[face];
    let dir = 1;
    let count = 1;
    
    if (modifier === "'") dir = -1;
    else if (modifier === "2") count = 2;
    
    // Check for wide move (lowercase second letter in two-letter face names)
    const isWide = face.length === 2 && face[1] === face[1].toLowerCase();
    
    moves.push({
      face: face[0],
      wide: isWide,
      ...baseMove,
      dir,
      count,
    });
  }
  
  return moves;
}

// Usage:
const moves = parseAlgorithm("R U R' U' x2");
// Returns: [
//   {face: 'R', wide: false, axis: 'X', layer: 2, dir: 1, count: 1},
//   {face: 'U', wide: false, axis: 'Y', layer: 2, dir: 1, count: 1},
//   ...
// ]
```

**Notes:**
- Parentheses treated as whitespace (grouping is visual only).
- Lowercase = wide move (e.g., `r` = R + M, `u` = U + E).
- Prime (') = reverse direction.
- 2 = double count.
- Robust to extra spaces, commas.

---

## File Structure for `src/lib/core/`

```
src/lib/core/
├── cube-state.ts           # CubeState, permutation + orientation
├── move-definitions.ts     # Move lookup table (axis, layer, effect)
├── move-applier.ts         # applyMove(state, move)
├── move-parser.ts          # parseAlgorithm(string)
├── scrambler.ts            # generateScramble()
├── validator.ts            # isValid(), isSolved()
├── solver.ts               # initSolver(), solve() [cubejs wrapper]
└── coordinate-converter.ts # to3D(), toStickers() [derived views]
```

Each file unit-testable, no DOM, pure JS.

---

## Unresolved Questions

1. **Orientation encoding:** Use numerical indices [0,1,2] for corner rotations, or bitfield? (Numerical simpler, bitfield saves memory at scale.)
2. **Solver initialization timing:** Async on app mount or lazy on first solve request? (Recommend app mount; keep solver instance in Svelte store.)
3. **WCA vs. random-state scrambles:** For MVP, is random-move + no-repeat-face good enough, or must we implement full state sampling?
4. **Three.js integration:** Cubies as individual meshes or single instanced geometry? (Instancing scales, but per-cubie control simpler for animation.)
5. **Undo/redo:** Store move history or recompute from scramble string? (Recompute simpler, less state; history useful for tutorial playback.)

---

## Sources

- [The Mathematics of the Rubik's Cube](https://web.mit.edu/sp.268/www/rubik.pdf)
- [cubejs GitHub](https://github.com/ldez/cubejs)
- [min2phase GitHub](https://github.com/cs0x7f/min2phase)
- [Kociemba Two-Phase Algorithm Details](https://kociemba.org/math/twophase.htm)
- [WCA Scrambles](https://www.worldcubeassociation.org/regulations/scrambles/)
- [Rubik's Cube Notation (Ruwix)](https://ruwix.com/the-rubiks-cube/notation/)
- [Parity Theory (Ryan Heise)](https://www.ryanheise.com/cube/parity.html)
- [Modeling a Rubik's Cube in 3D](https://hannuhartikainen.fi/blog/modeling-rubiks-cube/)
