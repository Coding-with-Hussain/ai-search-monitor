import { serve } from "inngest/next";

import { inngest, inngestFunctions } from "@/lib/jobs/inngest";

// Inngest verifies requests with INNGEST_SIGNING_KEY in production.
export const { GET, POST, PUT } = serve({ client: inngest, functions: inngestFunctions });

export const maxDuration = 60;
