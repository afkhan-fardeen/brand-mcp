"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function McpUrlBadge({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/api/mcp/${slug}`;

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — the path is still visible to copy manually
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1.5">
      <code className="text-xs text-foreground-muted">{path}</code>
      <Button type="button" variant="ghost" size="sm" onClick={copy}>
        {copied ? "Copied" : "Copy MCP URL"}
      </Button>
    </div>
  );
}
