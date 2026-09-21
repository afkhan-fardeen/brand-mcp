import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { compositeShot } from "@/lib/inngest/functions/composite-shot";

export const runtime = "nodejs";
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [compositeShot],
});
