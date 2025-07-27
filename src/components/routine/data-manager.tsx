
"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";

interface DataManagerProps {
  title: string;
  icon: LucideIcon;
  items: string[];
  setItems: (items: string[]) => void;
  placeholder: string;
}

export default function DataManager({ title, icon: Icon, items, setItems, placeholder }: DataManagerProps) {
  const [newItem, setNewItem] = useState("");

  const handleAddItem = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      setItems([...items, newItem.trim()]);
      setNewItem("");
    }
  };

  const handleRemoveItem = (itemToRemove: string) => {
    setItems(items.filter(item => item !== itemToRemove));
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>Add or remove {title.toLowerCase()}.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <ScrollArea className="h-24 w-full">
          <div className="space-y-2">
            {items.length > 0 ? (
              items.map(item => (
                <div key={item} className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
                  <span>{item}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveItem(item)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center pt-8">No {title.toLowerCase()} added.</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-center space-x-2">
          <Input
            placeholder={placeholder}
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
          />
          <Button onClick={handleAddItem}>Add</Button>
        </div>
      </CardFooter>
    </Card>
  );
}
