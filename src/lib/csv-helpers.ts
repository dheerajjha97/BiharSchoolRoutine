
import type { AppState } from "@/context/app-state-provider";
import { sortTimeSlots } from "./utils";

export const exportToJSON = (data: AppState, filename: string) => {
  try {
    const persistentState = { ...data };
    // @ts-ignore - We are intentionally removing these for export
    delete persistentState.adjustments;
    // @ts-ignore
    delete persistentState.teacherLoad;


    const jsonString = JSON.stringify(persistentState, null, 2);
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
                    reject(error as Error);
                }
            }
        };

        reader.onerror = (error) => reject(new Error("Failed to read the file."));
        reader.readAsText(file);
    });
};
