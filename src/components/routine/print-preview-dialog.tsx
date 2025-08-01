
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

interface PrintPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contentRef: React.RefObject<HTMLDivElement>;
  title: string;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const PrintableTeacherRoutine = React.forwardRef<HTMLDivElement>((props, ref) => {
    const { appState } = useContext(AppStateContext);
    const { teacherRoutineForPrint, timeSlots } = appState;

    if (!teacherRoutineForPrint) return null;

    const { teacherName, schedule } = teacherRoutineForPrint;
    
    return (
        <div ref={ref}>
            <h3 className="text-xl font-semibold mb-3">{`Routine for ${teacherName}`}</h3>
             <table className="w-full border-collapse text-xs" style={{ border: '1px solid #ccc', tableLayout: 'fixed' }}>
                <thead>
                    <tr>
                        <th className="border p-1 font-bold text-left" style={{ border: '1px solid #ccc', padding: '4px', backgroundColor: '#f2f2f2' }}>Day / Time</th>
                        {timeSlots.map(slot => <th key={slot} className="border p-1 font-bold" style={{ border: '1px solid #ccc', padding: '4px', backgroundColor: '#f2f2f2' }}>{slot.replace(/ /g, '')}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {daysOfWeek.map(day => (
                        <tr key={day}>
                            <td className="border p-1 font-bold" style={{ border: '1px solid #ccc', padding: '4px' }}>{day}</td>
                            {timeSlots.map(slot => {
                                const entry = schedule[day]?.[slot];
                                if (entry) {
                                    return (
                                        <td key={slot} className="border p-1 text-center" style={{ border: '1px solid #ccc', padding: '4px' }}>
                                            <div className="font-semibold">{entry.subject}</div>
                                            <div className="text-gray-600 text-[10px]">{entry.className}</div>
                                        </td>
                                    );
                                }
                                return <td key={slot} className="border p-1 text-center" style={{ border: '1px solid #ccc', padding: '4px' }}>---</td>;
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});
PrintableTeacherRoutine.displayName = "PrintableTeacherRoutine";

const PrintPreviewDialog: React.FC<PrintPreviewDialogProps> = ({ isOpen, onOpenChange, contentRef, title }) => {
  const { appState, updateState } = useContext(AppStateContext);
  const { teacherRoutineForPrint } = appState;

  const teacherContentRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(100);
  const [margins, setMargins] = useState({ top: 1, right: 1, bottom: 1, left: 1 });
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setPreviewKey(prev => prev + 1); 
    } else {
      if (appState.teacherRoutineForPrint) {
        updateState('teacherRoutineForPrint', null);
      }
    }
  }, [isOpen, updateState, appState.teacherRoutineForPrint]);

  const handlePrint = () => {
    let contentToPrintElement: HTMLElement | null = null;
    if (teacherRoutineForPrint && teacherContentRef.current) {
        contentToPrintElement = teacherContentRef.current;
    } else if (contentRef.current) {
        contentToPrintElement = contentRef.current;
    }
    
    if (!contentToPrintElement) {
        console.error("No content to print.");
        return;
    }

    const contentHTML = contentToPrintElement.innerHTML;
    
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
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 8pt;
      }
      th, td {
        border: 1px solid #ccc !important;
        padding: 2px;
        text-align: center;
        page-break-inside: avoid;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      thead {
        display: table-header-group;
      }
      th {
        font-weight: bold;
        background-color: #f2f2f2 !important;
      }
      .break-after-page {
        page-break-after: always;
      }
      h3 {
        font-size: 14pt;
        font-weight: 600;
        text-align: center;
        margin-bottom: 0.5rem;
      }
      .text-gray-600 { color: #555; }
      .text-\\[10px\\] { font-size: 10px; }
      .font-semibold { font-weight: 600; }
      .mb-3 { margin-bottom: 1rem; }
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
        
        iframe.contentWindow?.focus();
        
        setTimeout(() => {
            iframe.contentWindow?.print();
            document.body.removeChild(iframe);
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
    if (teacherRoutineForPrint) {
        return <PrintableTeacherRoutine ref={teacherContentRef} />;
    }
    if (contentRef.current) {
      return <div dangerouslySetInnerHTML={{ __html: contentRef.current.innerHTML }} />;
    }
    return null;
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
