
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useContext, useState, useMemo, useEffect } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/icons";
import { useTheme } from "next-themes";
import {
  Menu,
  LayoutDashboard,
  Database,
  SlidersHorizontal,
  LogOut,
  Loader2,
  Moon,
  Sun,
  Mail,
  ClipboardCheck,
  Replace,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/data", label: "Data Management", icon: Database },
  { href: "/config", label: "Configuration", icon: SlidersHorizontal },
  { href: "/adjustments", label: "Adjustments", icon: Replace },
  { href: "/reports", label: "Exams & Reports", icon: ClipboardCheck },
];

const teacherNavItems = [
    { href: "/", label: "Teacher Routine", icon: ClipboardList },
    { href: "/school-routine", label: "Final School Routine", icon: CalendarDays },
];

function ThemeToggle() {
    const { setTheme, theme } = useTheme();

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const {
    appState,
    user,
    handleLogout,
    isAuthLoading,
    isSyncing,
    isLoading,
  } = useContext(AppStateContext);

  const { loggedInTeacher, isUserAdmin } = useMemo(() => {
    if (isLoading || isAuthLoading || !user || !appState.teachers) {
        return { loggedInTeacher: undefined, isUserAdmin: false };
    }
    const teacher = appState.teachers.find(t => t.email === user.email);
    const isAdmin = !teacher; 
    return { loggedInTeacher: teacher, isUserAdmin: isAdmin };
  }, [isLoading, isAuthLoading, user, appState.teachers]);

  useEffect(() => {
    if (isAuthLoading || isLoading) return;
    
    if (isUserAdmin && !appState.schoolInfo.udise && pathname !== '/data') {
        router.replace('/data');
    }
  }, [isAuthLoading, isLoading, isUserAdmin, appState.schoolInfo.udise, pathname, router]);


  const navItems = isUserAdmin ? adminNavItems : teacherNavItems;
  const displayName = loggedInTeacher ? loggedInTeacher.name : user?.displayName;

  const authControls = !user ? null : (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {isSyncing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Syncing...</span>
          </div>
        )}
        <ThemeToggle />
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.photoURL || undefined} alt={displayName || user.email || 'User'} />
          <AvatarFallback>{displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
        </Avatar>
        <Button variant="outline" size="sm" onClick={handleLogout} disabled={isAuthLoading}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  const userProfileSection = !user ? null : (
    <div className="p-4">
      <Separator className="my-2" />
      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary">
        <Avatar className="h-9 w-9">
          <AvatarImage src={user.photoURL || undefined} alt={displayName || user.email || 'User'} />
          <AvatarFallback>{displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col text-sm">
          <span className="font-semibold text-foreground">{displayName}</span>
          <span className="text-muted-foreground truncate max-w-[180px]">{user.email}</span>
        </div>
      </div>
    </div>
  );
  
  const creditSection = (
      <div className="p-4 text-xs text-muted-foreground space-y-2">
        <Separator className="my-2" />
        <p className="text-center">Created by Dheeraj Jha</p>
         <Button asChild variant="outline" size="sm" className="w-full">
              <a href="mailto:dheerajjha.brgovt@gmail.com?subject=Feedback for School Routine App">
                  <Mail className="mr-2 h-4 w-4" /> Send Feedback
              </a>
          </Button>
      </div>
  );

  const renderNavItems = () => {
    if (isLoading || isAuthLoading) {
        return (
            <div className="flex justify-center items-center h-full p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }
    
    if (!user) {
        return null;
    }

    return (
         <nav className="grid items-start text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsSheetOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:text-primary",
                pathname === item.href && "bg-primary/10 text-primary font-semibold"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
    );
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4 pt-0">
       {renderNavItems()}
      </div>
      <div className="mt-auto">
        {creditSection}
        {userProfileSection}
      </div>
    </div>
  );

  const mobileSidebarContent = (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b p-4">
        <SheetTitle>
          <Link href="/" onClick={() => setIsSheetOpen(false)} className="flex items-center gap-2 font-semibold">
            <Logo className="h-6 w-6 text-primary" />
            <span>School Routine</span>
          </Link>
        </SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto py-2 px-4">
        {renderNavItems()}
      </div>
       <div className="mt-auto">
         {creditSection}
         {userProfileSection}
       </div>
    </div>
  );
  
  if (isAuthLoading) {
     return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
     );
  }

  return (
    <div className="flex flex-col h-screen bg-secondary">
      <header className="flex h-16 w-full items-center gap-4 border-b bg-card px-6 no-print shrink-0">
        <div className="flex items-center gap-4 lg:hidden">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              {mobileSidebarContent}
            </SheetContent>
          </Sheet>
        </div>
        <div className="hidden lg:block">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
            <Logo className="h-6 w-6 text-primary" />
            <span>School Routine</span>
          </Link>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {authControls}
        </div>
      </header>
      <div className="flex-1 w-full overflow-x-auto">
        <div className="grid min-h-full lg:grid-cols-[280px_1fr]">
          <div className="hidden border-r bg-card text-card-foreground lg:flex lg:flex-col no-print">
            {sidebarContent}
          </div>
          <main className="flex-1 bg-background p-4 md:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

    