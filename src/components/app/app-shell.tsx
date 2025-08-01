
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext, useState } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Menu,
  BookOpenCheck,
  LayoutDashboard,
  Database,
  SlidersHorizontal,
  LogIn,
  LogOut,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/data", label: "Data Management", icon: Database },
  { href: "/config", label: "Configuration", icon: SlidersHorizontal },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const {
    user,
    handleGoogleSignIn,
    handleLogout,
    isAuthLoading,
    isSyncing,
  } = useContext(AppStateContext);

  const authControls = (
    <div className="flex items-center gap-4">
      {isSyncing && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {user ? (
        <>
          <Avatar>
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
            <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm" onClick={handleLogout} disabled={isAuthLoading}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </>
      ) : (
        <Button onClick={handleGoogleSignIn} disabled={isAuthLoading}>
          {isAuthLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="mr-2 h-4 w-4" />
          )}
          Login with Google
        </Button>
      )}
    </div>
  );

  const userProfileSection = user ? (
    <div className="mt-auto p-4">
      <Separator className="my-4" />
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
          <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col text-sm">
          <span className="font-semibold text-card-foreground">{user.displayName}</span>
          <span className="text-muted-foreground truncate">{user.email}</span>
        </div>
      </div>
    </div>
  ) : null;

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4 pt-0">
        <nav className="grid items-start text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsSheetOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                pathname === item.href && "bg-muted text-primary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      {userProfileSection}
    </div>
  );

  const mobileSidebarContent = (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b p-4">
        <SheetTitle>
          <Link href="/" onClick={() => setIsSheetOpen(false)} className="flex items-center gap-2 font-semibold">
            <BookOpenCheck className="h-6 w-6 text-primary" />
            <span>BiharSchoolRoutine</span>
          </Link>
        </SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto py-2">
        <nav className="grid items-start px-4 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsSheetOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                pathname === item.href && "bg-muted text-primary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
       {userProfileSection}
    </div>
  );

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-16 w-full items-center gap-4 border-b bg-card px-6 no-print shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold lg:hidden">
            <BookOpenCheck className="h-6 w-6 text-primary" />
            <span className="sr-only">BiharSchoolRoutine</span>
          </Link>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              {mobileSidebarContent}
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex-1">
          <h1 className="font-semibold text-lg">
            {navItems.find(item => item.href === pathname)?.label || 'Dashboard'}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {authControls}
        </div>
      </header>
      <div className="flex-1 w-full overflow-x-auto">
        <div className="grid min-h-full lg:grid-cols-[280px_1fr] min-w-[1200px]">
          <div className="hidden border-r bg-card text-card-foreground lg:flex lg:flex-col no-print">
            <div className="flex h-16 items-center border-b px-6">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <BookOpenCheck className="h-6 w-6 text-primary" />
                <span>BiharSchoolRoutine</span>
              </Link>
            </div>
            {sidebarContent}
          </div>
          <main className="flex-1 bg-background p-4 md:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
