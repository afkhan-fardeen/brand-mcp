import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
          Isolate a new brand&apos;s assets so the AI never mixes it with another brand.
        </p>
        <Button className="mt-4">Create brand workspace</Button>
      </Card>
    </div>
  );
}
