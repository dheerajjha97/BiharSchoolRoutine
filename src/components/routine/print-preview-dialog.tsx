
"use client";

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, X } from 'lucide-react';
import { AppStateContext } from '@/context/app-state-provider';
import { useContext } from 'react';
import { sortClasses } from '@/lib/utils';
import type { GenerateScheduleOutput, ScheduleEntry } from '@/ai/flows/generate-schedule';

interface PrintPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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


const PrintPreviewDialog: React.FC<PrintPreviewDialogProps> = ({ isOpen, onOpenChange, title }) => {
  const { appState, updateState } = useContext(AppStateContext);
  const { teacherRoutineForPrint, routine, timeSlots, classes, teacherLoad } = appState;

  const [scale, setScale] = useState(100);
  const [margins, setMargins] = useState({ top: 1, right: 1, bottom: 1, left: 1 });
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setPreviewKey(prev => prev + 1); 
    } else {
      if (teacherRoutineForPrint) {
        updateState('teacherRoutineForPrint', null);
      }
    }
  }, [isOpen, updateState, teacherRoutineForPrint]);

  const instructionalSlotMap = useMemo(() => {
    const map: { [timeSlot: string]: number } = {};
    let periodCounter = 1;
    timeSlots.forEach(slot => {
        if (!routine?.schedule?.find(e => e.timeSlot === slot && (e.subject === 'Prayer' || e.subject === 'Lunch'))) {
            map[slot] = periodCounter++;
        }
    });
    return map;
  }, [timeSlots, routine]);

  const generatePrintHTML = (): string => {
      let contentHTML = '';

      if (teacherRoutineForPrint) {
          const { teacherName, schedule } = teacherRoutineForPrint;
          contentHTML = `
              <h3 class="table-title">Routine for ${teacherName}</h3>
              <table class="routine-table">
                  <thead>
                      <tr>
                          <th>Day / Time</th>
                          ${timeSlots.map(slot => `<th>${slot.replace(/ /g, '')}</th>`).join('')}
                      </tr>
                  </thead>
                  <tbody>
                      ${daysOfWeek.map(day => `
                          <tr>
                              <td class="day-cell">${day}</td>
                              ${timeSlots.map(slot => {
                                  const entry = schedule[day]?.[slot];
                                  return `<td class="cell">${entry ? `<div class="subject">${entry.subject}</div><div class="class-name">${entry.className}</div>` : '---'}</td>`;
                              }).join('')}
                          </tr>
                      `).join('')}
                  </tbody>
              </table>
          `;
      } else if (routine?.schedule) {
            const gridSchedule: Record<string, Record<string, Record<string, ScheduleEntry[]>>> = {};
            daysOfWeek.forEach(day => {
                gridSchedule[day] = {};
                classes.forEach(c => {
                    gridSchedule[day][c] = {};
                    timeSlots.forEach(slot => { gridSchedule[day][c][slot] = []; });
                });
            });
            routine.schedule.forEach(entry => {
                entry.className.split(' & ').map(c => c.trim()).forEach(className => {
                    if (gridSchedule[entry.day]?.[className]?.[entry.timeSlot]) {
                      gridSchedule[entry.day][className][entry.timeSlot].push(entry);
                    }
                });
            });

            const sorted = sortClasses([...classes]);
            const getGrade = (c: string) => (c.match(/\d+/) || [])[0] || null;
            const secondary = sorted.filter(c => ['9', '10'].includes(getGrade(c) || ''));
            const seniorSecondary = sorted.filter(c => ['11', '12'].includes(getGrade(c) || ''));
            
            const generateClassTable = (title: string, displayClasses: string[]): string => {
                if(displayClasses.length === 0) return '';
                return `
                    <div class="page-break">
                        <h3 class="table-title">${title}</h3>
                        <table class="routine-table">
                            <thead>
                                <tr>
                                    <th class="day-header">Day</th>
                                    <th class="class-header">Class</th>
                                    ${timeSlots.map(slot => `<th><div>${slot}</div><div class="roman">${instructionalSlotMap[slot] ? toRoman(instructionalSlotMap[slot]) : '-'}</div></th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                            ${daysOfWeek.map(day => 
                                displayClasses.map((className, classIndex) => `
                                    <tr>
                                        ${classIndex === 0 ? `<td class="day-cell" rowspan="${displayClasses.length}">${day}</td>` : ''}
                                        <td class="class-cell">${className}</td>
                                        ${timeSlots.map(timeSlot => {
                                            const entries = gridSchedule[day]?.[className]?.[timeSlot] || [];
                                            const cellContent = entries.map(e => {
                                                if (e.subject === '---') return '<span class="empty-cell">---</span>';
                                                return `<div class="subject">${e.subject}</div><div class="teacher">${e.teacher || 'N/A'}</div>${e.className.includes('&') ? '<div class="combined">(Combined)</div>' : ''}`;
                                            }).join('');
                                            return `<td class="cell">${cellContent || '---'}</td>`;
                                        }).join('')}
                                    </tr>
                                `).join('')
                            ).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            };
            
            const generateTeacherLoadTable = (): string => {
                 const teachers = Object.keys(teacherLoad).sort();
                 if (teachers.length === 0) return '';
                 return `
                    <div class="page-break">
                         <h3 class="table-title">Teacher Workload Summary</h3>
                         <table class="routine-table teacher-load">
                            <thead>
                                <tr>
                                    <th>Teacher</th>
                                    ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Total"].map(d => `<th>${d.substring(0,3)}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${teachers.map(teacher => `
                                    <tr>
                                        <td class="teacher-name">${teacher}</td>
                                        ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Total"].map(day => 
                                            `<td>${teacherLoad[teacher]?.[day as keyof typeof teacherLoad[string]] ?? 0}</td>`
                                        ).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                         </table>
                    </div>
                 `;
            };

            contentHTML += generateClassTable("Secondary", secondary);
            contentHTML += generateClassTable("Senior Secondary", seniorSecondary);
            contentHTML += generateTeacherLoadTable();
      }

      return contentHTML;
  };
  

  const handlePrint = () => {
    const contentHTML = generatePrintHTML();
    
    const pageStyle = `
      @page {
        size: ${orientation};
        margin: ${margins.top}cm ${margins.right}cm ${margins.bottom}cm ${margins.left}cm;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      #printable-content {
        transform: scale(${scale / 100});
        transform-origin: top left;
        width: ${scale === 100 ? '100%' : 'auto'};
      }
      .routine-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 8pt;
        table-layout: fixed;
      }
      .routine-table th, .routine-table td {
        border: 1px solid #ccc !important;
        padding: 2px;
        text-align: center;
        word-wrap: break-word;
      }
       .routine-table th {
        font-weight: bold;
        background-color: #f2f2f2 !important;
      }
      .routine-table .day-cell, .routine-table .class-cell, .routine-table .teacher-name {
          font-weight: bold;
          font-size: 9pt;
      }
      .routine-table .subject { font-weight: 600; }
      .routine-table .teacher, .routine-table .class-name, .routine-table .roman { font-size: 7pt; color: #555; }
      .routine-table .combined { font-size: 6pt; font-style: italic; }
      .page-break {
        page-break-after: always;
      }
      .page-break:last-child {
        page-break-after: avoid;
      }
      .table-title {
        font-size: 14pt;
        font-weight: 600;
        text-align: center;
        margin-bottom: 0.5rem;
      }
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
        doc.open();
        doc.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <style>${pageStyle}</style>
                </head>
                <body>
                    <h2 style="text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 1rem;">${title}</h2>
                    <div id="printable-content">${contentHTML}</div>
                </body>
            </html>
        `);
        doc.close();
        
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch(e) {
            console.error("Print failed:", e);
          } finally {
            document.body.removeChild(iframe);
          }
        }, 500); 
    }
  };

  const previewScale = useMemo(() => {
    const a4_width_mm = orientation === 'landscape' ? 297 : 210;
    const margin_x_mm = (margins.left + margins.right) * 10;
    const dpi = 96; 
    const a4_width_px = (a4_width_mm - margin_x_mm) * dpi / 25.4;
    
    // A reasonable width for the preview container in the dialog
    const containerWidth = (window.innerWidth * 0.9 > 800) ? 800 : window.innerWidth * 0.7;

    return containerWidth / a4_width_px;
  }, [orientation, margins]);

  const handleMarginChange = (name: keyof typeof margins, value: number) => {
    setMargins(prev => ({ ...prev, [name]: value }));
  };
  
  const renderContent = () => {
    return <div dangerouslySetInnerHTML={{ __html: generatePrintHTML() }} />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[95vh] flex flex-col">
        <DialogHeader className="no-print">
          <DialogTitle>Print Preview: {title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 flex-1 overflow-hidden">
          {/* Controls Panel */}
          <div className="bg-gray-50 p-4 rounded-lg flex flex-col gap-6 overflow-y-auto no-print">
            <div>
              <Label>Orientation</Label>
              <Select value={orientation} onValueChange={(v: 'landscape' | 'portrait') => setOrientation(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscape">Landscape</SelectItem>
                  <SelectItem value="portrait">Portrait</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
                <Label>Scale ({scale}%)</Label>
                <Slider value={[scale]} onValueChange={(v) => setScale(v[0])} min={20} max={150} step={1} />
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Margins (cm)</h4>
              <div>
                <Label>Top ({margins.top.toFixed(1)}cm)</Label>
                <Slider value={[margins.top]} onValueChange={(v) => handleMarginChange('top', v[0])} min={0.5} max={3} step={0.1} />
              </div>
               <div>
                <Label>Bottom ({margins.bottom.toFixed(1)}cm)</Label>
                <Slider value={[margins.bottom]} onValueChange={(v) => handleMarginChange('bottom', v[0])} min={0.5} max={3} step={0.1} />
              </div>
              <div>
                <Label>Left ({margins.left.toFixed(1)}cm)</Label>
                <Slider value={[margins.left]} onValueChange={(v) => handleMarginChange('left', v[0])} min={0.5} max={3} step={0.1} />
              </div>
               <div>
                <Label>Right ({margins.right.toFixed(1)}cm)</Label>
                <Slider value={[margins.right]} onValueChange={(v) => handleMarginChange('right', v[0])} min={0.5} max={3} step={0.1} />
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="bg-gray-200 flex-1 overflow-auto p-8 no-print">
             <div 
                className="mx-auto bg-white shadow-lg"
                style={{
                    width: orientation === 'landscape' ? '29.7cm' : '21cm',
                    height: orientation === 'landscape' ? '21cm' : '29.7cm',
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top center',
                }}
             >
                <div
                    className="p-4 overflow-hidden"
                     style={{
                        padding: `${margins.top}cm ${margins.right}cm ${margins.bottom}cm ${margins.left}cm`,
                        height: '100%',
                        width: '100%',
                    }}
                >
                    <div 
                      key={previewKey} 
                      style={{ 
                          transform: `scale(${scale / 100})`, 
                          transformOrigin: 'top left',
                          width: `${100 * (100 / scale)}%`,
                          height: `${100 * (100/scale)}%`,
                       }}
                    >
                        <h2 className="text-2xl font-bold text-center mb-4">{title}</h2>
                        {renderContent()}
                    </div>
                </div>
            </div>
          </div>
        </div>

        <DialogFooter className="no-print pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}><X className="mr-2 h-4 w-4" /> Cancel</Button>
          <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrintPreviewDialog;


    