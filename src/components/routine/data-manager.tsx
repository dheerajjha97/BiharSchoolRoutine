
"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface DataManagerProps {
  title: string;
  icon: LucideIcon;
  items: string[];
  setItems: (items: string[]) => void;
  placeholder: string;
  description: string;
}

export default function DataManager({ title, icon: Icon, items, setItems, placeholder, description }: DataManagerProps) {
  const [newItem, setNewItem] = useState("");

  const handleAddItem = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      setItems([...items, newItem.trim()].sort());
      setNewItem("");
    }
  };

  const handleRemoveItem = (itemToRemove: string) => {
    setItems(items.filter(item => item !== itemToRemove));
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-6 w-6 text-primary" />
          <span>{title}</span>
           <Badge variant="secondary">{items.length}</Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4">
        <div className="flex w-full items-center space-x-2">
          <Input
            placeholder={placeholder}
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
          />
          <Button onClick={handleAddItem}>Add</Button>
        </div>
        <ScrollArea className="flex-grow h-64 border rounded-md p-2">
          <div className="space-y-2">
            {items.length > 0 ? (
              items.map(item => (
                <div key={item} className="flex items-center justify-between bg-secondary p-2 rounded-md text-sm">
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
      </CardContent>
    </Card>
  );
}
