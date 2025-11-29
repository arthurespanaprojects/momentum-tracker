import { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { useWeekNavigation } from "@/hooks/use-week-navigation";
import { WeekNavigator } from "@/components/WeekNavigator";
import { SummaryTable } from "@/components/SummaryTable";
import { ActivityTimer } from "@/components/ActivityTimer";
import { GoogleCalendar } from "@/components/GoogleCalendar";
import { TodayTasks } from "@/components/TodayTasks";
import { GoogleAuthProvider } from "@/contexts/GoogleAuthContext";
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

interface ActivityGoal {
  id?: string;
  text: string;
  completed: boolean;
  display_order?: number;
}

const Index = () => {
  const { weekStartDate, weekDisplay, previousWeek, nextWeek, goToToday, currentWeekStart } = useWeekNavigation();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [entries, setEntries] = useState<DailyEntry>({});
  const [summary, setSummary] = useState<WeeklySummary>({});
  const [activityGoals, setActivityGoals] = useState<{[activityId: string]: ActivityGoal[]}>({});
  const [loading, setLoading] = useState(true);
  const [timerActivity, setTimerActivity] = useState<{ id: string; name: string; forDate: string } | null>(null);
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

      let { data: goalsData } = await supabase
        .from("weekly_goals")
        .select("*")
        .eq("week_start_date", weekStartDate);

      const { data: reflectionsData } = await supabase
        .from("weekly_reflections")
        .select("*")
        .eq("week_start_date", weekStartDate);

      // Para cada actividad sin objetivo, copiar de la semana anterior
      for (const activity of activityList) {
        const hasGoal = goalsData?.find(g => g.activity_id === activity.id);
        
        if (!hasGoal) {
          // Buscar objetivo de la semana anterior para esta actividad
          const previousWeekDate = format(addDays(new Date(weekStartDate), -7), "yyyy-MM-dd");
          const { data: previousGoal } = await supabase
            .from("weekly_goals")
            .select("*")
            .eq("week_start_date", previousWeekDate)
            .eq("activity_id", activity.id)
            .single();

          if (previousGoal) {
            // Copiar objetivo de la semana anterior
            const { data: newGoal } = await supabase
              .from("weekly_goals")
              .insert({
                activity_id: activity.id,
                week_start_date: weekStartDate,
                target_value: previousGoal.target_value,
              })
              .select()
              .single();

            if (newGoal) {
              if (!goalsData) {
                goalsData = [newGoal];
              } else {
                goalsData.push(newGoal);
              }
            }
          }
        }
      }

      // Cargar metas de actividad (checkboxes)
      let { data: activityGoalsData } = await supabase
        .from("activity_goals")
        .select("*")
        .eq("week_start_date", weekStartDate)
        .order("display_order");

      // Para cada actividad sin metas, copiar de la semana anterior (solo NO completadas)
      const previousWeekDate = format(addDays(new Date(weekStartDate), -7), "yyyy-MM-dd");
      
      for (const activity of activityList) {
        const hasMetas = activityGoalsData?.find(ag => ag.activity_id === activity.id);
        
        if (!hasMetas) {
          // Buscar metas NO completadas de la semana anterior para esta actividad
          const { data: previousMetas } = await supabase
            .from("activity_goals")
            .select("*")
            .eq("week_start_date", previousWeekDate)
            .eq("activity_id", activity.id)
            .eq("completed", false)  // Solo copiar metas NO completadas
            .order("display_order");

          if (previousMetas && previousMetas.length > 0) {
            // Copiar metas de la semana anterior
            const newActivityGoals = previousMetas.map(prevGoal => ({
              activity_id: activity.id,
              week_start_date: weekStartDate,
              goal_text: prevGoal.goal_text,
              completed: false,
              display_order: prevGoal.display_order,
            }));

            const { data: insertedGoals } = await supabase
              .from("activity_goals")
              .insert(newActivityGoals)
              .select();

            if (insertedGoals) {
              if (!activityGoalsData) {
                activityGoalsData = insertedGoals;
              } else {
                activityGoalsData.push(...insertedGoals);
              }
            }
          }
        }
      }

      const activityGoalsMap: {[activityId: string]: ActivityGoal[]} = {};
      activityGoalsData?.forEach((ag) => {
        if (!activityGoalsMap[ag.activity_id]) {
          activityGoalsMap[ag.activity_id] = [];
        }
        activityGoalsMap[ag.activity_id].push({
          id: ag.id,
          text: ag.goal_text,
          completed: ag.completed,
          display_order: ag.display_order,
        });
      });
      setActivityGoals(activityGoalsMap);

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
    const targetDate = timerActivity?.forDate || format(new Date(), "yyyy-MM-dd");
    const currentMinutes = entries[activityId]?.[targetDate] || 0;
    const newTotal = currentMinutes + minutes;
    
    await handleUpdateEntry(activityId, targetDate, newTotal);
    setTimerActivity(null);
    
    const hours = (minutes / 60).toFixed(2);
    toast({
      title: "Tiempo guardado",
      description: `Se agregaron ${hours} horas (${minutes} minutos) a ${timerActivity?.name}`,
    });
  };

  const handleAddActivityGoal = async (activityId: string, text: string) => {
    try {
      const currentGoals = activityGoals[activityId] || [];
      const display_order = currentGoals.length;

      const { data, error } = await supabase
        .from("activity_goals")
        .insert({
          activity_id: activityId,
          week_start_date: weekStartDate,
          goal_text: text,
          completed: false,
          display_order,
        })
        .select()
        .single();

      if (error) throw error;

      setActivityGoals(prev => ({
        ...prev,
        [activityId]: [...(prev[activityId] || []), {
          id: data.id,
          text: data.goal_text,
          completed: data.completed,
          display_order: data.display_order,
        }]
      }));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActivityGoal = async (activityId: string, goalId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("activity_goals")
        .update({ 
          completed,
          completed_at: completed ? new Date().toISOString() : null
        })
        .eq("id", goalId);

      if (error) throw error;

      setActivityGoals(prev => ({
        ...prev,
        [activityId]: (prev[activityId] || []).map(goal =>
          goal.id === goalId ? { ...goal, completed } : goal
        )
      }));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteActivityGoal = async (activityId: string, goalId: string) => {
    try {
      const { error } = await supabase
        .from("activity_goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;

      setActivityGoals(prev => ({
        ...prev,
        [activityId]: (prev[activityId] || []).filter(goal => goal.id !== goalId)
      }));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
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
    <GoogleAuthProvider clientId={import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || ''}>
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
          activityGoals={activityGoals}
          onUpdateGoal={handleUpdateGoal}
          onUpdateReflection={handleUpdateReflection}
          onUpdateEntry={handleUpdateEntry}
          onStartTimer={(id, name, forDate) => setTimerActivity({ id, name, forDate })}
          onActivityAdded={loadDashboardData}
          onReorderActivities={handleReorderActivities}
          onMoveToEnd={handleMoveToEnd}
          onAddActivityGoal={handleAddActivityGoal}
          onToggleActivityGoal={handleToggleActivityGoal}
          onDeleteActivityGoal={handleDeleteActivityGoal}
        />

        <ActivityTimer
          activityId={timerActivity?.id || null}
          activityName={timerActivity?.name || ""}
          forDate={timerActivity?.forDate || format(new Date(), "yyyy-MM-dd")}
          previousMinutes={timerActivity?.id && timerActivity?.forDate ? (entries[timerActivity.id]?.[timerActivity.forDate] || 0) : 0}
          dailyGoalMinutes={timerActivity?.id ? (() => {
            const activity = activities.find(a => a.id === timerActivity.id);
            const data = summary[timerActivity.id];
            if (!data || data.targetValue === 0) return undefined;
            
            const isTime = (data.activity_type || activity?.activity_type || "time") === "time";
            if (!isTime) return undefined; // Solo para actividades de tiempo
            
            // Calcular meta diaria dinámica
            const today = new Date();
            const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
            const totalRealized = weekDays.reduce((sum, d) => {
              const dKey = format(d, "yyyy-MM-dd");
              return sum + (entries[timerActivity.id]?.[dKey] || 0);
            }, 0);
            
            const remaining = data.targetValue - (totalRealized / 60);
            if (remaining <= 0) return undefined;
            
            const todayIndex = weekDays.findIndex(d => 
              d.getFullYear() === today.getFullYear() &&
              d.getMonth() === today.getMonth() &&
              d.getDate() === today.getDate()
            );
            
            if (todayIndex === -1) return undefined;
            
            const daysRemaining = 7 - todayIndex;
            const dailyTarget = remaining / daysRemaining;
            const dayOfWeek = today.getDay();
            const adjustedTarget = dayOfWeek === 0 ? dailyTarget * 0.7 : dailyTarget;
            
            return Math.ceil(adjustedTarget * 60); // Convertir a minutos
          })() : undefined}
          onStop={handleTimerStop}
          onCancel={() => setTimerActivity(null)}
        />

        {/* Tareas de Hoy y Mañana */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <TodayTasks
            calendarIds={[
              import.meta.env.VITE_GOOGLE_CALENDAR_PRIMARY,
              import.meta.env.VITE_GOOGLE_CALENDAR_SECONDARY
            ].filter(Boolean)}
            targetDate={new Date()}
            title="Tareas de Hoy"
          />
          <TodayTasks
            calendarIds={[
              import.meta.env.VITE_GOOGLE_CALENDAR_PRIMARY,
              import.meta.env.VITE_GOOGLE_CALENDAR_SECONDARY
            ].filter(Boolean)}
            targetDate={addDays(new Date(), 1)}
            title="Tareas de Mañana"
          />
        </div>

        {/* Google Calendar */}
        <div className="mt-8">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
              <h2 className="text-2xl font-display font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent tracking-tight">
                Calendario
              </h2>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden border-2 border-border shadow-lg p-4 bg-card">
            <GoogleCalendar
              apiKey={import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY || ''}
              clientId={import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || ''}
              calendarIds={[
                import.meta.env.VITE_GOOGLE_CALENDAR_PRIMARY,
                import.meta.env.VITE_GOOGLE_CALENDAR_SECONDARY
              ].filter(Boolean)}
            />
          </div>
        </div>
      </div>
    </div>
    </GoogleAuthProvider>
  );
};

export default Index;
