
'use server';

// This file is now only used for its Zod schema type definitions,
// which are shared between the frontend and the backend logic.
// The actual scheduling is a deterministic algorithm in /lib/schedule-generator.ts
// All core types are imported from the central /types/index.ts file.

import { 
  ScheduleEntrySchema, 
  GenerateScheduleOutputSchema, 
  RoutineVersionSchema,
  type ScheduleEntry,
  type GenerateScheduleOutput,
  type RoutineVersion
} from '@/types';

// Re-export Zod schemas for any legacy imports if necessary, though direct import is preferred.
export {
  ScheduleEntrySchema,
  GenerateScheduleOutputSchema,
  RoutineVersionSchema,
};

// Re-export TypeScript types.
export type {
  ScheduleEntry,
  GenerateScheduleOutput,
  RoutineVersion,
};
