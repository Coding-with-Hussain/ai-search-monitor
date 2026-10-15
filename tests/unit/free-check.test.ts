import { describe, expect, it } from "vitest";

import { clientKey } from "@/services/free-check/run";

describe("free checker client key", () => {
  it("uses the full IPv4 address", () => {
    expect(clientKey("203.0.113.7")).toBe("203.0.113.7");
    expect(clientKey("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("groups IPv6 addresses by their /64 prefix", () => {
    const a = clientKey("2001:db8:85a3:1234:aaaa:bbbb:cccc:dddd");
    expect(a).toBe("2001:db8:85a3:1234::/64");
    expect(clientKey("2001:0db8:85a3:1234::1")).toBe(a);
    expect(clientKey("2001:DB8:85A3:1234:ffff::%eth0")).toBe(a);
    expect(clientKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(clientKey("2001:db8:85a3:1235::1")).not.toBe(a);
  });
});
