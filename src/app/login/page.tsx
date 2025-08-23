
"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppStateContext } from "@/context/app-state-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { getTotalUserCount } from "@/app/register/actions";

const LoginIllustration = () => (
    <div className="hidden lg:flex items-center justify-center h-full bg-primary/5 p-8">
        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-md">
            <g transform="translate(0, 512) scale(0.1, -0.1)" fill="hsl(var(--primary))">
                <path d="M2230 4640 c-214 -63 -398 -201 -524 -392 -100 -150 -155 -320 -166 -518 l-5 -100 -620 0 -620 0 0 -1310 0 -1310 620 0 620 0 0 -225 c0 -211 4 -230 50 -287 90 -111 236 -174 416 -180 101 -3 144 -8 200 -23 150 -40 285 -120 395 -233 223 -229 329 -515 329 -917 0 -151 -10 -285 -29 -392 -88 -485 -451 -848 -933 -933 -107 -19 -241 -29 -392 -29 -400 0 -786 156 -1092 443 l-128 119 -90 -90 c-50 -49 -93 -90 -95 -90 -3 0 -58 48 -123 107 -193 175 -317 400 -365 663 -28 152 -28 448 0 600 48 263 172 488 365 663 65 59 120 107 123 107 2 0 45 -41 95 -90 l90 -90 128 119 c306 287 692 443 1092 443 151 0 285 -10 392 -29 482 -85 845 -448 933 -933 19 -107 29 -241 29 -392 0 -402 -106 -688 -329 -917 -110 -113 -245 -193 -395 -233 -56 -15 -99 -20 -200 -23 -180 -6 -326 67 -416 180 -46 57 -50 76 -50 287 l0 225 620 0 620 0 0 1310 0 1310 -620 0 -620 0 5 100 c11 198 66 368 166 518 126 191 310 329 524 392 119 35 272 47 420 32 103 -11 228 -50 330 -105 l55 -30 65 52 c162 130 388 238 584 280 142 31 346 32 480 3z"/>
            </g>
        </svg>
    </div>
);

export default function LoginPage() {
    const { user, handleGoogleSignIn, isAuthLoading } = useContext(AppStateContext);
    const router = useRouter();
    const [userCount, setUserCount] = useState<number | null>(null);

    useEffect(() => {
        if (user) {
            router.replace('/school-routine');
        }
    }, [user, router]);
    
    useEffect(() => {
        const fetchCount = async () => {
            const count = await getTotalUserCount();
            setUserCount(count);
        };
        fetchCount();
    }, []);

    return (
        <div className="grid lg:grid-cols-2 min-h-screen bg-background">
            <LoginIllustration />
            <div className="flex items-center justify-center p-4">
                <Card className="w-full max-w-sm shadow-xl">
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
                    <CardContent className="space-y-4">
                        <Button onClick={handleGoogleSignIn} disabled={isAuthLoading} className="w-full" size="lg">
                            {isAuthLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.2 173.4 58.2L339.2 144c-22.1-21.2-53.1-34.3-88.6-34.3-73.2 0-133.1 61.2-133.1 136.3s59.9 136.3 133.1 136.3c81.5 0 115.7-61.2 119.3-91.8H248v-68.6h239.2c1.4 8.7 2.8 17.5 2.8 26.8z"></path></svg>
                            )}
                            Sign in with Google
                        </Button>
                         {userCount !== null && userCount > 0 && (
                            <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>Join {userCount}+ school admins & teachers</span>
                            </div>
                        )}
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
        </div>
    );
}
