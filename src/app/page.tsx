import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-surface px-6 text-center">
      <p className="title text-4xl">BrandHub</p>
      <p className="max-w-md text-foreground-muted">
        The multi-brand knowledge base and MCP server behind your AI-generated,
        product-accurate e-commerce assets.
      </p>
      <Link href="/dashboard">
        <Button size="lg">Open dashboard</Button>
      </Link>
    </div>
  );
}
