// A single source of truth for all major data types in the application.

import { z } from 'zod';

// Base Schemas
export const TeacherSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  udise: z.string().optional(), // The UDISE code of the school the teacher belongs to
});

export const SchoolInfoSchema = z.object({
    name: z.string().default("My School Name"),
    udise: z.string().default(""),
    details: z.string().default("Weekly Class Routine\n2024-25"), // For things like academic year, etc.
});

const DayEnum = z.enum(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);

export const ScheduleEntrySchema = z.object({
  day: DayEnum,
  timeSlot: z.string(),
  className: z.string(),
  subject: z.string(),
  teacher: z.string(), // Represents teacher ID(s), e.g., "id1" or "id1 & id2"
});

export const GenerateScheduleOutputSchema = z.object({
  schedule: z.array(ScheduleEntrySchema),
});

export const RoutineVersionSchema = z.object({
  id: z.string(),
  createdAt: z.string(), // ISO string
  name: z.string(),
  schedule: GenerateScheduleOutputSchema,
});

export const UnavailabilitySchema = z.object({
  teacherId: z.string(),
  day: z.string(),
  timeSlot: z.string(),
});

export const CombinedClassRuleSchema = z.object({
    classes: z.array(z.string()),
    subject: z.string(),
    teacherId: z.string(),
});

export const SplitClassRuleSchema = z.object({
    className: z.string(),
    parts: z.array(z.object({
        subject: z.string(),
        teacherId: z.string(),
    })),
});

export const SubjectPrioritySchema = z.enum(["before", "after", "none"]);
export const SubjectCategorySchema = z.enum(["main", "additional"]);

export const SchoolConfigSchema = z.object({
  workingDays: z.array(DayEnum),
  classRequirements: z.record(z.string(), z.array(z.string())),
  subjectPriorities: z.record(z.string(), SubjectPrioritySchema),
  unavailability: z.array(UnavailabilitySchema),
  teacherSubjects: z.record(z.string(), z.array(z.string())), // Key is teacherId
  teacherClasses: z.record(z.string(), z.array(z.string())), // Key is teacherId
  classTeachers: z.record(z.string(), z.string()), // Key is className, value is teacherId
  prayerTimeSlot: z.string(),
  lunchTimeSlot: z.string(),
  preventConsecutiveClasses: z.boolean(),
  subjectCategories: z.record(z.string(), SubjectCategorySchema),
  dailyPeriodQuota: z.number(),
  combinedClasses: z.array(CombinedClassRuleSchema),
  splitClasses: z.array(SplitClassRuleSchema),
});

export const GenerateScheduleLogicInputSchema = SchoolConfigSchema.extend({
    teachers: z.array(TeacherSchema),
    classes: z.array(z.string()),
    subjects: z.array(z.string()),
    timeSlots: z.array(z.string()),
});

export const TeacherLoadDetailSchema = z.object({
    total: z.number(),
    main: z.number(),
    additional: z.number(),
});

export const TeacherLoadSchema = z.record(z.string(), z.record(z.string(), TeacherLoadDetailSchema)); // Key is teacherId

export const ExamEntrySchema = z.object({
    id: z.string(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    classes: z.array(z.string()),
    rooms: z.array(z.string()),
    subject: z.string(),
});

export const DutyChartSchema = z.object({
    duties: z.record(z.string(), z.record(z.string(), z.array(z.string()))), // Key: "date-startTime", Value: { room: [teacherIds] }
    examSlots: z.array(z.object({ date: z.string(), startTime: z.string(), endTime: z.string() })),
});

export const SubstitutionSchema = z.object({
    timeSlot: z.string(),
    className: z.string(),
    subject: z.string(),
    absentTeacherId: z.string(),
    substituteTeacherId: z.string(),
});

export const SubstitutionPlanSchema = z.object({
    date: z.string(), // YYYY-MM-DD
    substitutions: z.array(SubstitutionSchema),
});

// Inferred Types
export type Day = z.infer<typeof DayEnum>;
export type Teacher = z.infer<typeof TeacherSchema>;
export type SchoolInfo = z.infer<typeof SchoolInfoSchema>;
export type ScheduleEntry = z.infer<typeof ScheduleEntrySchema>;
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;
export type GenerateScheduleLogicInput = z.infer<typeof GenerateScheduleLogicInputSchema>;
export type RoutineVersion = z.infer<typeof RoutineVersionSchema>;
export type SchoolConfig = z.infer<typeof SchoolConfigSchema>;
export type Unavailability = z.infer<typeof UnavailabilitySchema>;
export type CombinedClassRule = z.infer<typeof CombinedClassRuleSchema>;
export type SplitClassRule = z.infer<typeof SplitClassRuleSchema>;
export type SubjectPriority = z.infer<typeof SubjectPrioritySchema>;
export type SubjectCategory = z.infer<typeof SubjectCategorySchema>;
export type TeacherLoadDetail = z.infer<typeof TeacherLoadDetailSchema>;
export type TeacherLoad = z.infer<typeof TeacherLoadSchema>;
export type ExamEntry = z.infer<typeof ExamEntrySchema>;
export type DutyChart = z.infer<typeof DutyChartSchema>;
export type Substitution = z.infer<typeof SubstitutionSchema>;
export type SubstitutionPlan = z.infer<typeof SubstitutionPlanSchema>;

// AppState Type
export type AppState = {
  teachers: Teacher[];
  classes: string[];
  subjects: string[];
  timeSlots: string[];
  rooms: string[];
  schoolInfo: SchoolInfo;
  config: SchoolConfig;
  routineHistory: RoutineVersion[];
  activeRoutineId: string | null;
  teacherLoad: TeacherLoad;
  examTimetable: ExamEntry[];
  // Non-persistent state for daily adjustments
  adjustments: {
    date: string;
    absentTeacherIds: string[];
    substitutionPlan: SubstitutionPlan | null;
  }
};
