// Regression: in tween.js v25 the module-level update() does NOT track
// new Tween() instances unless they're given an explicit Group. animate-move.js
// owns one TWEENS group; tickTweens() must drive it. If a future refactor
// drops the group reference these tests will fail before users do.

import { describe, it, expect } from 'vitest';
import { Tween, Group as TweenGroup, update as moduleUpdate } from '@tweenjs/tween.js';

describe('tween.js v25 group semantics', () => {
    it('module-level update() does not advance tweens that lack a Group', () => {
        const state = { a: 0 };
        let completed = false;
        new Tween(state).to({ a: 100 }, 50)
            .onComplete(() => { completed = true; })
            .start(0);
        for (let t = 0; t <= 60; t += 10) moduleUpdate(t);
        // Confirms the breaking change that motivated the explicit Group fix.
        expect(state.a).toBe(0);
        expect(completed).toBe(false);
    });

    it('group.update() advances tweens registered to that group', () => {
        const group = new TweenGroup();
        const state = { a: 0 };
        let completed = false;
        new Tween(state, group).to({ a: 100 }, 50)
            .onComplete(() => { completed = true; })
            .start(0);
        for (let t = 0; t <= 60; t += 10) group.update(t);
        expect(state.a).toBe(100);
        expect(completed).toBe(true);
    });
});
