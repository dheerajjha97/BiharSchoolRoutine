"use client";

type SchoolData = {
  teachers: string[];
  classes: string[];
  subjects: string[];
};

export const exportToCsv = (data: SchoolData, filename: string) => {
  const allData = {
    teachers: data.teachers.join('\n'),
    classes: data.classes.join('\n'),
    subjects: data.subjects.join('\n'),
  };

  const headers = Object.keys(allData);
  const maxLength = Math.max(data.teachers.length, data.classes.length, data.subjects.length);
  
  let csvContent = headers.join(',') + '\n';

  for (let i = 0; i < maxLength; i++) {
    const row = [
      data.teachers[i] || '',
      data.classes[i] || '',
      data.subjects[i] || '',
    ];
    csvContent += row.join(',') + '\n';
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
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

        const headers = lines[0].split(',').map(h => h.trim());
        const data: SchoolData = { teachers: [], classes: [], subjects: [] };

        const teacherIndex = headers.indexOf('teachers');
        const classIndex = headers.indexOf('classes');
        const subjectIndex = headers.indexOf('subjects');

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (teacherIndex !== -1 && values[teacherIndex]) {
                data.teachers.push(values[teacherIndex]);
            }
            if (classIndex !== -1 && values[classIndex]) {
                data.classes.push(values[classIndex]);
            }
            if (subjectIndex !== -1 && values[subjectIndex]) {
                data.subjects.push(values[subjectIndex]);
            }
        }
        
        // Remove duplicates
        data.teachers = [...new Set(data.teachers)];
        data.classes = [...new Set(data.classes)];
        data.subjects = [...new Set(data.subjects)];
        
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);

    reader.readAsText(file);
  });
};
