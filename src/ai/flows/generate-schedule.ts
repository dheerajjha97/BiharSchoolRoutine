
'use server';

import { z } from 'zod';

// This file is now only used for its Zod schema type definitions,
// which are shared between the frontend and the backend logic.
// The actual scheduling is a deterministic algorithm in /lib/schedule-generator.ts

export const ScheduleEntrySchema = z.object({
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
  timeSlot: z.string(),
  className: z.string(),
  subject: z.string(),
  teacher: z.string(),
});

export const GenerateScheduleOutputSchema = z.object({
  schedule: z.array(ScheduleEntrySchema).describe("A flat list of all the scheduled classes for the week."),
});

export type ScheduleEntry = z.infer<typeof ScheduleEntrySchema>;
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;
