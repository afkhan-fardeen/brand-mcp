"use client";

import { useRef, useState, useTransition } from "react";
import { uploadGuideline } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const CATEGORIES = ["typography", "color_palette", "photography_style", "voice_and_tone", "general"];

export function GuidelineUploadForm({ brandId }: { brandId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await uploadGuideline(brandId, formData);
        formRef.current?.reset();
        setFileName(null);
        setSuccess(true);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <Card>
      <p className="section-label text-sm">Add a guideline</p>
      <p className="mt-1 text-sm text-foreground-muted">
        Give the AI something to read for this brand: upload a file, type notes, or both.
      </p>

      <form ref={formRef} action={handleSubmit} className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="guideline-title" className="section-label text-xs">
            Title <span className="text-foreground-muted">(optional)</span>
          </label>
          <input
            id="guideline-title"
            name="title"
            placeholder="e.g. 2026 Brand Book"
            className="rounded-xl border border-hairline bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="guideline-category" className="section-label text-xs">
            Category
          </label>
          <select
            id="guideline-category"
            name="category"
            defaultValue="general"
            className="rounded-xl border border-hairline bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="guideline-file" className="section-label text-xs">
            File <span className="text-foreground-muted">(PDF, DOCX, image, or text — optional)</span>
          </label>
          <div className="flex items-center gap-2">
            <label
              htmlFor="guideline-file"
              className="cursor-pointer rounded-full border border-hairline bg-surface px-4 py-1.5 text-sm font-semibold hover:bg-surface-raised"
            >
              Choose file
            </label>
            <input
              id="guideline-file"
              name="file"
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md,image/*"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
            <span className="text-sm text-foreground-muted">{fileName ?? "No file chosen"}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="guideline-notes" className="section-label text-xs">
            Notes{" "}
            <span className="text-foreground-muted">
              (required if no file — for a file, notes add context the AI can&apos;t read from it, like an image)
            </span>
          </label>
          <textarea
            id="guideline-notes"
            name="notes"
            rows={3}
            placeholder="e.g. Always use pastel hex codes: #F5C6D6, #C6E2F5. Never mix in bold primary colors."
            className="rounded-xl border border-hairline bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-accent">Guideline added.</p>}

        <Button type="submit" disabled={isPending} className="self-start">
          {isPending ? "Adding…" : "Add guideline"}
        </Button>
      </form>
    </Card>
  );
}
