import { addDays, format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Play, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface Activity {
  id: string;
  name: string;
  activity_type?: "time" | "count";
  target_unit?: string;
}

interface DailyEntry {
  [activityId: string]: {
    [date: string]: number;
  };
}

interface DailyMatrixProps {
  weekStart: Date;
  activities: Activity[];
  entries: DailyEntry;
  onUpdateEntry: (activityId: string, date: string, minutes: number) => void;
  onStartTimer: (activityId: string, activityName: string) => void;
}

export function DailyMatrix({ 
  weekStart, 
  activities, 
  entries, 
  onUpdateEntry,
  onStartTimer 
}: DailyMatrixProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const [localValues, setLocalValues] = useState<{[key: string]: string}>({});

  // Limpiar valores locales cuando cambia la semana
  useEffect(() => {
    setLocalValues({});
  }, [weekStart]);

  const getHeatLevel = (value: number, isTime: boolean): number => {
    if (value === 0) return 0;
    
    if (isTime) {
      // Para tiempo (en minutos), convertir a horas para calcular heat
      const hours = value / 60;
      if (hours < 1) return 1;
      if (hours < 2) return 2;
      if (hours < 3) return 3;
      if (hours < 4) return 4;
      return 5;
    } else {
      // Para cantidad
      if (value < 3) return 1;
      if (value < 6) return 2;
      if (value < 10) return 3;
      if (value < 15) return 4;
      return 5;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-3 text-left border border-border bg-muted font-semibold text-foreground">
              Actividad
            </th>
            {weekDays.map((day) => (
              <th
                key={day.toISOString()}
                className={cn(
                  "p-3 text-center border border-border font-semibold",
                  isSameDay(day, today) ? "bg-primary/10" : "bg-muted"
                )}
              >
                <div className="text-sm text-foreground">
                  {format(day, "EEE", { locale: es })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(day, "d MMM", { locale: es })}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => {
            const isTime = activity.activity_type === "time" || !activity.activity_type;
            const unit = activity.target_unit || (isTime ? "min" : "");
            
            return (
              <tr key={activity.id}>
                <td className="p-3 border border-border bg-card font-medium text-foreground">
                  <div className="flex items-center justify-between gap-2">
                    <span>{activity.name}</span>
                    {isTime ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onStartTimer(activity.id, activity.name)}
                        title="Iniciar cronómetro"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          const todayKey = format(today, "yyyy-MM-dd");
                          const currentValue = entries[activity.id]?.[todayKey] || 0;
                          const newValue = currentValue + 1;
                          onUpdateEntry(activity.id, todayKey, newValue);
                        }}
                        title="Sumar 1 al día actual"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </td>
                {weekDays.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const value = entries[activity.id]?.[dateKey];
                  const actualValue = value !== undefined ? value : 0;
                  const heatLevel = getHeatLevel(actualValue, isTime);
                  const cellKey = `${activity.id}-${dateKey}`;
                  const displayValue = localValues[cellKey] !== undefined ? localValues[cellKey] : (actualValue > 0 ? actualValue : "");

                  return (
                    <td
                      key={dateKey}
                      className={cn(
                        "p-3 border border-border text-center cursor-text",
                        `bg-heat-${heatLevel}`
                      )}
                      onClick={(e) => {
                        const editable = e.currentTarget.querySelector('[contenteditable]');
                        if (editable && e.target !== editable) {
                          (editable as HTMLElement).focus();
                          // Mover el cursor al final
                          const range = document.createRange();
                          const sel = window.getSelection();
                          range.selectNodeContents(editable);
                          range.collapse(false);
                          sel?.removeAllRanges();
                          sel?.addRange(range);
                        }
                      }}
                    >
                      <span
                        contentEditable
                        suppressContentEditableWarning
                        onMouseDown={(e) => {
                          // Prevenir la selección por defecto
                          const target = e.currentTarget;
                          setTimeout(() => {
                            target.focus();
                            const range = document.createRange();
                            const sel = window.getSelection();
                            if (target.childNodes.length > 0) {
                              const lastNode = target.childNodes[target.childNodes.length - 1];
                              range.setStart(lastNode, lastNode.textContent?.length || 0);
                              range.collapse(true);
                            } else {
                              range.selectNodeContents(target);
                              range.collapse(false);
                            }
                            sel?.removeAllRanges();
                            sel?.addRange(range);
                          }, 0);
                        }}
                        onFocus={(e) => {
                          // Mover el cursor al final cuando se enfoca
                          setTimeout(() => {
                            const range = document.createRange();
                            const sel = window.getSelection();
                            if (e.currentTarget.childNodes.length > 0) {
                              const lastNode = e.currentTarget.childNodes[e.currentTarget.childNodes.length - 1];
                              range.setStart(lastNode, lastNode.textContent?.length || 0);
                              range.collapse(true);
                            } else {
                              range.selectNodeContents(e.currentTarget);
                              range.collapse(false);
                            }
                            sel?.removeAllRanges();
                            sel?.addRange(range);
                          }, 10);
                        }}
                        onInput={(e) => {
                          const val = e.currentTarget.textContent || "";
                          if (val === "" || /^\d*\.?\d*$/.test(val)) {
                            setLocalValues(prev => ({ ...prev, [cellKey]: val }));
                          } else {
                            // Revertir al último valor válido
                            e.currentTarget.textContent = localValues[cellKey] || displayValue.toString();
                          }
                        }}
                        onBlur={(e) => {
                          const val = e.currentTarget.textContent || "";
                          const numValue = val === "" ? 0 : parseFloat(val) || 0;
                          // Solo actualizar si el valor cambió
                          if (numValue !== actualValue) {
                            onUpdateEntry(activity.id, dateKey, numValue);
                          }
                          // Limpiar el estado local
                          setLocalValues(prev => {
                            const newValues = { ...prev };
                            delete newValues[cellKey];
                            return newValues;
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        className="font-semibold text-foreground focus:outline-none block w-full"
                      >
                        {displayValue || ""}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
