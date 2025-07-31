
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext, useState } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Menu,
  BookOpenCheck,
  LayoutDashboard,
  Database,
  SlidersHorizontal,
  Save,
  Printer,
  Trash2,
  FileDown,
  FileUp,
  FileCog,
  FolderCog,
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
    handleImportConfig, 
    handleSaveConfig,
    handleSaveBackup,
    handleImportBackup,
    handlePrint,
    handleClearRoutine
  } = useContext(AppStateContext);

  const fileMenuContent = (closeSheet?: () => void) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Save className="mr-2 h-4 w-4" /> File
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>Backup</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => { handleSaveBackup(); closeSheet?.(); }}>
          <FileDown className="mr-2 h-4 w-4" />
          <span>Save Backup</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { handleImportBackup(); closeSheet?.(); }}>
          <FileUp className="mr-2 h-4 w-4" />
          <span>Load Backup</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Configuration</DropdownMenuLabel>
         <DropdownMenuItem onClick={() => { handleSaveConfig(); closeSheet?.(); }}>
          <FileCog className="mr-2 h-4 w-4" />
          <span>Save Config Only</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { handleImportConfig(); closeSheet?.(); }}>
          <FolderCog className="mr-2 h-4 w-4" />
          <span>Load Config Only</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <BookOpenCheck className="h-6 w-6 text-primary" />
          <span>BiharSchoolRoutine</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
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
       <div className="mt-auto p-4 border-t">
        {fileMenuContent()}
      </div>
    </div>
  );
  
  const mobileSidebarContent = (
    <div className="flex h-full flex-col">
       <SheetHeader className="border-b">
        <SheetTitle className="p-6 pt-0">
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
       <div className="mt-auto p-4 border-t">
         {fileMenuContent(() => setIsSheetOpen(false))}
      </div>
    </div>
  );


  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card text-card-foreground lg:block no-print">
        {sidebarContent}
      </div>
      <div className="flex flex-col max-h-screen">
        <header className="flex h-auto min-h-16 items-center gap-4 border-b bg-card px-6 sticky top-0 z-30 no-print flex-wrap py-2">
          <div className="flex items-center gap-4 flex-1">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-0">
                 {mobileSidebarContent}
              </SheetContent>
            </Sheet>
             <div className="flex-1">
               <h1 className="font-semibold text-lg truncate">
                  {navItems.find(item => item.href === pathname)?.label || 'Dashboard'}
               </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
             <Button variant="outline" size="sm" onClick={handlePrint} >
              <Printer className="mr-2 h-4 w-4" /> Print All
            </Button>
             <Button variant="destructive" size="sm" onClick={handleClearRoutine}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear All
            </Button>
          </div>
        </header>
        <main className="flex-1 flex flex-col bg-background overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
