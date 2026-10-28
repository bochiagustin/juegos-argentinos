import { describe, expect, it } from "vitest";
import { card, cardFromId, cardName, cardNickname, joker, SUITS } from "./cards.ts";
import { createDeck } from "./deck.ts";

describe("cartas", () => {
  it("arma ids estables y legibles", () => {
    expect(card(1, "espada").id).toBe("1-espada");
    expect(card(12, "copa").id).toBe("12-copa");
    expect(joker(2).id).toBe("comodin-2");
  });

  it("reconstruye cualquier carta desde su id", () => {
    for (const c of createDeck({ size: 48, jokers: 2 })) {
      expect(cardFromId(c.id)).toEqual(c);
    }
  });

  it("rechaza ids inválidos", () => {
    for (const bad of ["", "13-espada", "0-oro", "1-diamante", "8 de copa", "comodin-", "1-Espada"]) {
      expect(() => cardFromId(bad)).toThrow();
    }
  });

  it("nombra las cartas en rioplatense", () => {
    expect(cardName(card(7, "oro"))).toBe("7 de oro");
    expect(cardName(joker(1))).toBe("comodín");
    expect(cardNickname(card(1, "espada"))).toBe("el ancho de espada");
    expect(cardNickname(card(1, "copa"))).toBeUndefined();
  });
});

describe("mazos", () => {
  it("el de 40 no tiene 8 ni 9", () => {
    const deck = createDeck({ size: 40 });
    expect(deck).toHaveLength(40);
    expect(deck.some((c) => c.kind === "suited" && (c.rank === 8 || c.rank === 9))).toBe(false);
  });

  it("el de 48 tiene 12 por palo", () => {
    const deck = createDeck({ size: 48 });
    expect(deck).toHaveLength(48);
    for (const suit of SUITS) {
      expect(deck.filter((c) => c.kind === "suited" && c.suit === suit)).toHaveLength(12);
    }
  });

  it("agrega comodines con ids únicos", () => {
    const deck = createDeck({ size: 48, jokers: 2 });
    expect(deck).toHaveLength(50);
    expect(new Set(deck.map((c) => c.id)).size).toBe(50);
    expect(deck.filter((c) => c.kind === "joker")).toHaveLength(2);
  });
});
