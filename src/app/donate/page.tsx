
"use client";

import PageHeader from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode } from "lucide-react";
import Image from 'next/image';

export default function DonatePage() {
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
                        {/* 
                          Instructions: 
                          1. Get your QR code image from your UPI app.
                          2. Name it 'my-qr-code.png'.
                          3. Place it inside the 'public' folder at the root of your project.
                          The image will then appear here automatically.
                        */}
                        <Image
                            src="/my-qr-code.png"
                            alt="Donation QR Code"
                            width={256}
                            height={256}
                            data-ai-hint="qr code"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
