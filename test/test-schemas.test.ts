import { describe, expect, it } from "bun:test";
import { LangSchema, ModelSchema } from "../src/index";

// Languages
describe("LangSchema", () => {
  it("should parse english", () => {
    const result = LangSchema.parse("english");
    expect(result).toBe("English");
  });

  it("should parse spanish", () => {
    const result = LangSchema.parse("spanish");
    expect(result).toBe("Spanish");
  });

  it("should transform to lowercase", () => {
    const result = LangSchema.parse("ENGLISH");
    expect(result).toBe("English");
  });

  it("should transform to lowercase b", () => {
    const result = LangSchema.parse("enGlish");
    expect(result).toBe("English");
  });
});

// Models
describe("ModelSchema", () => {
  it("should parse base", () => {
    const result = ModelSchema.parse("base");
    expect(result).toBe("base");
  });

  it("should parse small", () => {
    const result = ModelSchema.parse("small");
    expect(result).toBe("small");
  });

  it("should parse tiny", () => {
    const result = ModelSchema.parse("tiny");
    expect(result).toBe("tiny");
  });
});
