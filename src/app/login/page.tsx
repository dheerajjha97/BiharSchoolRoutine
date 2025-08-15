
"use client";

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppStateContext } from '@/context/app-state-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn, User, UserCog } from 'lucide-react';
import { Logo } from '@/components/icons';

export default function LoginPage() {
    const { user, handleGoogleSignIn, isAuthLoading, isLoading } = useContext(AppStateContext);
    const router = useRouter();

    useEffect(() => {
        if (user && !isLoading) {
            router.replace('/');
        }
    }, [user, isLoading, router]);
    
    if (isLoading || isAuthLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    // If user is already logged in (but maybe data is still loading), don't show login page
    if (user) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }


    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-secondary p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4">
                        <Logo className="h-12 w-12 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Welcome to School Routine</CardTitle>
                    <CardDescription>Please sign in with your Google account to continue.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button 
                        size="lg" 
                        className="w-full" 
                        onClick={handleGoogleSignIn} 
                        disabled={isAuthLoading}
                    >
                        {isAuthLoading ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <UserCog className="mr-2 h-5 w-5" />
                        )}
                        Admin Login
                    </Button>
                    <Button 
                        size="lg" 
                        className="w-full" 
                        variant="outline"
                        onClick={handleGoogleSignIn} 
                        disabled={isAuthLoading}
                    >
                         {isAuthLoading ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <User className="mr-2 h-5 w-5" />
                        )}
                        Teacher Login
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
