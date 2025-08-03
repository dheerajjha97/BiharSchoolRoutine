
import type { AppState } from "@/context/app-state-provider";
import { sortTimeSlots } from "./utils";

// This function is no longer used but kept for potential legacy support or alternative export options.
export const exportToCsv = (data: Omit<AppState, 'config' | 'routine' | 'teacherLoad'>, filename: string) => {
  const { teachers, classes, subjects, timeSlots = [] } = data;
  
  const headers = ['teachers', 'classes', 'subjects', 'timeSlots'];
  let csvContent = headers.join(',') + '\n';

  const maxLength = Math.max(teachers.length, classes.length, subjects.length, timeSlots.length);

  for (let i = 0; i < maxLength; i++) {
    const rowData = {
        teachers: teachers[i] || '',
        classes: classes[i] || '',
        subjects: subjects[i] || '',
        timeSlots: timeSlots[i] || ''
    };
    const row = headers.map(header => {
        const value = rowData[header as keyof typeof rowData];
        return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvContent += row.join(',') + '\n';
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.href) {
      URL.revokeObjectURL(link.href);
  }
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// This function is no longer used but kept for potential legacy support.
export const importFromCsv = (file: File): Promise<Omit<AppState, 'config' | 'routine' | 'teacherLoad'>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split(/[\r\n]+/).filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
            resolve({ teachers: [], classes: [], subjects: [], timeSlots: [] });
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data: Required<Omit<AppState, 'config' | 'routine' | 'teacherLoad'>> = { teachers: [], classes: [], subjects: [], timeSlots: [] };

        const requiredHeaders = ['teachers', 'classes', 'subjects'];
        if (!requiredHeaders.every(h => headers.includes(h))) {
            throw new Error(`CSV must contain the following headers: ${requiredHeaders.join(', ')}.`);
        }
        
        const teacherIndex = headers.indexOf('teachers');
        const classIndex = headers.indexOf('classes');
        const subjectIndex = headers.indexOf('subjects');
        const timeSlotIndex = headers.indexOf('timeSlots');

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            
            if (teacherIndex !== -1 && values[teacherIndex]) data.teachers.push(values[teacherIndex]);
            if (classIndex !== -1 && values[classIndex]) data.classes.push(values[classIndex]);
            if (subjectIndex !== -1 && values[subjectIndex]) data.subjects.push(values[subjectIndex]);
            if (timeSlotIndex !== -1 && values[timeSlotIndex]) data.timeSlots.push(values[timeSlotIndex]);
        }
        
        const finalData = {
          teachers: [...new Set(data.teachers)].sort(),
          classes: [...new Set(data.classes)].sort(),
          subjects: [...new Set(data.subjects)].sort(),
          timeSlots: sortTimeSlots([...new Set(data.timeSlots)])
        };
        
        resolve(finalData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

export const exportToJSON = (data: AppState, filename: string) => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Failed to export JSON:", error);
    throw new Error("Could not serialize data to JSON.");
  }
};


export const importFromJSON = (file: File): Promise<AppState> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const jsonString = event.target?.result as string;
                if (!jsonString) {
                    throw new Error("File is empty or could not be read.");
                }
                const data = JSON.parse(jsonString);

                // Basic validation to ensure the imported data has the expected structure
                if (!data || typeof data !== 'object' || !data.teachers || !data.classes || !data.subjects || !data.config) {
                    throw new Error("Invalid JSON format. The file does not appear to be a valid school data backup.");
                }
                
                // Ensure time slots are sorted upon import
                if (data.timeSlots && Array.isArray(data.timeSlots)) {
                    data.timeSlots = sortTimeSlots(data.timeSlots);
                }

                resolve(data as AppState);
            } catch (error) {
                console.error("Failed to import JSON:", error);
                if (error instanceof SyntaxError) {
                    reject(new Error("Invalid JSON file. Please check the file content."));
                } else {
                    reject(error);
                }
            }
        };

        reader.onerror = (error) => reject(new Error("Failed to read the file."));
        reader.readAsText(file);
    });
};
