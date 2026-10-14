"use server";

import { headers } from "next/headers";

import { runAction } from "@/lib/action-utils";
import { freeCheckSchema, type FreeCheckInput } from "@/schemas/free-check";
import { runFreeCheck } from "@/services/free-check/run";

export async function runFreeCheckAction(input: FreeCheckInput) {
  return runAction(async () => {
    const data = freeCheckSchema.parse(input);
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
    return runFreeCheck(data, ip);
  }, "free_check.run");
}
