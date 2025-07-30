import { sortTimeSlots } from "./utils";

type SchoolData = {
  teachers: string[];
  classes: string[];
  subjects: string[];
  timeSlots?: string[];
};

export const exportToCsv = (data: SchoolData, filename: string) => {
  const { teachers, classes, subjects, timeSlots = [] } = data;
  
  let csvContent = 'teachers,classes,subjects,timeSlots\n';

  const maxLength = Math.max(teachers.length, classes.length, subjects.length, timeSlots.length);

  for (let i = 0; i < maxLength; i++) {
    const row = [
      teachers[i] || '',
      classes[i] || '',
      subjects[i] || '',
      timeSlots[i] || '',
    ];
    csvContent += row.map(v => `"${v.replace(/"/g, '""')}"`).join(',') + '\n';
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
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
        const lines = csv.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
            throw new Error("CSV file is empty or has only headers.");
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data: SchoolData = { teachers: [], classes: [], subjects: [], timeSlots: [] };

        const teacherIndex = headers.indexOf('teachers');
        const classIndex = headers.indexOf('classes');
        const subjectIndex = headers.indexOf('subjects');
        const timeSlotIndex = headers.indexOf('timeSlots');

        for (let i = 1; i < lines.length; i++) {
            // Simple CSV parsing, may not handle all edge cases like commas in values
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            if (teacherIndex !== -1 && values[teacherIndex]) {
                data.teachers.push(values[teacherIndex]);
            }
            if (classIndex !== -1 && values[classIndex]) {
                data.classes.push(values[classIndex]);
            }
            if (subjectIndex !== -1 && values[subjectIndex]) {
                data.subjects.push(values[subjectIndex]);
            }
            if (timeSlotIndex !== -1 && values[timeSlotIndex] && data.timeSlots) {
                data.timeSlots.push(values[timeSlotIndex]);
            }
        }
        
        data.teachers = [...new Set(data.teachers)].sort();
        data.classes = [...new Set(data.classes)].sort();
        data.subjects = [...new Set(data.subjects)].sort();
        if (data.timeSlots) {
          data.timeSlots = sortTimeSlots([...new Set(data.timeSlots)]);
        }
        
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};
