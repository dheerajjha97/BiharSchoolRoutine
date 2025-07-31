
"use client";

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
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
             <table className="w-full border-collapse text-xs">
                <thead>
                    <tr>
                        <th className="border p-1 font-bold text-left">Day / Time</th>
                        {timeSlots.map(slot => <th key={slot} className="border p-1 font-bold">{slot.replace(/ /g, '')}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {daysOfWeek.map(day => (
                        <tr key={day}>
                            <td className="border p-1 font-bold">{day}</td>
                            {timeSlots.map(slot => {
                                const entry = schedule[day]?.[slot];
                                if (entry) {
                                    return (
                                        <td key={slot} className="border p-1 text-center">
                                            <div className="font-semibold">{entry.subject}</div>
                                            <div className="text-gray-600 text-[10px]">{entry.className}</div>
                                        </td>
                                    );
                                }
                                return <td key={slot} className="border p-1 text-center">---</td>;
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
  const componentToPrintRef = teacherRoutineForPrint ? teacherContentRef : contentRef;

  const [scale, setScale] = useState(100);
  const [margins, setMargins] = useState({ top: 1, right: 1, bottom: 1, left: 1 });
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setPreviewKey(prev => prev + 1); // Force re-render of preview
    } else {
      // Reset teacher print state when dialog closes
      updateState('teacherRoutineForPrint', null);
    }
  }, [isOpen, updateState]);
  
  const pageStyle = useMemo(() => `
    @page {
      size: ${orientation};
      margin: ${margins.top}cm ${margins.right}cm ${margins.bottom}cm ${margins.left}cm;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        background-color: #fff !important;
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
    }
  `, [margins, orientation]);

  const handlePrint = useReactToPrint({
    content: () => componentToPrintRef.current,
    pageStyle: pageStyle,
    documentTitle: title,
  });

  const previewScale = useMemo(() => {
    const a4_width_mm = orientation === 'landscape' ? 297 : 210;
    const a4_height_mm = orientation === 'landscape' ? 210 : 297;
    const margin_x_mm = (margins.left + margins.right) * 10;
    const margin_y_mm = (margins.top + margins.bottom) * 10;
    
    // Using a fixed DPI for preview consistency
    const dpi = 96; 
    const a4_width_px = (a4_width_mm - margin_x_mm) * dpi / 25.4;
    
    // Let's assume a standard preview container width of about 800px
    return 800 / a4_width_px;
  }, [orientation, margins]);

  const handleMarginChange = (name: keyof typeof margins, value: number) => {
    setMargins(prev => ({ ...prev, [name]: value }));
  };
  
  const renderContent = () => {
    if (teacherRoutineForPrint) {
        return <PrintableTeacherRoutine ref={teacherContentRef} />;
    }
    if (contentRef.current) {
      // Clone the node to avoid issues with the original DOM
      return <div dangerouslySetInnerHTML={{ __html: contentRef.current.innerHTML }} />;
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Print Preview: {title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[300px_1fr] gap-6 flex-1 overflow-hidden">
          {/* Controls Panel */}
          <div className="bg-gray-50 p-4 rounded-lg flex flex-col gap-6 overflow-y-auto">
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
          <div className="bg-gray-200 flex-1 overflow-auto p-8">
             <div 
                className="mx-auto bg-white shadow-lg"
                style={{
                    width: orientation === 'landscape' ? '29.7cm' : '21cm',
                    height: orientation === 'landscape' ? '21cm' : '29.7cm',
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                }}
             >
                <div
                    className="p-4"
                     style={{
                        padding: `${margins.top}cm ${margins.right}cm ${margins.bottom}cm ${margins.left}cm`,
                    }}
                >
                    <div 
                      key={previewKey} // Force re-render on settings change
                      style={{ transform: `scale(${scale / 100})`, transformOrigin: 'top left' }}
                    >
                        <h2 className="text-2xl font-bold text-center mb-4">{title}</h2>
                        {renderContent()}
                    </div>
                </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}><X className="mr-2 h-4 w-4" /> Cancel</Button>
          <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrintPreviewDialog;
