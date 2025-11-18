import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Pencil, Check, X, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface AddActivityProps {
  onActivityAdded: () => void;
  onClose: () => void;
}

interface Activity {
  id: string;
  name: string;
  is_active: boolean;
  activity_type: "time" | "count";
}

export const AddActivity = ({ onActivityAdded, onClose }: AddActivityProps) => {
  const [newActivityName, setNewActivityName] = useState("");
  const [activityType, setActivityType] = useState<"time" | "count">("time");
  const [targetValue, setTargetValue] = useState("");
  const [timeUnit, setTimeUnit] = useState<"hours" | "minutes">("hours");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .order("display_order");
    
    if (!error && data) {
      setActivities(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newActivityName.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la actividad no puede estar vacío",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Primero crear la actividad
      const { data: activityData, error: activityError } = await supabase
        .from("activities")
        .insert({ 
          name: newActivityName.trim(), 
          is_active: true,
          activity_type: activityType
        })
        .select()
        .single();

      if (activityError) throw activityError;

      // Si hay un valor de meta, crear el weekly_goal
      let targetNum = parseFloat(targetValue);
      if (targetNum > 0 && activityData) {
        // Convertir minutos a horas si es necesario
        if (activityType === "time" && timeUnit === "minutes") {
          targetNum = targetNum / 60;
        }

        // Obtener el inicio de la semana actual
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() + diff);
        weekStart.setHours(0, 0, 0, 0);
        const weekStartDate = format(weekStart, "yyyy-MM-dd");

        const { error: goalError } = await supabase
          .from("weekly_goals")
          .insert({
            activity_id: activityData.id,
            week_start_date: weekStartDate,
            target_value: targetNum
          });

        if (goalError) throw goalError;
      }

      toast({
        title: "Éxito",
        description: `Actividad "${newActivityName}" creada correctamente`,
      });

      setNewActivityName("");
      setActivityType("time");
      setTargetValue("");
      setTimeUnit("hours");
      onClose();
      onActivityAdded();
      loadActivities();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la actividad",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (activity: Activity) => {
    try {
      const { error } = await supabase
        .from("activities")
        .update({ is_active: !activity.is_active })
        .eq("id", activity.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Actividad "${activity.name}" ${!activity.is_active ? 'activada' : 'desactivada'}`,
      });

      loadActivities();
      onActivityAdded();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la actividad",
        variant: "destructive",
      });
    }
  };

  const handleStartEdit = (activity: Activity) => {
    setEditingId(activity.id);
    setEditingName(activity.name);
  };

  const handleSaveEdit = async (activityId: string) => {
    if (!editingName.trim()) {
      toast({
        title: "Error",
        description: "El nombre no puede estar vacío",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("activities")
        .update({ name: editingName.trim() })
        .eq("id", activityId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Nombre actualizado correctamente",
      });

      setEditingId(null);
      setEditingName("");
      loadActivities();
      onActivityAdded();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el nombre",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  return (
    <div className="space-y-6">
      {/* Formulario de nueva actividad */}
      <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Nombre de la actividad</label>
        <Input
          type="text"
          placeholder="Ej: Leer, Tomar agua, Ejercicio..."
          value={newActivityName}
          onChange={(e) => setNewActivityName(e.target.value)}
          autoFocus
          disabled={isSubmitting}
        />
      </div>
      
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1 block">Tipo de actividad</label>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value as "time" | "count")}
            disabled={isSubmitting}
            className="w-full p-2 border rounded-md bg-background"
          >
            <option value="time">Por Tiempo</option>
            <option value="count">Por Veces</option>
          </select>
        </div>
        
        <div className="flex-1">
          <label className="text-sm font-medium mb-1 block">Meta semanal</label>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              step={activityType === "time" ? "0.5" : "1"}
              min="0"
              placeholder={activityType === "time" ? "Ej: 10" : "Ej: 21"}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              disabled={isSubmitting}
              className="flex-1"
            />
            {activityType === "time" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">hrs</span>
                <Switch
                  checked={timeUnit === "minutes"}
                  onCheckedChange={(checked) => setTimeUnit(checked ? "minutes" : "hours")}
                  disabled={isSubmitting}
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Guardando..." : "Agregar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onClose();
            setNewActivityName("");
            setActivityType("time");
            setTargetValue("");
            setTimeUnit("hours");
          }}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
      </div>
    </form>

    {/* Lista de actividades existentes */}
    <div className="border-t pt-4">
      <h3 className="text-lg font-semibold mb-3">Actividades Existentes</h3>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted/50 transition-colors"
          >
            {editingId === activity.id ? (
              <>
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleSaveEdit(activity.id)}
                  className="h-8 w-8"
                >
                  <Check className="h-4 w-4 text-success" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium">{activity.name}</span>
                <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                  {activity.activity_type === "time" ? "Tiempo" : "Veces"}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleStartEdit(activity)}
                  className="h-8 w-8"
                  title="Editar nombre"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleToggleActive(activity)}
                  className="h-8 w-8"
                  title={activity.is_active ? "Desactivar" : "Activar"}
                >
                  {activity.is_active ? (
                    <Eye className="h-4 w-4 text-success" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
  );
};
