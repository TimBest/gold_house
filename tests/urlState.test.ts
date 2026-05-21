import { describe, expect, test } from "bun:test";
import { parseSearchParams, toQueryString } from "@/lib/urlState";

describe("parseSearchParams", () => {
  test("parses address and commodity", () => {
    const sp = new URLSearchParams("address=123+Main+St&commodity=oil");
    const s = parseSearchParams(sp);
    expect(s.address).toBe("123 Main St");
    expect(s.commodity).toBe("oil");
    expect(s.sqft).toBeUndefined();
    expect(s.value).toBeUndefined();
  });

  test("defaults commodity to gold when missing", () => {
    const sp = new URLSearchParams("address=foo");
    expect(parseSearchParams(sp).commodity).toBe("gold");
  });

  test("invalid commodity falls back to gold", () => {
    const sp = new URLSearchParams("address=foo&commodity=platinum");
    expect(parseSearchParams(sp).commodity).toBe("gold");
  });

  test("parses sqft and value when present", () => {
    const sp = new URLSearchParams(
      "address=foo&commodity=sugar&sqft=1800&value=420000"
    );
    const s = parseSearchParams(sp);
    expect(s.sqft).toBe(1800);
    expect(s.value).toBe(420000);
  });

  test("malformed sqft is ignored (not thrown)", () => {
    const sp = new URLSearchParams("address=foo&sqft=abc");
    expect(parseSearchParams(sp).sqft).toBeUndefined();
  });

  test("missing address yields empty string", () => {
    const sp = new URLSearchParams("");
    expect(parseSearchParams(sp).address).toBe("");
  });
});

describe("toQueryString", () => {
  test("emits address and commodity in canonical order", () => {
    const qs = toQueryString({
      address: "123 Main St",
      commodity: "oil",
    });
    expect(qs).toBe("address=123+Main+St&commodity=oil");
  });

  test("omits sqft/value when undefined", () => {
    const qs = toQueryString({ address: "foo", commodity: "gold" });
    expect(qs).not.toContain("sqft");
    expect(qs).not.toContain("value");
  });

  test("includes sqft and value when present", () => {
    const qs = toQueryString({
      address: "foo",
      commodity: "gold",
      sqft: 1800,
      value: 420000,
    });
    expect(qs).toContain("sqft=1800");
    expect(qs).toContain("value=420000");
  });
});

describe("round-trip", () => {
  test("parse(toQueryString(state)) === state", () => {
    const state = {
      address: "350 5th Ave, New York, NY",
      commodity: "sugar" as const,
      sqft: 1234,
      value: 999000,
    };
    const sp = new URLSearchParams(toQueryString(state));
    expect(parseSearchParams(sp)).toEqual(state);
  });
});
