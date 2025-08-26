
"use client";

import { useContext, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppStateContext, AppStateProvider } from "@/context/app-state-provider";
import AppShell from "./app-shell";
import { Loader2 } from "lucide-react";

const publicPaths = ['/login', '/register'];

function ConditionalLayout({ children }: { children: React.ReactNode }) {
    const { user, isAuthLoading } = useContext(AppStateContext);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isAuthLoading) {
            return; // Wait until authentication check is complete
        }

        const isPublicPath = publicPaths.includes(pathname);

        if (!user && !isPublicPath) {
            router.replace('/login');
        } else if (user && isPublicPath) {
            // If user is logged in and on a public path, go to a default authed page
            router.replace('/'); 
        }
    }, [user, isAuthLoading, pathname, router]);


    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    const isPublicPath = publicPaths.includes(pathname);
    
    // If we are on a public path and not authed, don't wrap in AppShell.
    if (isPublicPath && !user) {
        return <div className="h-screen">{children}</div>;
    }

    // If a user is logged in and on a protected path, show the AppShell.
    if (user && !isPublicPath) {
        return <AppShell>{children}</AppShell>;
    }
    
    // Fallback for edge cases, like being on a public path while logged in (will be redirected).
    // Or, initial load where user is null but path is not public yet.
    return (
        <div className="flex items-center justify-center h-screen bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
      <AppStateProvider>
        <ConditionalLayout>
            {children}
        </ConditionalLayout>
      </AppStateProvider>
  );
}
