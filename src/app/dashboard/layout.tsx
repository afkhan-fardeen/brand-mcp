import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: brands } = await supabase.from("brands").select("id, name").order("name");

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-hairline bg-surface px-4 py-6">
        <p className="title px-2 text-lg">BrandHub</p>
        <p className="section-label px-2 pt-6 pb-2 text-xs uppercase tracking-wide text-foreground-muted">
          Workspaces
        </p>
        <nav className="flex flex-col gap-1">
          {brands?.map((brand) => (
            <Link
              key={brand.id}
              href={`/dashboard/${brand.id}`}
              className="rounded-xl px-3 py-2 text-sm hover:bg-surface-raised"
            >
              {brand.name}
            </Link>
          ))}
          {!brands?.length && (
            <p className="px-3 py-2 text-sm text-foreground-muted">No brands yet.</p>
          )}
        </nav>
      </aside>
      <main className="flex-1 px-10 py-8">{children}</main>
    </div>
  );
}
