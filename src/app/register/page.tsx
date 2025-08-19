"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Terminal } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { generateAdminRegistrationCommand } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [udise, setUdise] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resultMessage, setResultMessage] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setResultMessage(null);

        const result = await generateAdminRegistrationCommand({ email, udise });

        if (result.success) {
            setResultMessage(result.message);
        } else {
            toast({
                variant: "destructive",
                title: "Validation Failed",
                description: result.message,
            });
        }
        setIsLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-md mx-4 shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold">Register Your School</CardTitle>
                    <CardDescription>
                        Create an admin account to start managing your school's routine.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Admin Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="principal@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="udise">School UDISE Code</Label>
                            <Input
                                id="udise"
                                type="text"
                                placeholder="Enter the 11-digit UDISE code"
                                required
                                value={udise}
                                onChange={(e) => setUdise(e.target.value)}
                                disabled={isLoading}
                                maxLength={11}
                                pattern="\d{11}"
                                title="UDISE code must be exactly 11 digits."
                            />
                        </div>
                        {resultMessage && (
                             <Alert>
                                <Terminal className="h-4 w-4" />
                                <AlertTitle>Command Generated</AlertTitle>
                                <AlertDescription>
                                    <pre className="mt-2 w-full text-sm whitespace-pre-wrap break-words rounded-md bg-secondary p-4 font-mono">
                                        {resultMessage}
                                    </pre>
                                     <p className="mt-2 text-xs text-muted-foreground">
                                        After running the command, the new admin can proceed to the login page.
                                    </p>
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button type="submit" disabled={isLoading} className="w-full">
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                "Generate Registration Command"
                            )}
                        </Button>
                        <Button variant="link" className="text-muted-foreground" asChild>
                             <Link href="/login">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Login
                            </Link>
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
