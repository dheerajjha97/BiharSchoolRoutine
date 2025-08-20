
"use client";

import { useContext, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppStateContext } from "@/context/app-state-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogIn } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
                    <div className="flex justify-center items-center mb-4">
                        <svg 
                            className="w-24 h-24 text-primary"
                            viewBox="0 0 24 24" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            <path d="M4 21V9.5L12 3L20 9.5V21H14V14H10V21H4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 6C12.5523 6 13 6.44772 13 7V8C13 8.55228 12.5523 9 12 9C11.4477 9 11 8.55228 11 8V7C11 6.44772 11.4477 6 12 6Z" fill="currentColor"/>
                            <path d="M12 9L14 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <CardTitle className="text-3xl font-bold">School Routine</CardTitle>
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
                <CardFooter className="flex flex-col text-sm text-center">
                    <Separator className="my-4" />
                    <p className="text-muted-foreground">New school? 
                        <Link href="/register" className="font-semibold text-primary hover:underline ml-1">
                            Register as Admin
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
