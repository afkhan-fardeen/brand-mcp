import { Inngest } from "inngest";

export type CompositingRequestedEvent = {
  name: "compositing/requested";
  data: {
    jobId: string;
    brandId: string;
    sourceImageUrls: string[];
    artDirectionPrompt: string;
    dimensions: string;
  };
};

export const inngest = new Inngest({ id: "brandhub" });
