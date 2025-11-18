import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Play, X, GripVertical } from "lucide-react";
import { AddActivity } from "@/components/AddActivity";
import { useState, useEffect, useRef } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

interface WeeklySummary {
  [activityId: string]: {
    targetValue: number;
    realizedValue: number;
    reflection: string;
    activity_type?: "time" | "count";
    target_unit?: string;
  };
}

interface SummaryTableProps {
  activities: Activity[];
  summary: WeeklySummary;
  entries: DailyEntry;
  weekStart: Date;
  onUpdateGoal: (activityId: string, value: number) => void;
  onUpdateReflection: (activityId: string, text: string) => void;
  onUpdateEntry: (activityId: string, date: string, minutes: number) => void;
  onStartTimer: (activityId: string, activityName: string) => void;
  onActivityAdded: () => void;
  onReorderActivities: (fromActivityId: string, toActivityId: string) => void;
  onMoveToEnd: (activityId: string) => void;
}

export function SummaryTable({
  activities,
  summary,
  entries,
  weekStart,
  onUpdateGoal,
  onUpdateReflection,
  onUpdateEntry,
  onStartTimer,
  onActivityAdded,
  onReorderActivities,
  onMoveToEnd,
}: SummaryTableProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Obtener la fecha actual en zona horaria de La Paz (GMT-4)
  const getTodayInLaPaz = () => {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const laPazTime = new Date(utcTime + (-4 * 3600000));
    return laPazTime;
  };
  
  const today = getTodayInLaPaz();
  const [localValues, setLocalValues] = useState<{[key: string]: string}>({});
  const [goals, setGoals] = useState<{[activityId: string]: Array<{text: string, completed: boolean}>}>({});
  const [draggedActivity, setDraggedActivity] = useState<string | null>(null);
  const [dragOverActivity, setDragOverActivity] = useState<string | null>(null);
  const [celebratingActivity, setCelebratingActivity] = useState<string | null>(null);
  const [previousPercentages, setPreviousPercentages] = useState<{[activityId: string]: number}>({});
  const rowRefs = useRef<{[key: string]: HTMLTableRowElement | null}>({});
  const [celebrationPosition, setCelebrationPosition] = useState<{top: number, height: number} | null>(null);
  const [isDraggingFromHandle, setIsDraggingFromHandle] = useState(false);

  // Limpiar valores locales cuando cambia la semana
  useEffect(() => {
    setLocalValues({});
  }, [weekStart]);

  // Detectar cuando una actividad alcanza el 100%
  useEffect(() => {
    activities.forEach((activity, index) => {
      const data = summary[activity.id];
      if (!data || data.targetValue === 0) return;

      const activityType = data.activity_type || activity.activity_type || "time";
      const isTime = activityType === "time";
      const realizedInSameUnit = isTime ? data.realizedValue / 60 : data.realizedValue;
      const percentage = Math.min((realizedInSameUnit / data.targetValue) * 100, 100);
      const previousPercentage = previousPercentages[activity.id] || 0;

      // Si alcanzó el 100% y antes no lo había alcanzado
      if (percentage >= 100 && previousPercentage < 100 && index !== activities.length - 1) {
        setCelebratingActivity(activity.id);
        
        // Obtener posición de la fila
        const row = rowRefs.current[activity.id];
        if (row) {
          const rect = row.getBoundingClientRect();
          const container = row.closest('.overflow-x-auto');
          const containerRect = container?.getBoundingClientRect();
          if (containerRect) {
            setCelebrationPosition({
              top: rect.top - containerRect.top,
              height: rect.height
            });
          }
        }
        
        // Mostrar animación por 2 segundos, luego mover al final
        setTimeout(() => {
          setCelebratingActivity(null);
          setCelebrationPosition(null);
          onMoveToEnd(activity.id);
        }, 2000);
      }

      // Actualizar el porcentaje anterior
      if (percentage !== previousPercentage) {
        setPreviousPercentages(prev => ({ ...prev, [activity.id]: percentage }));
      }
    });
  }, [summary, activities, previousPercentages, onMoveToEnd]);

  const handleDragStart = (e: React.DragEvent, activityId: string) => {
    if (!isDraggingFromHandle) {
      e.preventDefault();
      return;
    }
    setDraggedActivity(activityId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, activityId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedActivity && draggedActivity !== activityId) {
      setDragOverActivity(activityId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetActivityId: string) => {
    e.preventDefault();
    
    if (!draggedActivity || draggedActivity === targetActivityId) {
      setDraggedActivity(null);
      setDragOverActivity(null);
      return;
    }

    // Llamar a onReorderActivities con los IDs de origen y destino
    onReorderActivities(draggedActivity, targetActivityId);

    setDraggedActivity(null);
    setDragOverActivity(null);
  };

  const handleDragEnd = () => {
    setDraggedActivity(null);
    setDragOverActivity(null);
    setIsDraggingFromHandle(false);
  };

  const getHeatLevel = (value: number, isTime: boolean): number => {
    if (value === 0) return 0;
    
    if (isTime) {
      const hours = value / 60;
      if (hours < 1) return 1;
      if (hours < 2) return 2;
      if (hours < 3) return 3;
      if (hours < 4) return 4;
      return 5;
    } else {
      if (value < 3) return 1;
      if (value < 6) return 2;
      if (value < 10) return 3;
      if (value < 15) return 4;
      return 5;
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-foreground">Resumen Semanal</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="rounded-full h-10 w-10">
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gestionar Actividades</DialogTitle>
            </DialogHeader>
            <AddActivity 
              onActivityAdded={onActivityAdded} 
              onClose={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto relative">
        {celebratingActivity && celebrationPosition && (
          <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            <div 
              className="absolute left-0 right-0"
              style={{ 
                top: `${celebrationPosition.top}px`,
                height: `${celebrationPosition.height}px`
              }}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-success to-transparent animate-pulse" />
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-success to-transparent animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-success/10 to-transparent animate-pulse" style={{ animationDuration: '1s' }} />
              {/* Sparkles */}
              <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-success rounded-full animate-ping" style={{ animationDelay: '0s' }} />
              <div className="absolute top-1/3 left-1/2 w-2 h-2 bg-success rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
              <div className="absolute top-2/3 left-3/4 w-2 h-2 bg-success rounded-full animate-ping" style={{ animationDelay: '0.6s' }} />
            </div>
          </div>
        )}
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left border border-border font-semibold text-foreground sticky left-0 bg-muted z-10 min-w-[140px]">Actividad</th>
              {weekDays.map((day) => (
                <th
                  key={day.toISOString()}
                  className={cn(
                    "p-2 text-center border border-border font-semibold min-w-[50px] max-w-[50px]",
                    isSameDay(day, today) ? "bg-primary/10" : "bg-muted"
                  )}
                >
                  <div className="text-xs text-foreground">
                    {format(day, "EEE", { locale: es })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(day, "d MMM", { locale: es })}
                  </div>
                </th>
              ))}
              <th className="p-2 text-center border border-border font-semibold text-foreground min-w-[70px] max-w-[70px]">Total</th>
              <th className="p-2 text-center border border-border font-semibold text-foreground min-w-[90px] max-w-[90px]">Progreso</th>
              <th className="p-2 text-center border border-border font-semibold text-foreground min-w-[90px] max-w-[90px]">Metas</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => {
              const data = summary[activity.id] || { 
                targetValue: 0, 
                realizedValue: 0, 
                reflection: "",
                activity_type: activity.activity_type || "time",
                target_unit: activity.target_unit || "horas"
              };
              
              const activityType = data.activity_type || activity.activity_type || "time";
              const targetUnit = data.target_unit || activity.target_unit || "horas";
              const isTime = activityType === "time";
              
              // Para actividades de tiempo, convertir realizedValue (minutos) a horas para comparar
              const realizedInSameUnit = isTime ? data.realizedValue / 60 : data.realizedValue;
              
              const percentage = data.targetValue > 0 
                ? Math.min((realizedInSameUnit / data.targetValue) * 100, 100)
                : 0;

              // Para actividades de tiempo, convertir a horas para mostrar
              const displayTarget = data.targetValue;
              const displayRealized = isTime ? (data.realizedValue / 60).toFixed(2) : data.realizedValue.toFixed(0);
              
              // Determinar si se superó la meta
              const isOverTarget = realizedInSameUnit > data.targetValue && data.targetValue > 0;

              return (
                <tr 
                  key={activity.id}
                  ref={(el) => rowRefs.current[activity.id] = el}
                  className={cn(
                    "bg-card transition-all",
                    draggedActivity === activity.id && "opacity-50",
                    dragOverActivity === activity.id && "border-t-2 border-t-primary",
                    celebratingActivity === activity.id && "bg-gradient-to-r from-success/20 via-success/30 to-success/20"
                  )}
                  draggable
                  onDragStart={(e) => handleDragStart(e, activity.id)}
                  onDragOver={(e) => handleDragOver(e, activity.id)}
                  onDrop={(e) => handleDrop(e, activity.id)}
                  onDragEnd={handleDragEnd}
                >
                  <td className="p-2 border border-border font-medium text-foreground sticky left-0 bg-card z-10">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                          title="Arrastrar para reordenar"
                          onMouseDown={() => setIsDraggingFromHandle(true)}
                          onMouseUp={() => setIsDraggingFromHandle(false)}
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <span className="text-base">{activity.name}</span>
                      </div>
                      {isTime ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => onStartTimer(activity.id, activity.name)}
                          title="Iniciar cronómetro"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
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
                          "p-2 border border-border text-center cursor-text",
                          `bg-heat-${heatLevel}`
                        )}
                      >
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => {
                            const val = e.currentTarget.textContent || "";
                            if (val === "" || /^\d*\.?\d*$/.test(val)) {
                              setLocalValues(prev => ({ ...prev, [cellKey]: val }));
                            } else {
                              e.currentTarget.textContent = localValues[cellKey] || displayValue.toString();
                            }
                          }}
                          onBlur={(e) => {
                            const val = e.currentTarget.textContent || "";
                            const numValue = val === "" ? 0 : parseFloat(val) || 0;
                            if (numValue !== actualValue) {
                              onUpdateEntry(activity.id, dateKey, numValue);
                            }
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
                          className="font-semibold text-foreground focus:outline-none block w-full text-base"
                        >
                          {displayValue || ""}
                        </span>
                      </td>
                    );
                  })}
                  <td className="p-2 border border-border text-center max-w-[70px]">
                    <span 
                      className="font-semibold"
                      style={{ 
                        color: percentage >= 100 
                          ? '#22c55e' 
                          : percentage >= 75 
                            ? '#10b981' 
                            : percentage >= 50
                              ? '#059669'
                              : percentage >= 25
                                ? '#047857'
                                : realizedInSameUnit > 0
                                  ? '#065f46'
                                  : '#6b7280'
                      }}
                    >
                      {displayRealized}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">{isTime ? "hrs" : "vcs"}</span>
                  </td>
                  <td 
                    className="p-2 border border-border cursor-text"
                    onClick={(e) => {
                      const editable = e.currentTarget.querySelector('[contenteditable]');
                      if (editable && e.target !== editable) {
                        (editable as HTMLElement).focus();
                        const range = document.createRange();
                        const sel = window.getSelection();
                        range.selectNodeContents(editable);
                        range.collapse(false);
                        sel?.removeAllRanges();
                        sel?.addRange(range);
                      }
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-center">
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onFocus={(e) => {
                            const range = document.createRange();
                            const sel = window.getSelection();
                            range.selectNodeContents(e.currentTarget);
                            range.collapse(false);
                            sel?.removeAllRanges();
                            sel?.addRange(range);
                          }}
                          onBlur={(e) => {
                            const value = parseFloat(e.currentTarget.textContent || "0") || 0;
                            onUpdateGoal(activity.id, value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                          className="font-semibold text-foreground focus:outline-none"
                        >
                          {displayTarget || 0}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">
                          {isTime ? "hrs" : "vcs"}
                        </span>
                      </div>
                      <div className="relative h-3 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'hsl(240, 4%, 16%)' }}>
                        <div
                          className="h-full transition-all duration-500 ease-out"
                          style={{ 
                            width: `${Math.min(percentage, 100)}%`,
                            background: percentage >= 100 
                              ? 'linear-gradient(90deg, #22c55e 0%, #4ade80 100%)'
                              : percentage >= 75
                                ? 'linear-gradient(90deg, #059669 0%, #10b981 100%)'
                                : percentage >= 50
                                  ? 'linear-gradient(90deg, #047857 0%, #059669 100%)'
                                  : percentage >= 25
                                    ? 'linear-gradient(90deg, #064e3b 0%, #047857 100%)'
                                    : percentage > 0
                                      ? '#065f46'
                                      : 'transparent'
                          }}
                        />
                        {isOverTarget && (
                          <div className="absolute inset-0 pointer-events-none">
                            <div 
                              className="h-full w-full animate-pulse"
                              style={{ 
                                background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.6) 50%, rgba(34, 197, 94, 0.3) 100%)'
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <span className={`text-sm font-medium transition-colors ${
                        percentage >= 100 ? 'text-success font-bold' : 'text-muted-foreground'
                      }`}>
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="border border-border p-2 max-w-[90px]">
                    <div className="flex flex-col gap-1">
                      {(goals[activity.id] || []).map((goal, idx) => (
                        <div key={idx} className="flex items-start gap-1 group">
                          <Checkbox
                            checked={goal.completed}
                            onCheckedChange={(checked) => {
                              const newGoals = [...(goals[activity.id] || [])];
                              newGoals[idx] = { ...goal, completed: checked as boolean };
                              setGoals({ ...goals, [activity.id]: newGoals });
                            }}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <span 
                            className={cn(
                              "text-xs flex-1",
                              goal.completed && "line-through text-muted-foreground"
                            )}
                          >
                            {goal.text}
                          </span>
                          <button
                            onClick={() => {
                              const newGoals = (goals[activity.id] || []).filter((_, i) => i !== idx);
                              setGoals({ ...goals, [activity.id]: newGoals });
                            }}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity flex-shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {(!goals[activity.id] || goals[activity.id].length < 2) && (
                        <input
                          type="text"
                          placeholder="+Meta"
                          className="text-xs bg-transparent border-0 focus:outline-none placeholder:text-muted-foreground/50 p-0"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              const newGoal = { text: e.currentTarget.value.trim(), completed: false };
                              const currentGoals = goals[activity.id] || [];
                              setGoals({ ...goals, [activity.id]: [...currentGoals, newGoal] });
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
