
"use client";

import { useContext } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NotebookText } from "lucide-react";

export default function HolidaysPage() {
    const { appState } = useContext(AppStateContext);
    const { holidays = [], schoolInfo } = appState;

    const formattedHolidays = holidays.map(h => ({
        ...h,
        formattedDate: new Date(h.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC' // Important to avoid timezone off-by-one errors
        }),
        dayOfWeek: new Date(h.date).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
    }));

    return (
        <div className="space-y-6">
            <PageHeader
                title="Academic Calendar & Holidays"
                description={`View the list of approved holidays for ${schoolInfo.name || 'the school'}.`}
            />

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <NotebookText className="h-6 w-6 text-primary" />
                        <CardTitle>Holiday List</CardTitle>
                    </div>
                     <CardDescription>
                        These days are considered non-working for academic planning and substitutions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px]">Date</TableHead>
                                    <TableHead>Day</TableHead>
                                    <TableHead>Holiday Name</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {formattedHolidays.length > 0 ? (
                                    formattedHolidays.map((holiday) => (
                                        <TableRow key={holiday.date}>
                                            <TableCell className="font-medium">{holiday.formattedDate}</TableCell>
                                            <TableCell>{holiday.dayOfWeek}</TableCell>
                                            <TableCell>{holiday.name}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                            No holidays have been added yet. The admin can add them in the Data Management section.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
