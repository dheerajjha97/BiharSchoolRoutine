
"use client";

import { useContext } from "react";
import { AppStateContext } from "@/context/app-state-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { DayOfWeek } from "@/types";

const allDaysOfWeek: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function GeneralSettingsPage() {
    const { appState, updateConfig } = useContext(AppStateContext);
    const { config, timeSlots } = appState;

    const handleWorkingDayChange = (day: DayOfWeek, checked: boolean) => {
        let newWorkingDays = [...config.workingDays];
        if (checked) {
            if (!newWorkingDays.includes(day)) {
                newWorkingDays.push(day);
            }
        } else {
            newWorkingDays = newWorkingDays.filter(d => d !== day);
        }
        newWorkingDays.sort((a, b) => allDaysOfWeek.indexOf(a) - allDaysOfWeek.indexOf(b));
        updateConfig('workingDays', newWorkingDays);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>General Scheduling Rules</CardTitle>
                    <CardDescription>
                        Set the basic rules that apply to the entire routine generation process.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Working Days</Label>
                        <p className="text-xs text-muted-foreground">Select the days your school is open for classes.</p>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg border p-4">
                            {allDaysOfWeek.map(day => (
                                <div key={day} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`day-${day}`}
                                        checked={config.workingDays.includes(day)}
                                        onCheckedChange={(checked) => handleWorkingDayChange(day, !!checked)}
                                    />
                                    <Label htmlFor={`day-${day}`} className="font-normal">{day}</Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="daily-period-quota">Max Periods Per Teacher Per Day</Label>
                            <Select
                                value={String(config.dailyPeriodQuota)}
                                onValueChange={(value) => updateConfig('dailyPeriodQuota', Number(value))}
                            >
                                <SelectTrigger id="daily-period-quota">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[...Array(5).keys()].map(i => <SelectItem key={i+4} value={String(i+4)}>{i+4}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div>
                            <Label>Prevent Consecutive Periods</Label>
                             <div className="flex items-center space-x-2 h-10">
                                <Checkbox
                                id="prevent-consecutive"
                                checked={config.preventConsecutiveClasses}
                                onCheckedChange={(checked) => updateConfig('preventConsecutiveClasses', !!checked)}
                                />
                                <Label htmlFor="prevent-consecutive" className="font-normal text-muted-foreground text-sm">
                                Prevent teachers having 3+ periods in a row.
                                </Label>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Breaks (Prayer & Lunch)</CardTitle>
                    <CardDescription>
                        Select the time slots that should be reserved for school-wide breaks.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <Label>Prayer Period</Label>
                        <Select value={config.prayerTimeSlot} onValueChange={(v) => updateConfig('prayerTimeSlot', v === 'none' ? '' : v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Prayer Time Slot" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Lunch Period</Label>
                        <Select value={config.lunchTimeSlot} onValueChange={(v) => updateConfig('lunchTimeSlot', v === 'none' ? '' : v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Lunch Time Slot" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
