import { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { useWeekNavigation } from "@/hooks/use-week-navigation";
import { WeekNavigator } from "@/components/WeekNavigator";
import { SummaryTable } from "@/components/SummaryTable";
import { ActivityTimer } from "@/components/ActivityTimer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

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

const Index = () => {
  const { weekStartDate, weekDisplay, previousWeek, nextWeek, goToToday, currentWeekStart } = useWeekNavigation();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [entries, setEntries] = useState<DailyEntry>({});
  const [summary, setSummary] = useState<WeeklySummary>({});
  const [loading, setLoading] = useState(true);
  const [timerActivity, setTimerActivity] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const handleReorderActivities = async (fromActivityId: string, toActivityId: string) => {
    const fromIndex = activities.findIndex(a => a.id === fromActivityId);
    const toIndex = activities.findIndex(a => a.id === toActivityId);
    
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    // Reordenar localmente primero para feedback inmediato
    const newActivities = [...activities];
    const [movedActivity] = newActivities.splice(fromIndex, 1);
    
    // Ajustar el índice de destino si estamos moviendo hacia abajo
    // Cuando removemos un elemento antes del destino, el índice del destino disminuye en 1
    const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
    newActivities.splice(adjustedToIndex, 0, movedActivity);
    
    setActivities(newActivities);

    // Actualizar display_order en la base de datos
    try {
      const updates = newActivities.map((activity, index) => ({
        id: activity.id,
        display_order: index
      }));

      for (const update of updates) {
        await supabase
          .from('activities')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el orden de las actividades",
        variant: "destructive",
      });
      // Recargar datos si falla
      loadDashboardData();
    }
  };

  const handleMoveToEnd = async (activityId: string) => {
    const currentIndex = activities.findIndex(a => a.id === activityId);
    if (currentIndex === -1 || currentIndex === activities.length - 1) return;

    // Mover al final
    const newActivities = [...activities];
    const [movedActivity] = newActivities.splice(currentIndex, 1);
    newActivities.push(movedActivity);
    
    setActivities(newActivities);

    // Actualizar display_order en la base de datos
    try {
      const updates = newActivities.map((activity, index) => ({
        id: activity.id,
        display_order: index
      }));

      for (const update of updates) {
        await supabase
          .from('activities')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }
    } catch (error) {
      console.error('Error moving to end:', error);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("activities")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (activitiesError) throw activitiesError;

      const activityList: Activity[] = activitiesData.map((a) => ({ 
        id: a.id, 
        name: a.name,
        activity_type: a.activity_type || "time",
        target_unit: a.target_unit || "horas"
      }));
      setActivities(activityList);

      const weekDates = Array.from({ length: 7 }, (_, i) =>
        format(addDays(currentWeekStart, i), "yyyy-MM-dd")
      );

      const { data: entriesData, error: entriesError } = await supabase
        .from("daily_entries")
        .select("*")
        .in("entry_date", weekDates);

      if (entriesError) throw entriesError;

      const entriesMap: DailyEntry = {};
      entriesData.forEach((entry) => {
        if (!entriesMap[entry.activity_id]) {
          entriesMap[entry.activity_id] = {};
        }
        entriesMap[entry.activity_id][entry.entry_date] = entry.value_amount;
      });
      setEntries(entriesMap);

      const { data: goalsData } = await supabase
        .from("weekly_goals")
        .select("*")
        .eq("week_start_date", weekStartDate);

      const { data: reflectionsData } = await supabase
        .from("weekly_reflections")
        .select("*")
        .eq("week_start_date", weekStartDate);

      const summaryMap: WeeklySummary = {};
      activityList.forEach((activity) => {
        const goal = goalsData?.find((g) => g.activity_id === activity.id);
        const reflection = reflectionsData?.find((r) => r.activity_id === activity.id);
        
        const realizedValue = weekDates.reduce((sum, date) => {
          return sum + (entriesMap[activity.id]?.[date] || 0);
        }, 0);

        summaryMap[activity.id] = {
          targetValue: goal?.target_value || 0,
          realizedValue,
          reflection: reflection?.reflection_text || "",
          activity_type: activity.activity_type,
          target_unit: activity.target_unit,
        };
      });
      setSummary(summaryMap);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [weekStartDate]);

  const handleUpdateEntry = async (activityId: string, date: string, value: number) => {
    // Actualizar el estado local inmediatamente
    const updatedEntries = {
      ...entries,
      [activityId]: {
        ...entries[activityId],
        [date]: value,
      },
    };
    setEntries(updatedEntries);

    try {
      const { error } = await supabase
        .from("daily_entries")
        .upsert({
          activity_id: activityId,
          entry_date: date,
          value_amount: value,
        }, {
          onConflict: 'activity_id,entry_date'
        });

      if (error) throw error;

      const weekDates = Array.from({ length: 7 }, (_, i) =>
        format(addDays(currentWeekStart, i), "yyyy-MM-dd")
      );
      
      const realizedValue = weekDates.reduce((sum, d) => {
        return sum + (updatedEntries[activityId]?.[d] || 0);
      }, 0);

      setSummary((prev) => ({
        ...prev,
        [activityId]: {
          ...prev[activityId],
          realizedValue,
        },
      }));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateGoal = async (activityId: string, value: number) => {
    try {
      const { error } = await supabase
        .from("weekly_goals")
        .upsert({
          activity_id: activityId,
          week_start_date: weekStartDate,
          target_value: value,
        }, {
          onConflict: 'activity_id,week_start_date'
        });

      if (error) throw error;

      setSummary((prev) => ({
        ...prev,
        [activityId]: {
          ...prev[activityId],
          targetValue: value,
        },
      }));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateReflection = async (activityId: string, text: string) => {
    try {
      const { error } = await supabase
        .from("weekly_reflections")
        .upsert({
          activity_id: activityId,
          week_start_date: weekStartDate,
          reflection_text: text,
        }, {
          onConflict: 'activity_id,week_start_date'
        });

      if (error) throw error;

      setSummary((prev) => ({
        ...prev,
        [activityId]: {
          ...prev[activityId],
          reflection: text,
        },
      }));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTimerStop = async (activityId: string, minutes: number) => {
    const todayDate = format(new Date(), "yyyy-MM-dd");
    const currentMinutes = entries[activityId]?.[todayDate] || 0;
    const newTotal = currentMinutes + minutes;
    
    await handleUpdateEntry(activityId, todayDate, newTotal);
    setTimerActivity(null);
    
    const hours = (minutes / 60).toFixed(2);
    toast({
      title: "Tiempo guardado",
      description: `Se agregaron ${hours} horas (${minutes} minutos) a ${timerActivity?.name}`,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl font-display font-bold text-primary mb-4 animate-pulse">
            MOMENTUM
          </div>
          <p className="text-lg text-muted-foreground font-medium">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8 relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent tracking-tight">
              MOMENTUM
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-4 pl-3">
            Seguimiento de Hábitos y Objetivos
          </p>
        </div>

        <WeekNavigator
          weekDisplay={weekDisplay}
          onPrevious={previousWeek}
          onNext={nextWeek}
          onToday={goToToday}
        />

        <SummaryTable
          activities={activities}
          summary={summary}
          entries={entries}
          weekStart={currentWeekStart}
          onUpdateGoal={handleUpdateGoal}
          onUpdateReflection={handleUpdateReflection}
          onUpdateEntry={handleUpdateEntry}
          onStartTimer={(id, name) => setTimerActivity({ id, name })}
          onActivityAdded={loadDashboardData}
          onReorderActivities={handleReorderActivities}
          onMoveToEnd={handleMoveToEnd}
        />

        <ActivityTimer
          activityId={timerActivity?.id || null}
          activityName={timerActivity?.name || ""}
          previousMinutes={timerActivity?.id ? (entries[timerActivity.id]?.[format(new Date(), "yyyy-MM-dd")] || 0) : 0}
          onStop={handleTimerStop}
          onCancel={() => setTimerActivity(null)}
        />
      </div>
    </div>
  );
};

export default Index;
