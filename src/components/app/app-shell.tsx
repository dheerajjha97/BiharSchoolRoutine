
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext, useState } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import {
  Menu,
  Database,
  SlidersHorizontal,
  LogOut,
  Moon,
  Sun,
  Mail,
  ClipboardCheck,
  Replace,
  UserCheck,
  NotebookText,
  School,
  Settings,
  Heart,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "../icons";

const adminNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/school-routine", label: "Final Routine", icon: School },
  { href: "/data", label: "Data", icon: Database },
  { href: "/adjustments", label: "Adjustments", icon: Replace },
  { href: "/reports", label: "Exams", icon: ClipboardCheck },
  { href: "/holidays", label: "Holidays", icon: NotebookText },
];

const teacherNavItems = [
    { href: "/school-routine", label: "Final Routine", icon: School },
    { href: "/holidays", label: "Holidays", icon: NotebookText },
];

const commonNavItems = [
    { href: "/donate", label: "Donate", icon: Heart },
]

function ThemeToggle() {
    const { setTheme, theme } = useTheme();

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="text-muted-foreground hover:text-foreground"
        >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const {
    user,
    handleLogout,
    isUserAdmin,
    appState,
  } = useContext(AppStateContext);

  const navItems = isUserAdmin ? adminNavItems : teacherNavItems;
  const displayName = user?.displayName;

  const Brand = () => (
      <Link href="/" className="flex items-center gap-2 font-semibold text-lg" onClick={() => setIsSheetOpen(false)}>
        <Logo className="h-7 w-7 text-primary" />
        <span className="hidden lg:block">Bihar School Routine</span>
      </Link>
  );

  const userProfileSection = user ? (
    <div className="p-4 text-center">
      <Avatar className="h-16 w-16 mx-auto mb-2">
        <AvatarImage src={user.photoURL || undefined} alt={displayName || user.email || 'User'} />
        <AvatarFallback>{displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
      </Avatar>
      <h3 className="font-semibold text-lg">{displayName}</h3>
      <p className="text-sm text-muted-foreground">{isUserAdmin ? "Admin" : "Teacher"}</p>
    </div>
  ) : null;

  const renderNavItems = (isMobile: boolean) => {
    const allNavItems = [...navItems, ...commonNavItems];
    return (
      <nav className="flex flex-col gap-1 p-4">
        <p className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Menu</p>
        {allNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => isMobile && setIsSheetOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10",
              pathname === item.href && "bg-primary/10 text-primary font-bold",
              item.label === 'Donate' && "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    );
  };

  const sidebarFooter = (
      <div className="mt-auto p-4 space-y-2 border-t">
          {isUserAdmin && (
            <Link
              href="/config"
              onClick={() => setIsSheetOpen(false)}
              className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10",
                  pathname === "/config" && "bg-primary/10 text-primary font-bold"
              )}
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Link>
          )}
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-primary" onClick={handleLogout}>
              <LogOut className="mr-3 h-5 w-5" /> Logout
          </Button>
      </div>
  )

  const sidebarHeader = (
    <div className="flex h-16 items-center border-b px-6">
        <Brand />
    </div>
  );

  const sidebarContent = (
    <>
      {sidebarHeader}
      {userProfileSection}
      <Separator />
      {renderNavItems(false)}
      {sidebarFooter}
    </>
  );

  const mobileSidebarContent = (
     <>
      <SheetHeader className="border-b p-4">
        <SheetTitle>
          <Link href="/" onClick={() => setIsSheetOpen(false)} className="flex items-center gap-2 font-semibold">
            <Logo className="h-7 w-7 text-primary" />
            <span>Bihar School Routine</span>
          </Link>
        </SheetTitle>
      </SheetHeader>
      {userProfileSection}
      <Separator />
      <div className="flex-1 overflow-y-auto">
        {renderNavItems(true)}
      </div>
      {sidebarFooter}
    </>
  );


  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card lg:flex lg:flex-col">
        {sidebarContent}
      </div>
      <div className="flex flex-col">
         <header className="flex h-16 items-center gap-4 border-b bg-card px-6 lg:hidden">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-0 gap-0">
                {mobileSidebarContent}
              </SheetContent>
            </Sheet>
            <div className="flex-1">
                 <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
                    <Logo className="h-7 w-7" />
                </Link>
            </div>
            <ThemeToggle />
         </header>
         <main className="flex-1 flex flex-col overflow-auto bg-muted/40">
            {children}
        </main>
      </div>
    </div>
  );
}
