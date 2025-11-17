import { addDays, format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  name: string;
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
  onUpdateEntry: (activityId: string, date: string, hours: number) => void;
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

  const getHeatLevel = (hours: number): number => {
    if (hours === 0) return 0;
    if (hours < 1) return 1;
    if (hours < 2) return 2;
    if (hours < 3) return 3;
    if (hours < 4) return 4;
    return 5;
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
          {activities.map((activity) => (
            <tr key={activity.id}>
              <td className="p-3 border border-border bg-card font-medium text-foreground">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onStartTimer(activity.id, activity.name)}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  {activity.name}
                </div>
              </td>
              {weekDays.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const hours = entries[activity.id]?.[dateKey] || 0;
                const heatLevel = getHeatLevel(hours);

                return (
                  <td
                    key={dateKey}
                    className={cn(
                      "p-1 border border-border",
                      `bg-heat-${heatLevel}`
                    )}
                  >
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={hours || ""}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        onUpdateEntry(activity.id, dateKey, value);
                      }}
                      className="text-center bg-transparent border-none h-8 text-foreground"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
