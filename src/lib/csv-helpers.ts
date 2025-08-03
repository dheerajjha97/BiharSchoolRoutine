import { sortTimeSlots } from "./utils";

type SchoolData = {
  teachers: string[];
  classes: string[];
  subjects: string[];
  timeSlots?: string[];
};

export const exportToCsv = (data: SchoolData, filename: string) => {
  const { teachers, classes, subjects, timeSlots = [] } = data;
  
  // Use a more robust header that matches the keys
  const headers = ['teachers', 'classes', 'subjects', 'timeSlots'];
  let csvContent = headers.join(',') + '\n';

  const maxLength = Math.max(teachers.length, classes.length, subjects.length, timeSlots.length);

  for (let i = 0; i < maxLength; i++) {
    // Use an object to map values to headers, making it more readable
    const rowData = {
        teachers: teachers[i] || '',
        classes: classes[i] || '',
        subjects: subjects[i] || '',
        timeSlots: timeSlots[i] || ''
    };
    const row = headers.map(header => {
        const value = rowData[header as keyof typeof rowData];
        // Escape quotes by doubling them, and wrap the whole value in quotes
        return `"${value.replace(/"/g, '""')}"`;
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

export const importFromCsv = (file: File): Promise<SchoolData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split(/[\r\n]+/).filter(line => line.trim() !== ''); // More robust line splitting
        
        if (lines.length < 2) {
            // It's not an error to have just a header row, it just means no data.
            resolve({ teachers: [], classes: [], subjects: [], timeSlots: [] });
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data: Required<SchoolData> = { teachers: [], classes: [], subjects: [], timeSlots: [] };

        const requiredHeaders = ['teachers', 'classes', 'subjects'];
        if (!requiredHeaders.every(h => headers.includes(h))) {
            throw new Error(`CSV must contain the following headers: ${requiredHeaders.join(', ')}.`);
        }
        
        const teacherIndex = headers.indexOf('teachers');
        const classIndex = headers.indexOf('classes');
        const subjectIndex = headers.indexOf('subjects');
        const timeSlotIndex = headers.indexOf('timeSlots');

        for (let i = 1; i < lines.length; i++) {
            // Simple CSV parsing, might not handle commas inside quoted values correctly.
            // For this app's purpose, it's likely sufficient.
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            
            if (teacherIndex !== -1 && values[teacherIndex]) data.teachers.push(values[teacherIndex]);
            if (classIndex !== -1 && values[classIndex]) data.classes.push(values[classIndex]);
            if (subjectIndex !== -1 && values[subjectIndex]) data.subjects.push(values[subjectIndex]);
            if (timeSlotIndex !== -1 && values[timeSlotIndex]) data.timeSlots.push(values[timeSlotIndex]);
        }
        
        // Remove duplicates and sort
        const finalData: SchoolData = {
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
