"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function McpUrlBadge({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — the URL is still visible to select and copy manually
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="section-label text-xs">MCP URL for this brand</p>
      <div className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1.5">
        <code className="truncate text-xs text-foreground-muted">{url}</code>
        <Button type="button" variant="ghost" size="sm" onClick={copy} className="shrink-0">
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-xs text-foreground-muted">
        Paste this into Claude/Gemini&apos;s MCP connector settings with an{" "}
        <code>Authorization: Bearer &lt;MCP_SERVER_SECRET&gt;</code> header.
      </p>
    </div>
  );
}
