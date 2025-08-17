
"use client";

import { useContext, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppStateContext } from "@/context/app-state-provider";
import AppShell from "./app-shell";
import { Loader2 } from "lucide-react";

const publicPaths = ['/login'];

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
            router.replace('/');
        }
    }, [user, isAuthLoading, pathname, router]);


    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    // If we are on a public path (like /login), don't wrap it in the AppShell
    if (publicPaths.includes(pathname)) {
        return <>{children}</>;
    }

    // If a user is logged in and on a protected path, show the AppShell
    if (user) {
        return <AppShell>{children}</AppShell>;
    }
    
    // Fallback for edge cases, might show a flicker of the loader
    return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
      <ConditionalLayout>
          {children}
      </ConditionalLayout>
  );
}
