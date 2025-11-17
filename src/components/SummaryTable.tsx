import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

interface Activity {
  id: string;
  name: string;
}

interface WeeklySummary {
  [activityId: string]: {
    targetHours: number;
    realizedHours: number;
    reflection: string;
  };
}

interface SummaryTableProps {
  activities: Activity[];
  summary: WeeklySummary;
  onUpdateGoal: (activityId: string, hours: number) => void;
  onUpdateReflection: (activityId: string, text: string) => void;
}

export function SummaryTable({
  activities,
  summary,
  onUpdateGoal,
  onUpdateReflection,
}: SummaryTableProps) {
  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold mb-4 text-foreground">Resumen Semanal</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="p-3 text-left border border-border font-semibold text-foreground">Actividad</th>
              <th className="p-3 text-center border border-border font-semibold text-foreground">Meta (hrs)</th>
              <th className="p-3 text-center border border-border font-semibold text-foreground">Realizado (hrs)</th>
              <th className="p-3 text-center border border-border font-semibold text-foreground">Progreso</th>
              <th className="p-3 text-left border border-border font-semibold text-foreground">Conclusiones</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => {
              const data = summary[activity.id] || { targetHours: 0, realizedHours: 0, reflection: "" };
              const percentage = data.targetHours > 0 
                ? Math.min((data.realizedHours / data.targetHours) * 100, 100)
                : 0;

              return (
                <tr key={activity.id} className="bg-card">
                  <td className="p-3 border border-border font-medium text-foreground">
                    {activity.name}
                  </td>
                  <td className="p-3 border border-border">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={data.targetHours || ""}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        onUpdateGoal(activity.id, value);
                      }}
                      className="text-center max-w-24 mx-auto"
                    />
                  </td>
                  <td className="p-3 border border-border text-center font-semibold text-primary">
                    {data.realizedHours.toFixed(2)}
                  </td>
                  <td className="p-3 border border-border">
                    <div className="flex items-center gap-2">
                      <Progress value={percentage} className="flex-1" />
                      <span className="text-sm font-medium text-foreground min-w-12">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="p-3 border border-border">
                    <Textarea
                      value={data.reflection}
                      onChange={(e) => onUpdateReflection(activity.id, e.target.value)}
                      placeholder="Escribe tu reflexión..."
                      className="min-h-[60px] resize-none"
                    />
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
