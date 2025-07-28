
// This file implements the Genkit flow for the generateSchedule story.
// It allows teachers to automatically generate a draft schedule based on teacher availability, subject priorities, and class requirements.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const UnavailabilitySchema = z.object({
  teacher: z.string(),
  day: z.string(),
  timeSlot: z.string(),
});

const GenerateScheduleInputSchema = z.object({
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

const ScheduleEntrySchema = z.object({
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
  timeSlot: z.string(),
  className: z.string(),
  subject: z.string(),
  teacher: z.string(),
});
export type ScheduleEntry = z.infer<typeof ScheduleEntrySchema>;

const GenerateScheduleOutputSchema = z.object({
  schedule: z.array(ScheduleEntrySchema).describe("A flat list of all the scheduled classes for the week."),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;


export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
  return generateScheduleFlow(input);
}

const generateSchedulePrompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: {schema: GenerateScheduleInputSchema},
  output: {
    // Loosen the output schema to allow the AI to occasionally fail.
    // We will manually filter for valid entries in the flow itself.
    schema: z.object({
      schedule: z.array(z.object({
        day: z.string().optional(),
        timeSlot: z.string().optional(),
        className: z.string().optional(),
        subject: z.string().optional(),
        teacher: z.string().optional(),
      })),
    }),
  },
  prompt: `You are an AI assistant designed to generate class schedules for schools.

  Given the following information, create a schedule for Monday, Tuesday, Wednesday, Thursday, and Friday. The schedule should be a flat list of individual class bookings.

  Teacher Names: {{teacherNames}}
  Classes: {{classes}}
  Subjects: {{subjects}}
  Time Slots: {{timeSlots}}
  Teacher Unavailability: {{jsonStringify unavailability}}
  Subject Priorities: {{subjectPriorities}}
  Class Requirements: {{classRequirements}}
  Teacher-Subject Mapping: {{teacherSubjects}}
  Teacher-Class Mapping: {{teacherClasses}}

  The Teacher Unavailability list specifies when a teacher CANNOT be scheduled. By default, assume all teachers are available for all time slots unless specified in this list.

  When assigning a teacher to a class for a specific subject, you MUST ensure:
  1. The teacher is not marked as unavailable at that specific day and time slot.
  2. The teacher is qualified to teach that subject based on the Teacher-Subject Mapping.
  3. The teacher is assigned to teach that class based on the Teacher-Class Mapping.

  If "Prayer" or "Lunch" are among the subjects, no teacher is required. For "Prayer" and "Lunch", the teacher can be "N/A". During these periods, all teachers are considered busy, so no other subjects should be scheduled for any class.

  Constraint: Every teacher must be assigned at least one period each day across all classes, excluding Prayer and Lunch periods.

  For common subjects like "Hindi", "English", "Computer", or "Sports", if a teacher teaches the same subject to multiple classes (e.g., "12th Arts" and "12th Science"), you can schedule these as a combined class. When this happens, create a single schedule entry with the className as a combined string (e.g., "12th Arts & 12th Science"). The assigned teacher teaches both classes together in that time slot.

  IMPORTANT: Your response MUST be a valid JSON object that strictly adheres to the output schema. Ensure every object in the 'schedule' array contains all the required fields: 'day', 'timeSlot', 'className', 'subject', and 'teacher'. Do not generate incomplete or partial entries. Every single entry must be a complete object.
  `,
});

const generateScheduleFlow = ai.defineFlow(
  {
    name: 'generateScheduleFlow',
    inputSchema: GenerateScheduleInputSchema,
    outputSchema: GenerateScheduleOutputSchema,
  },
  async input => {
    const {output} = await generateSchedulePrompt(input);

    if (!output || !output.schedule) {
      return { schedule: [] };
    }

    // Filter out any incomplete entries to prevent validation errors.
    // This provides a robust way to handle unreliable AI output.
    const cleanSchedule = output.schedule.filter(entry => {
      return !!entry.day && !!entry.timeSlot && !!entry.className && !!entry.subject && !!entry.teacher;
    });

    // We can now safely cast the cleaned schedule to the correct type.
    return { schedule: cleanSchedule as ScheduleEntry[] };
  }
);
    
