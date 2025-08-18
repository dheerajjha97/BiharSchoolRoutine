
"use client";

import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppStateContext } from "@/context/app-state-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogIn } from "lucide-react";
import { Logo } from "@/components/icons";

export default function LoginPage() {
    const { user, handleGoogleSignIn, isAuthLoading } = useContext(AppStateContext);
    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.replace('/');
        }
    }, [user, router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-sm mx-4 shadow-xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <Logo className="h-8 w-8 text-primary" />
                        <CardTitle className="text-3xl font-bold">School Routine</CardTitle>
                    </div>
                    <CardDescription>
                        Please sign in to manage or view your school's schedule.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGoogleSignIn} disabled={isAuthLoading} className="w-full" size="lg">
                        {isAuthLoading ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.2 173.4 58.2L339.2 144c-22.1-21.2-53.1-34.3-88.6-34.3-73.2 0-133.1 61.2-133.1 136.3s59.9 136.3 133.1 136.3c81.5 0 115.7-61.2 119.3-91.8H248v-68.6h239.2c1.4 8.7 2.8 17.5 2.8 26.8z"></path></svg>
                        )}
                        Sign in with Google
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
