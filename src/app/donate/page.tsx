
"use client";

import PageHeader from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, QrCode } from "lucide-react";
import Image from 'next/image';

export default function DonatePage() {
    const { toast } = useToast();
    const upiId = "your-upi-id@okhdfcbank"; // Replace with your actual UPI ID

    const handleCopy = () => {
        navigator.clipboard.writeText(upiId).then(() => {
            toast({
                title: "UPI ID Copied!",
                description: "You can now paste it in your payment app.",
            });
        }).catch(err => {
            toast({
                variant: "destructive",
                title: "Failed to copy",
                description: "Could not copy UPI ID to clipboard.",
            });
        });
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <PageHeader
                title="Support Our Work"
                description="Your contribution helps us maintain and improve this application for schools across Bihar."
            />

            <Card className="max-w-md mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <QrCode className="h-6 w-6 text-primary" />
                        Scan to Donate
                    </CardTitle>
                    <CardDescription>
                        Use any UPI-enabled app like Google Pay, PhonePe, or Paytm to scan the QR code below.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6">
                    <div className="p-4 border rounded-lg bg-white">
                        <Image
                            src="https://placehold.co/256x256.png"
                            alt="Donation QR Code"
                            width={256}
                            height={256}
                            data-ai-hint="qr code"
                        />
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">Or use our UPI ID</p>
                        <div className="flex items-center gap-2 p-2 border rounded-md bg-secondary">
                            <span className="font-mono text-secondary-foreground">{upiId}</span>
                            <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8">
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
