import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import type { GenerateScheduleOutput, ScheduleEntry } from "@/ai/flows/generate-schedule";
import type { TeacherLoad } from '@/context/app-state-provider';

// Register a font that supports a wide range of characters, including Devanagari for Hindi.
// Note: This font needs to be available. For a web environment, this might be tricky without bundling.
// For simplicity, we'll rely on default fonts but this is where you'd register a custom one.
// Font.register({ family: 'Noto Sans', src: 'https://fonts.gstatic.com/s/notosans/v27/o-0IIpQlx3QUlC5A4PNr5-Q.ttf' });

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20,
    fontFamily: 'Helvetica', // Using a safe default
  },
  section: {
    marginBottom: 10,
  },
  header: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  subHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 10,
    backgroundColor: '#F3F4F6',
    padding: 4,
  },
  table: {
    display: "flex",
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableColHeader: {
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    flexGrow: 1,
  },
  tableCol: {
    padding: 4,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    flexGrow: 1,
  },
  tableCell: {
    fontSize: 8,
    textAlign: 'center',
  },
  tableCellHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dayCell: {
    width: '8%',
    fontSize: 9,
    fontWeight: 'bold',
    padding: 4,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  classCell: {
    width: '12%',
    fontSize: 9,
    padding: 4,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  slotCell: {
      flex: 1,
  },
  cellContentSubject: {
      fontSize: 8,
      fontWeight: 'bold',
      marginBottom: 2,
  },
  cellContentTeacher: {
      fontSize: 7,
      color: '#4B5563',
  },
});

const toRoman = (num: number): string => {
    if (num < 1) return "";
    const romanMap: Record<number, string> = { 10: 'X', 9: 'IX', 5: 'V', 4: 'IV', 1: 'I' };
    let result = '';
    for (const val of [10, 9, 5, 4, 1]) {
        while (num >= val) {
            result += romanMap[val];
            num -= val;
        }
    }
    return result;
};


interface RoutinePDFDocumentProps {
    scheduleData: GenerateScheduleOutput;
    timeSlots: string[];
    classes: string[];
    teacherLoad: TeacherLoad;
    title: string;
    singleTeacherData?: {
        teacherName: string;
        schedule: Record<string, Record<string, { className: string, subject: string }>>;
    };
}

const RoutinePDFDocument = ({ scheduleData, timeSlots, classes, teacherLoad, title, singleTeacherData }: RoutinePDFDocumentProps) => {

    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    const getGradeFromClassName = (className: string): string | null => {
        const match = className.match(/\d+/);
        return match ? match[0] : null;
    };
    
    const sortClasses = (a: string, b: string): number => {
      const gradeA = parseInt(getGradeFromClassName(a) || '0', 10);
      const gradeB = parseInt(getGradeFromClassName(b) || '0', 10);
      if (gradeA !== gradeB) return gradeA - gradeB;
      return a.localeCompare(b);
    };

    const { secondaryClasses, seniorSecondaryClasses } = !singleTeacherData
        ? (() => {
            const sorted = [...classes].sort(sortClasses);
            return {
                secondaryClasses: sorted.filter(c => ['9', '10'].includes(getGradeFromClassName(c) || '')),
                seniorSecondaryClasses: sorted.filter(c => ['11', '12'].includes(getGradeFromClassName(c) || ''))
            };
        })()
        : { secondaryClasses: [], seniorSecondaryClasses: [] };

    const instructionalSlotMap: { [timeSlot: string]: number } = {};
    let periodCounter = 1;
    timeSlots.forEach(slot => {
        if (!scheduleData?.schedule?.find(e => e.timeSlot === slot && (e.subject === 'Prayer' || e.subject === 'Lunch'))) {
            instructionalSlotMap[slot] = periodCounter++;
        }
    });

    const gridSchedule: Record<string, Record<string, Record<string, ScheduleEntry[]>>> = {};
    daysOfWeek.forEach(day => {
        gridSchedule[day] = {};
        classes.forEach(c => {
            gridSchedule[day][c] = {};
            timeSlots.forEach(slot => { gridSchedule[day][c][slot] = []; });
        });
    });
    scheduleData.schedule.forEach(entry => {
        entry.className.split(' & ').map(c => c.trim()).forEach(className => {
            if (gridSchedule[entry.day]?.[className]?.[entry.timeSlot]) {
                gridSchedule[entry.day][className][entry.timeSlot].push(entry);
            }
        });
    });

    const renderScheduleTable = (tableTitle: string, displayClasses: string[]) => {
      if(displayClasses.length === 0) return null;
      return (
        <View style={styles.section} wrap={false}>
          <Text style={styles.subHeader}>{tableTitle}</Text>
          <View style={styles.table}>
            {/* Header Row */}
            <View style={styles.tableRow}>
              <View style={styles.dayCell}><Text style={styles.tableCellHeader}>Day</Text></View>
              <View style={styles.classCell}><Text style={styles.tableCellHeader}>Class</Text></View>
              {timeSlots.map(slot => (
                <View key={slot} style={[styles.tableColHeader, styles.slotCell]}>
                    <Text style={styles.tableCellHeader}>{slot}</Text>
                    <Text style={styles.tableCell}>{instructionalSlotMap[slot] ? toRoman(instructionalSlotMap[slot]) : '-'}</Text>
                </View>
              ))}
            </View>
            {/* Data Rows */}
            {daysOfWeek.map(day => (
                <View key={day}>
                    {displayClasses.map((className, classIndex) => (
                        <View key={className} style={styles.tableRow}>
                            {classIndex === 0 && <View style={styles.dayCell}><Text>{day}</Text></View>}
                            {classIndex > 0 && <View style={styles.dayCell}><Text></Text></View>}
                            <View style={styles.classCell}><Text>{className}</Text></View>
                             {timeSlots.map(timeSlot => {
                                const entries = gridSchedule[day]?.[className]?.[timeSlot] || [];
                                const cellContent = entries[0];
                                return (
                                    <View key={timeSlot} style={[styles.tableCol, styles.slotCell]}>
                                        {cellContent && cellContent.subject !== '---' ? (
                                            <React.Fragment>
                                                <Text style={styles.cellContentSubject}>{cellContent.subject}</Text>
                                                <Text style={styles.cellContentTeacher}>{cellContent.teacher}</Text>
                                            </React.Fragment>
                                        ) : <Text style={styles.tableCell}>-</Text>}
                                    </View>
                                )
                             })}
                        </View>
                    ))}
                </View>
            ))}
          </View>
        </View>
      );
    };

    const renderTeacherLoadTable = () => {
        const sortedTeachers = Object.keys(teacherLoad).sort();
        if(sortedTeachers.length === 0) return null;
        return (
            <View style={styles.section} break>
                <Text style={styles.subHeader}>Teacher Workload Summary</Text>
                <View style={styles.table}>
                    <View style={styles.tableRow}>
                        <View style={{...styles.tableColHeader, width: '25%'}}><Text style={styles.tableCellHeader}>Teacher</Text></View>
                        {[...daysOfWeek, "Total"].map(day => (
                            <View key={day} style={{...styles.tableColHeader, width: `${75 / 7}%`}}><Text style={styles.tableCellHeader}>{day.substring(0, 3)}</Text></View>
                        ))}
                    </View>
                    {sortedTeachers.map(teacher => (
                        <View key={teacher} style={styles.tableRow}>
                            <View style={{...styles.tableCol, width: '25%'}}><Text style={styles.tableCell}>{teacher}</Text></View>
                            {[...daysOfWeek, "Total"].map(day => (
                                <View key={day} style={{...styles.tableCol, width: `${75 / 7}%`}}><Text style={styles.tableCell}>{teacherLoad[teacher]?.[day as keyof typeof teacherLoad[string]] ?? 0}</Text></View>
                            ))}
                        </View>
                    ))}
                </View>
            </View>
        );
    };
    
    const renderSingleTeacherSchedule = () => {
        if (!singleTeacherData) return null;
        const { schedule } = singleTeacherData;
        
        return (
             <View style={styles.table}>
                {/* Header Row */}
                <View style={styles.tableRow}>
                    <View style={{...styles.dayCell, width: '15%'}}><Text style={styles.tableCellHeader}>Day/Time</Text></View>
                    {timeSlots.map(slot => (
                        <View key={slot} style={[styles.tableColHeader, styles.slotCell]}>
                            <Text style={styles.tableCellHeader}>{slot}</Text>
                        </View>
                    ))}
                </View>
                {/* Data Rows */}
                 {daysOfWeek.map(day => (
                    <View key={day} style={styles.tableRow}>
                         <View style={{...styles.dayCell, width: '15%'}}><Text>{day}</Text></View>
                         {timeSlots.map(timeSlot => {
                             const entry = schedule[day]?.[timeSlot];
                             return (
                                 <View key={timeSlot} style={[styles.tableCol, styles.slotCell]}>
                                     {entry ? (
                                        <React.Fragment>
                                            <Text style={styles.cellContentSubject}>{entry.subject}</Text>
                                            <Text style={styles.cellContentTeacher}>{entry.className}</Text>
                                        </React.Fragment>
                                     ) : <Text style={styles.tableCell}>-</Text>}
                                 </View>
                             );
                         })}
                    </View>
                 ))}
            </View>
        );
    }


  return (
    <Document title={title} author="BiharSchoolRoutine App">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.header}>{title}</Text>
        {singleTeacherData ? (
             renderSingleTeacherSchedule()
        ) : (
            <>
                {renderScheduleTable("Secondary (IX-X)", secondaryClasses)}
                {renderScheduleTable("Senior Secondary (XI-XII)", seniorSecondaryClasses)}
                {renderTeacherLoadTable()}
            </>
        )}
      </Page>
    </Document>
  );
};

export default RoutinePDFDocument;
