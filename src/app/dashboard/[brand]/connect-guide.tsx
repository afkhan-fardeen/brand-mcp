"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ClientId = "claude" | "claude-desktop" | "cursor" | "gemini" | "curl";

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — the snippet is still visible to select and copy manually
    }
  }

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl border border-hairline bg-surface p-3 text-xs">
        <code>{code}</code>
      </pre>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={copy}
        className="absolute top-2 right-2"
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export function ConnectGuide({ mcpUrl, slug }: { mcpUrl: string; slug: string }) {
  const [tab, setTab] = useState<ClientId>("claude");
  const serverKey = `brand-mcp-${slug}`;

  const tabs: { id: ClientId; label: string }[] = [
    { id: "claude", label: "Claude (web/desktop)" },
    { id: "claude-desktop", label: "Claude Desktop (config)" },
    { id: "cursor", label: "Cursor" },
    { id: "gemini", label: "Gemini CLI" },
    { id: "curl", label: "Test with curl" },
  ];

  return (
    <Card>
      <p className="section-label text-sm">Connect an AI client</p>
      <p className="mt-1 text-sm text-foreground-muted">
        Every option below points at this brand&apos;s own MCP URL, so the AI only ever sees{" "}
        {slug}&apos;s data. Replace <code>YOUR_MCP_SERVER_SECRET</code> with the{" "}
        <code>MCP_SERVER_SECRET</code> value from this project&apos;s environment variables.
      </p>

      <div className="mt-4 flex flex-wrap gap-1 border-b border-hairline pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              tab === t.id ? "bg-accent text-accent-foreground" : "text-foreground-muted hover:bg-surface",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "claude" && (
          <div className="flex flex-col gap-3 text-sm">
            <ol className="list-decimal space-y-1.5 pl-4 text-foreground-muted">
              <li>In Claude, go to Settings → Connectors → Add custom connector.</li>
              <li>
                Paste the MCP URL: <code className="text-foreground">{mcpUrl}</code>
              </li>
              <li>
                Under Advanced settings, add a header named <code>Authorization</code> with
                value <code>Bearer YOUR_MCP_SERVER_SECRET</code>.
              </li>
              <li>Save, then enable this connector in a chat to use its tools.</li>
            </ol>
          </div>
        )}

        {tab === "claude-desktop" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-foreground-muted">
              Older Claude Desktop versions need a local stdio bridge. Add this to{" "}
              <code>claude_desktop_config.json</code> (macOS:{" "}
              <code>~/Library/Application Support/Claude/</code>, Windows:{" "}
              <code>%APPDATA%\Claude\</code>), then restart Claude Desktop.
            </p>
            <CopyBlock
              code={`{
  "mcpServers": {
    "${serverKey}": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote", "${mcpUrl}",
        "--header", "Authorization:Bearer \${MCP_SERVER_SECRET}"
      ],
      "env": { "MCP_SERVER_SECRET": "YOUR_MCP_SERVER_SECRET" }
    }
  }
}`}
            />
          </div>
        )}

        {tab === "cursor" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-foreground-muted">
              Add this to <code>.cursor/mcp.json</code> in your project (or the global Cursor
              MCP settings), then reload Cursor.
            </p>
            <CopyBlock
              code={`{
  "mcpServers": {
    "${serverKey}": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_SERVER_SECRET"
      }
    }
  }
}`}
            />
          </div>
        )}

        {tab === "gemini" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-foreground-muted">
              Add this to <code>.gemini/settings.json</code> (project) or{" "}
              <code>~/.gemini/settings.json</code> (global).
            </p>
            <CopyBlock
              code={`{
  "mcpServers": {
    "${serverKey}": {
      "httpUrl": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_SERVER_SECRET"
      }
    }
  }
}`}
            />
          </div>
        )}

        {tab === "curl" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-foreground-muted">
              Sanity-check the connection before wiring it into a client:
            </p>
            <CopyBlock
              code={`curl -X POST ${mcpUrl} \\
  -H "Authorization: Bearer YOUR_MCP_SERVER_SECRET" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`}
            />
            <p className="text-xs text-foreground-muted">
              A working connection returns a <code>tools/list</code> result listing
              get_brand_guidelines, get_layout_rules, and search_product_assets.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
