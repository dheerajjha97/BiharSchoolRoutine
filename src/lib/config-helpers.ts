
"use client";

type SchoolConfig = {
  teachers: string[];
  classes: string[];
  subjects: string[];
  timeSlots: string[];
  classRequirements: Record<string, string[]>;
  subjectPriorities: Record<string, number>;
  availability: Record<string, Record<string, boolean>>;
  teacherSubjects: Record<string, string[]>;
  teacherClasses: Record<string, string[]>;
};

export const exportConfig = (data: SchoolConfig, filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const importConfig = (file: File): Promise<SchoolConfig> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const config = JSON.parse(jsonString) as SchoolConfig;
        
        // Basic validation
        if (!config.teachers || !config.classes || !config.subjects) {
            throw new Error("Invalid configuration file.");
        }

        resolve(config);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);

    reader.readAsText(file);
  });
};
