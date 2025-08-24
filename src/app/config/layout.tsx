
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PageHeader from "@/components/app/page-header";
import { cn } from "@/lib/utils";

const sidebarNavItems = [
  { title: "General", href: "/config/general" },
  { title: "Teachers & Classes", href: "/config/teachers" },
  { title: "Curriculum", href: "/config/curriculum" },
  { title: "Exceptions", href: "/config/exceptions" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6 p-6">
       <PageHeader 
            title="Configuration"
            description="Fine-tune the logic for the routine generation to meet your school's specific needs."
        />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
        <aside className="md:col-span-1">
          <nav className="flex flex-col space-y-2">
            {sidebarNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium",
                  pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="md:col-span-4">
          {children}
        </main>
      </div>
    </div>
  );
}
