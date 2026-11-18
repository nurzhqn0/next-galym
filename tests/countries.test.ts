import { describe, expect, it } from "vitest";
import { parseCountries } from "@/lib/countries";

describe("parseCountries", () => {
  it("maps names, aliases and Russian names", () => {
    expect(parseCountries("Switzerland").codes).toEqual(["CH"]);
    expect(parseCountries("USA").codes).toEqual(["US"]);
    expect(parseCountries("Швейцария").codes).toEqual(["CH"]);
  });

  it("splits several countries", () => {
    expect(parseCountries("Singapore & Japan").codes).toEqual(["SG", "JP"]);
  });

  it("ignores non-country words without calling them unknown", () => {
    expect(parseCountries("Online")).toEqual({ codes: [], unknown: [] });
    expect(parseCountries("-")).toEqual({ codes: [], unknown: [] });
  });

  it("reports unknown names", () => {
    expect(parseCountries("Narnia").unknown).toEqual(["Narnia"]);
  });

  it("dedupes in order", () => {
    expect(parseCountries("Japan, Germany; japan").codes).toEqual(["JP", "DE"]);
  });

  it("handles names that contain a separator or a curly apostrophe", () => {
    expect(parseCountries("Trinidad and Tobago")).toEqual({ codes: ["TT"], unknown: [] });
    expect(parseCountries("Bosnia & Herzegovina, Serbia")).toEqual({ codes: ["BA", "RS"], unknown: [] });
    expect(parseCountries("Côte d'Ivoire")).toEqual({ codes: ["CI"], unknown: [] });
  });
});

describe("Russian aliases", () => {
  it("maps common short names", () => {
    expect(parseCountries("США").codes).toEqual(["US"]);
    expect(parseCountries("ОАЭ").codes).toEqual(["AE"]);
    expect(parseCountries("Великобритания").codes).toEqual(["GB"]);
  });
});
