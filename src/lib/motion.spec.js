/**
 * Unit tests for the shared motion module.
 *
 * Covers the static tokens, variant presets, and pure helpers.
 * The reduced-motion hooks (`useMotionPreset`, `useReducedMotionFlag`) require a
 * React render environment and are exercised via component/visual testing, not
 * here.
 */

import { describe, it, expect } from "vitest";
import {
  DURATION,
  LOOP,
  EASE,
  LIFT,
  fade,
  fadeUp,
  scaleIn,
  pageEnter,
  pageExit,
  staggerContainer,
  stagger,
} from "./motion.js";

describe("motion tokens", () => {
  it("exposes the three named duration tiers", () => {
    expect(DURATION).toEqual({ fast: 0.2, base: 1, slow: 1 });
  });

  it("exposes named decorative loop speeds", () => {
    expect(LOOP.nudge).toBeTypeOf("number");
    expect(LOOP.pulse).toBeTypeOf("number");
    expect(LOOP.float).toBeTypeOf("number");
  });

  it("exposes standardized easing values", () => {
    expect(EASE.out).toEqual([0.16, 1, 0.3, 1]);
    expect(EASE.inOut).toEqual([0.16, 1, 0.3, 1]);
  });

  it("exposes a lift distance", () => {
    expect(LIFT).toBeTypeOf("number");
  });
});

describe("variant presets", () => {
  it("fade has hidden/visible/exit states", () => {
    expect(fade.hidden).toMatchObject({ opacity: 0 });
    expect(fade.visible.opacity).toBe(1);
    expect(fade.exit.opacity).toBe(0);
  });

  it("fadeUp translates on the y axis into place", () => {
    expect(fadeUp.hidden).toMatchObject({ opacity: 0, y: LIFT });
    expect(fadeUp.visible).toMatchObject({ opacity: 1, y: 0 });
  });

  it("scaleIn scales up from a smaller size", () => {
    expect(fadeUp).not.toBe(scaleIn);
    expect(scaleIn.hidden.scale).toBeLessThan(1);
    expect(scaleIn.visible.scale).toBe(1);
  });

  it("pageEnter and pageExit are a mirrored pair", () => {
    expect(pageEnter.hidden).toMatchObject({ opacity: 0, y: LIFT });
    expect(pageEnter.visible).toMatchObject({ opacity: 1, y: 0 });
    // Exit drops in the opposite direction of the enter rise.
    expect(pageExit).toMatchObject({ opacity: 0, y: -LIFT });
  });

  it("page enter/exit share the slow duration", () => {
    expect(pageEnter.visible.transition.duration).toBe(DURATION.slow);
    expect(pageExit.transition.duration).toBe(DURATION.slow);
  });
});

describe("stagger helpers", () => {
  it("staggerContainer produces a container variant with staggerChildren", () => {
    const container = staggerContainer();
    expect(container.visible.transition.staggerChildren).toBe(DURATION.fast);
  });

  it("staggerContainer accepts a custom step", () => {
    const container = staggerContainer(0.1);
    expect(container.visible.transition.staggerChildren).toBe(0.1);
  });

  it("stagger computes an increasing delay by index", () => {
    expect(stagger(0).delay).toBe(0);
    expect(stagger(2, 0.1).delay).toBeCloseTo(0.2);
    expect(stagger(1).ease).toBe(EASE.out);
  });
});
