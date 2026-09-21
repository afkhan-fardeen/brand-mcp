import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createBrand } from "./actions";

export default function DashboardHome() {
  return (
    <div className="max-w-2xl">
      <h1 className="title text-3xl">Welcome back</h1>
      <p className="mt-2 text-foreground-muted">
        Pick a brand workspace from the sidebar, or create a new one to start uploading
        guidelines, campaigns, layout rules, and product cutouts.
      </p>
      <Card className="mt-8">
        <p className="section-label text-sm">New workspace</p>
        <p className="mt-1 text-sm text-foreground-muted">
          Isolates this brand&apos;s assets and gives it its own dedicated MCP URL, so the
          AI can never mix it up with another brand.
        </p>
        <form action={createBrand} className="mt-4 flex gap-2">
          <input
            name="name"
            required
            placeholder="Brand name, e.g. Seissense"
            className="flex-1 rounded-xl border border-hairline bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <Button type="submit">Create</Button>
        </form>
      </Card>
    </div>
  );
}
