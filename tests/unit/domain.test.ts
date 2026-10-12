import { describe, expect, it } from "vitest";

import { domainMatches, extractDomain, normalizeWebsite } from "@/lib/domain";

describe("domain helpers", () => {
  it("normalizes websites", () => {
    expect(normalizeWebsite("abcdental.com")).toBe("https://abcdental.com");
    expect(normalizeWebsite("http://www.abc.com/")).toBe("http://www.abc.com");
    expect(normalizeWebsite("https://abc.com/about/")).toBe("https://abc.com/about");
    expect(normalizeWebsite("not a url")).toBeNull();
    expect(normalizeWebsite("")).toBeNull();
  });

  it("extracts bare domains", () => {
    expect(extractDomain("https://www.AbcDental.com/x?y=1")).toBe("abcdental.com");
    expect(extractDomain("smileclinic.pk")).toBe("smileclinic.pk");
    expect(extractDomain("localhost")).toBeNull();
    expect(extractDomain(null)).toBeNull();
  });

  it("matches subdomains but not lookalikes", () => {
    expect(domainMatches("blog.abc.com", "abc.com")).toBe(true);
    expect(domainMatches("www.abc.com", "abc.com")).toBe(true);
    expect(domainMatches("notabc.com", "abc.com")).toBe(false);
    expect(domainMatches("abc.com.evil.io", "abc.com")).toBe(false);
  });
});
