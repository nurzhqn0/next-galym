import { describe, expect, it } from "vitest";
import { cellText } from "@/lib/services/sheets";

describe("cellText", () => {
  it("reduces every exceljs value shape to text", () => {
    expect(cellText("plain")).toBe("plain");
    expect(cellText(42)).toBe("42");
    expect(cellText(null)).toBe("");
    expect(cellText({ text: "Linked", hyperlink: "https://example.org" })).toBe("Linked");
    expect(cellText({ text: { richText: [{ text: "Rich " }, { text: "link" }] }, hyperlink: "https://example.org" } as never)).toBe("Rich link");
    expect(cellText({ richText: [{ text: "a" }, { text: "b" }] })).toBe("ab");
    expect(cellText({ formula: "A1", result: "calc" })).toBe("calc");
    expect(cellText(new Date(Date.UTC(2026, 10, 4)))).toBe("2026-11-04");
  });
});
