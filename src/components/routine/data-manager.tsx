
"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, User, School, Book, Clock, DoorOpen } from "lucide-react";
import { sortTimeSlots } from "@/lib/utils";
import type { Teacher } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface DataManagerProps {
  title: "Teachers" | "Classes" | "Subjects" | "Time Slots" | "Rooms / Halls";
  icon: LucideIcon;
  items: any[];
  setItems: (items: any[]) => void;
  placeholder: string;
  description: string;
}

const TeacherManager = ({ items, setItems }: { items: Teacher[], setItems: (items: Teacher[]) => void }) => {
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");

    const handleAddItem = () => {
        const name = newName.trim();
        const email = newEmail.trim().toLowerCase();
        if (!name || !email) return;

        if (!items.some(t => t.email === email)) {
            const newTeacher: Teacher = { id: uuidv4(), name, email };
            const newItemsList = [newTeacher, ...items].sort((a, b) => a.name.localeCompare(b.name));
            setItems(newItemsList);
            setNewName("");
            setNewEmail("");
        }
    };
    
    const handleRemoveItem = (idToRemove: string) => {
        setItems(items.filter(item => item.id !== idToRemove));
    };

    return (
        <>
            <div className="flex w-full items-center space-x-2">
                <Input placeholder="Teacher name..." value={newName} onChange={e => setNewName(e.target.value)} />
                <Input placeholder="Teacher email..." value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                <Button onClick={handleAddItem}>Add</Button>
            </div>
            <ScrollArea className="flex-grow h-64 border rounded-md p-2">
              <div className="space-y-2">
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="flex items-center justify-between bg-secondary p-2 rounded-md text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.email}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveItem(item.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-10">No teachers added yet.</div>
                )}
              </div>
            </ScrollArea>
        </>
    );
};

const StringListManager = ({ title, items, setItems, placeholder }: { title: string, items: string[], setItems: (items: string[]) => void, placeholder: string }) => {
  const [newItem, setNewItem] = useState("");

  const handleAddItem = () => {
    let finalNewItem = newItem.trim();
    if (!finalNewItem) return;
    
    if (!items.includes(finalNewItem)) {
      let newItemsList = [finalNewItem, ...items];
      if (title === 'Time Slots') {
        newItemsList = sortTimeSlots(newItemsList);
      } else {
        newItemsList = newItemsList.sort();
      }
      setItems(newItemsList);
      setNewItem("");
    }
  };

  const handleRemoveItem = (itemToRemove: string) => {
    setItems(items.filter(item => item !== itemToRemove));
  };
  
  const handleTimeSlotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    let formattedValue = rawValue;

    if (rawValue.length > 2) {
      formattedValue = `${rawValue.slice(0, 2)}:${rawValue.slice(2)}`;
    }
    if (rawValue.length > 4) {
      formattedValue = `${rawValue.slice(0, 2)}:${rawValue.slice(2, 4)} - ${rawValue.slice(4)}`;
    }
    if (rawValue.length > 6) {
      formattedValue = `${rawValue.slice(0, 2)}:${rawValue.slice(2, 4)} - ${rawValue.slice(4, 6)}:${rawValue.slice(6)}`;
    }
    
    setNewItem(formattedValue.slice(0, 13)); // "HH:MM - HH:MM" is 13 chars
  };

  const isTimeSlotManager = title === 'Time Slots';

  return (
    <>
        <div className="flex w-full items-center space-x-2">
          <Input
            placeholder={placeholder}
            value={newItem}
            onChange={isTimeSlotManager ? handleTimeSlotChange : (e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            maxLength={isTimeSlotManager ? 13 : undefined}
          />
          <Button onClick={handleAddItem}>Add</Button>
        </div>
        <ScrollArea className="flex-grow h-64 border rounded-md p-2">
          <div className="space-y-2">
            {items.length > 0 ? (
              items.map((item, index) => (
                <div key={`${item}-${index}`} className="flex items-center justify-between bg-secondary p-2 rounded-md text-sm">
                  <span>{item}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveItem(item)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-10">No {title.toLowerCase()} added yet.</div>
            )}
          </div>
        </ScrollArea>
    </>
  );
}


export default function DataManager({ title, icon: Icon, items, setItems, placeholder, description }: DataManagerProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            <span>{title}</span>
            <Badge variant="secondary">{items.length}</Badge>
          </div>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4">
        {title === 'Teachers' ? (
          <TeacherManager items={items as Teacher[]} setItems={setItems} />
        ) : (
          <StringListManager title={title} items={items as string[]} setItems={setItems} placeholder={placeholder} />
        )}
      </CardContent>
    </Card>
  );
}
