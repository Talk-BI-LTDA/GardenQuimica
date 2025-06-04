// @/components/ui/time-picker-demo.tsx
"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimePickerDemoProps {
  date: Date;
  setDate: (date: Date) => void;
}

export function TimePickerDemo({ date, setDate }: TimePickerDemoProps) {
  const minuteRef = React.useRef<HTMLButtonElement>(null);
  const hourRef = React.useRef<HTMLButtonElement>(null);

  // Inicializar estados internos baseados na prop date apenas uma vez
  const [hour, setHour] = React.useState(() => date.getHours().toString());
  const [minute, setMinute] = React.useState(() => date.getMinutes().toString().padStart(2, "0"));
  const [second, setSecond] = React.useState(() => date.getSeconds().toString().padStart(2, "0"));

  // Create an array of hours (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i.toString());
  
  // Create an array of minutes (0-59)
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  // Create an array of seconds (0-59)

  // Sincronizar apenas quando a prop date mudar externamente (sem incluir date nas dependências)
  const dateTimestamp = date.getTime();

  React.useEffect(() => {
    setHour(date.getHours().toString());
    setMinute(date.getMinutes().toString().padStart(2, "0"));
    setSecond(date.getSeconds().toString().padStart(2, "0"));
  }, [date, dateTimestamp]); // Usar timestamp para evitar comparação de objetos

  // Atualizar date quando os valores internos mudarem
  React.useEffect(() => {
    const newDate = new Date(date);
    newDate.setHours(parseInt(hour, 10));
    newDate.setMinutes(parseInt(minute, 10));
    newDate.setSeconds(parseInt(second, 10));
    
    // Só atualizar se realmente mudou (comparar timestamps)
    if (newDate.getTime() !== date.getTime()) {
      setDate(newDate);
    }
  }, [date, hour, minute, second, setDate]); // REMOVIDO 'date' das dependências

  // Função para atualizar hora específica
  const updateTime = (hours: string, mins: string, secs: string) => {
    setHour(hours);
    setMinute(mins);
    setSecond(secs);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {format(date, "HH:mm", { locale: ptBR })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto p-0">
        <div className="p-3 space-y-2">
          <div className="flex items-center space-x-2">
            <Select
              value={hour}
              onValueChange={setHour}
            >
              <SelectTrigger
                ref={hourRef}
                className="w-[70px]"
                aria-label="Horas"
              >
                <SelectValue placeholder="Hora" />
              </SelectTrigger>
              <SelectContent position="popper">
                {hours.map((hour) => (
                  <SelectItem key={hour} value={hour}>
                    {hour.padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">:</span>
            <Select
              value={minute}
              onValueChange={setMinute}
            >
              <SelectTrigger
                ref={minuteRef}
                className="w-[70px]"
                aria-label="Minutos"
              >
                <SelectValue placeholder="Minuto" />
              </SelectTrigger>
              <SelectContent position="popper">
                {minutes.map((minute) => (
                  <SelectItem key={minute} value={minute}>
                    {minute}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date();
                updateTime(
                  now.getHours().toString(),
                  now.getMinutes().toString().padStart(2, "0"),
                  now.getSeconds().toString().padStart(2, "0")
                );
              }}
            >
              Agora
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateTime("9", "00", "00")}
            >
              09:00
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateTime("12", "00", "00")}
            >
              12:00
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateTime("17", "00", "00")}
            >
              17:00
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}