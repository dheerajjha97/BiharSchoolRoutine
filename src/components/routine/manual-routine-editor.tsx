
"use client";

import { useState } from "react";
import type { ScheduleEntry } from "@/ai/flows/generate-schedule";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";

interface ManualRoutineEditorProps {
  teachers: string[];
  classes: string[];
  subjects: string[];
  timeSlots: string[];
  schedule: ScheduleEntry[];
  onScheduleChange: (newSchedule: ScheduleEntry[]) => void;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ManualRoutineEditor({
  teachers,
  classes,
  subjects,
  timeSlots,
  schedule,
  onScheduleChange,
}: ManualRoutineEditorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentCell, setCurrentCell] = useState<{ day: string; timeSlot: string } | null>(null);
  const [cellData, setCellData] = useState<{ subject: string; className: string; teacher: string }>({
    subject: "",
    className: "",
    teacher: "",
  });

  const handleCellClick = (day: string, timeSlot: string) => {
    setCurrentCell({ day, timeSlot });
    const existingEntry = schedule.find(
      (e) => e.day === day && e.timeSlot === timeSlot
    );
    if (existingEntry) {
      setCellData({
        subject: existingEntry.subject,
        className: existingEntry.className,
        teacher: existingEntry.teacher,
      });
    } else {
      setCellData({ subject: "", className: "", teacher: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!currentCell) return;

    const newSchedule = schedule.filter(
      (e) => !(e.day === currentCell.day && e.timeSlot === currentCell.timeSlot)
    );

    if (cellData.subject && cellData.className && cellData.teacher) {
      newSchedule.push({
        day: currentCell.day,
        timeSlot: currentCell.timeSlot,
        ...cellData,
      });
    }

    onScheduleChange(newSchedule);
    setIsDialogOpen(false);
    setCurrentCell(null);
  };

  const handleDelete = () => {
     if (!currentCell) return;
     const newSchedule = schedule.filter(
        (e) => !(e.day === currentCell.day && e.timeSlot === currentCell.timeSlot)
      );
      onScheduleChange(newSchedule);
      setIsDialogOpen(false);
      setCurrentCell(null);
  }

  const renderCellContent = (day: string, timeSlot: string) => {
    const entries = schedule.filter(e => e.day === day && e.timeSlot === timeSlot);
    if (entries.length === 0) return <div className="h-10"></div>;

    return (
      <div className="space-y-1">
        {entries.map((entry, index) => (
          <div key={index} className="text-xs text-center p-1 bg-muted/50 rounded">
            <div className="font-semibold">{entry.subject}</div>
            <div className="text-muted-foreground">{entry.className}</div>
            <div className="text-muted-foreground">{entry.teacher}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="mt-4 p-4 border rounded-lg">
        <p className="text-sm text-center text-muted-foreground mb-4">Click on a cell to manually add or edit a class.</p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                {daysOfWeek.map((day) => (
                  <TableHead key={day} className="text-center">{day}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeSlots.map((slot) => (
                <TableRow key={slot}>
                  <TableCell className="font-medium align-top min-w-[120px]">{slot}</TableCell>
                  {daysOfWeek.map((day) => (
                    <TableCell
                      key={`${day}-${slot}`}
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => handleCellClick(day, slot)}
                    >
                      {renderCellContent(day, slot)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Schedule Slot</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">Subject</Label>
              <Select
                value={cellData.subject}
                onValueChange={(value) => setCellData({ ...cellData, subject: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="className" className="text-right">Class</Label>
               <Select
                value={cellData.className}
                onValueChange={(value) => setCellData({ ...cellData, className: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="teacher" className="text-right">Teacher</Label>
              <Select
                value={cellData.teacher}
                onValueChange={(value) => setCellData({ ...cellData, teacher: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="N/A">N/A</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="destructive" onClick={handleDelete} className="gap-1">
              <Trash2 /> Delete
            </Button>
            <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" onClick={handleSave}>Save changes</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    