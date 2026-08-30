import { describe, it, expect } from "vitest";
import { normalizeName, matchGuestByName } from "./text-match.js";

const guests = [
  { id: 1, full_name: "Vitória Casaloti" },
  { id: 2, full_name: "João Pedro Souza" },
  { id: 3, full_name: "Ana Paula Lima" },
  { id: 4, full_name: "Ana Beatriz Costa" },
];

describe("normalizeName", () => {
  it("strips case, accents and extra whitespace", () => {
    expect(normalizeName("  VITÓRIA   Casalóti ")).toBe("vitoria casaloti");
    expect(normalizeName("José D'Ávila")).toBe("jose d avila");
  });

  it("is safe with nullish input", () => {
    expect(normalizeName(undefined)).toBe("");
    expect(normalizeName(null)).toBe("");
  });
});

describe("matchGuestByName", () => {
  it("matches the full name regardless of case, accents or spacing", () => {
    for (const typed of [
      "Vitória Casaloti",
      "vitoria casaloti",
      "VITORIA CASALOTI",
      "  vitória   casaloti  ",
    ]) {
      expect(matchGuestByName(typed, guests)?.id).toBe(1);
    }
  });

  it("matches an unambiguous first name only", () => {
    expect(matchGuestByName("Vitória", guests)?.id).toBe(1);
  });

  it("matches when the guest typed extra names", () => {
    expect(matchGuestByName("Vitória Casaloti Silva", guests)?.id).toBe(1);
  });

  it("refuses to guess when the name is ambiguous", () => {
    expect(matchGuestByName("Ana", guests)).toBeNull();
  });

  it("resolves the ambiguity once another token is given", () => {
    expect(matchGuestByName("Ana Paula", guests)?.id).toBe(3);
  });

  it("returns null for empty input or empty guest list", () => {
    expect(matchGuestByName("", guests)).toBeNull();
    expect(matchGuestByName("Vitória", [])).toBeNull();
  });
});
