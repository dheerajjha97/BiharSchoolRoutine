
"use client";

import { useContext, useMemo } from "react";
import PageHeader from "@/components/app/page-header";
import { AppStateContext } from "@/context/app-state-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, parseISO } from 'date-fns';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "lucide-react";
import type { Day } from "@/types";

const allDaysOfWeek: Day[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function HolidaysPage() {
    const { appState } = useContext(AppStateContext);
    const { holidays, config } = appState;

    const holidayDates = holidays.map(h => parseISO(h.date));
    
    const nonWorkingDaysIndexes = useMemo(() => {
        return allDaysOfWeek
            .map((day, index) => (config.workingDays.includes(day) ? -1 : index))
            .filter(index => index !== -1);
    }, [config.workingDays]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Academic Calendar"
                description="View the list of all official school holidays for the academic year."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="flex flex-col h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <span>Holiday List</span>
                        </CardTitle>
                        <CardDescription>All scheduled holidays.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <ScrollArea className="h-96 border rounded-md p-2">
                            <div className="space-y-2">
                                {holidays.length > 0 ? (
                                    holidays.map((holiday) => (
                                        <div key={holiday.date} className="flex items-center justify-between bg-secondary p-3 rounded-md text-sm">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{format(parseISO(holiday.date), "PPP")}</span>
                                                <span className="text-xs text-muted-foreground">{holiday.description}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-muted-foreground text-center py-10">No holidays have been added by the administrator yet.</div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
                <Card>
                     <CardHeader>
                        <CardTitle>Calendar View</CardTitle>
                        <CardDescription>Holidays and non-working days are marked in red.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <CalendarComponent
                            mode="multiple"
                            selected={holidayDates}
                            disabled={[{ dayOfWeek: nonWorkingDaysIndexes }]}
                            className="rounded-md border"
                            classNames={{
                                day_selected: "bg-destructive text-destructive-foreground hover:bg-destructive hover:text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground",
                                day_today: "bg-accent text-accent-foreground",
                                day_disabled: "bg-destructive/20 text-destructive-foreground",
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

    