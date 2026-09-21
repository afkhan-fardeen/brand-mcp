import type { CompositingRequestedEvent } from "@/lib/inngest/client";
import { inngest } from "@/lib/inngest/client";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Runs the Photoroom compositing call as a durable background step, so the MCP
 * tool handler never has to hold the AI client's connection open past ~10s
 * (rules.md #5). generate_composited_shot just enqueues this event and returns
 * the job id immediately; the dashboard/AI poll generation_jobs for the result.
 */
export const compositeShot = inngest.createFunction(
  {
    id: "composite-shot",
    retries: 2,
    // Surfaces Photoroom/network failures back onto the job row as a natural-language
    // error string (rules.md #4), instead of leaving the job stuck at "processing".
    onFailure: async ({ event, error }: { event: { data: { event: CompositingRequestedEvent } }; error: Error }) => {
      const supabase = createServiceClient();
      const jobId = event.data.event.data.jobId;
      await supabase
        .from("generation_jobs")
        .update({
          status: "failed",
          error: `Error: compositing failed — ${error.message}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    },
    triggers: [{ event: "compositing/requested" }],
  },
  async ({ event, step }) => {
    const { jobId, sourceImageUrls, artDirectionPrompt, dimensions } = event.data;

    const resultUrl = await step.run("call-photoroom", async () => {
      const res = await fetch("https://image-api.photoroom.com/v2/edit", {
        method: "POST",
        headers: {
          "x-api-key": process.env.PHOTOROOM_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrls: sourceImageUrls,
          prompt: artDirectionPrompt,
          outputSize: dimensions,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Photoroom API returned ${res.status}: ${body}`);
      }

      const json = await res.json();
      return json.result_url as string;
    });

    await step.run("mark-completed", async () => {
      const supabase = createServiceClient();
      await supabase
        .from("generation_jobs")
        .update({ status: "completed", result_url: resultUrl, updated_at: new Date().toISOString() })
        .eq("id", jobId);
    });

    return { resultUrl };
  },
);
