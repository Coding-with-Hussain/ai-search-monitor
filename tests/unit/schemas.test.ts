import { describe, expect, it } from "vitest";

import { providersSchema } from "@/schemas/project";

describe("providersSchema", () => {
  it("removes duplicate platforms", () => {
    expect(providersSchema.parse(["chatgpt", "chatgpt", "gemini"])).toEqual(["chatgpt", "gemini"]);
  });

  it("rejects oversized lists and unknown platforms", () => {
    expect(providersSchema.safeParse(Array.from({ length: 1000 }, () => "chatgpt")).success).toBe(false);
    expect(providersSchema.safeParse(["chatgpt", "bard"]).success).toBe(false);
    expect(providersSchema.safeParse([]).success).toBe(false);
  });
});
