
// This file implements the Genkit flow for the generateSchedule story.
// It allows teachers to automatically generate a draft schedule based on teacher availability, subject priorities, and class requirements.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Note: This file is kept for type definitions but the AI flow is no longer used.
// The scheduling logic has been moved to a deterministic algorithm in /lib/schedule-generator.ts

const UnavailabilitySchema = z.object({
  teacher: z.string(),
  day: z.string(),
  timeSlot: z.string(),
});

export const GenerateScheduleInputSchema = z.object({
  teacherNames: z.array(z.string()).describe('List of teacher names.'),
  classes: z.array(z.string()).describe('List of classes.'),
  subjects: z.array(z.string()).describe('List of subjects.'),
  timeSlots: z.array(z.string()).describe('List of available time slots for the day (e.g., "09:00 - 10:00").'),
  unavailability: z.array(UnavailabilitySchema).describe('A list of specific time slots when a teacher is unavailable.'),
  subjectPriorities: z.record(z.string(), z.number()).describe('Subject priorities (higher number = higher priority).'),
  classRequirements: z.record(z.string(), z.array(z.string())).describe('Subjects required for each class.'),
  teacherSubjects: z.record(z.string(), z.array(z.string())).describe('Subjects each teacher is qualified to teach.'),
  teacherClasses: z.record(z.string(), z.array(z.string())).describe('Classes each teacher is qualified to teach.'),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

export const ScheduleEntrySchema = z.object({
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
  timeSlot: z.string(),
  className: z.string(),
  subject: z.string(),
  teacher: z.string(),
});
export type ScheduleEntry = z.infer<typeof ScheduleEntrySchema>;

export const GenerateScheduleOutputSchema = z.object({
  schedule: z.array(ScheduleEntrySchema).describe("A flat list of all the scheduled classes for the week."),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;
