"use client";

import { useRef, useState, useTransition } from "react";
import { uploadGuideline } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function GuidelineUploadForm({ brandId }: { brandId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await uploadGuideline(brandId, formData);
        formRef.current?.reset();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <Card>
      <p className="section-label text-sm">Add guideline</p>
      <p className="mt-1 text-sm text-foreground-muted">
        Upload a PDF, DOCX, image, or plain text file — or just type notes. Text is
        extracted and embedded automatically for AI semantic search.
      </p>
      <form ref={formRef} action={handleSubmit} className="mt-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            name="title"
            placeholder="Title (optional)"
            className="rounded-xl border border-hairline bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            name="category"
            placeholder="Category, e.g. typography"
            className="rounded-xl border border-hairline bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <textarea
          name="notes"
          rows={3}
          placeholder="Notes (required if no file, or to add context to a file/image)"
          className="rounded-xl border border-hairline bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          name="file"
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md,image/*"
          className="text-sm text-foreground-muted"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={isPending} className="self-start">
          {isPending ? "Uploading…" : "Add guideline"}
        </Button>
      </form>
    </Card>
  );
}
