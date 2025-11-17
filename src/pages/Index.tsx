import { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { useWeekNavigation } from "@/hooks/use-week-navigation";
import { WeekNavigator } from "@/components/WeekNavigator";
import { SummaryTable } from "@/components/SummaryTable";
import { DailyMatrix } from "@/components/DailyMatrix";
import { ActivityTimer } from "@/components/ActivityTimer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Activity {
  id: string;
  name: string;
}

interface DailyEntry {
  [activityId: string]: {
    [date: string]: number;
  };
}

interface WeeklySummary {
  [activityId: string]: {
    targetHours: number;
    realizedHours: number;
    reflection: string;
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

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("activities")
        .select("*")
        .eq("is_active", true)
        .order("created_at");

      if (activitiesError) throw activitiesError;

      const activityList: Activity[] = activitiesData.map((a) => ({ id: a.id, name: a.name }));
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
        entriesMap[entry.activity_id][entry.entry_date] = entry.hours_spent;
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
        
        const realizedHours = weekDates.reduce((sum, date) => {
          return sum + (entriesMap[activity.id]?.[date] || 0);
        }, 0);

        summaryMap[activity.id] = {
          targetHours: goal?.target_hours || 0,
          realizedHours,
          reflection: reflection?.reflection_text || "",
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

  const handleUpdateEntry = async (activityId: string, date: string, hours: number) => {
    try {
      const { error } = await supabase
        .from("daily_entries")
        .upsert({
          activity_id: activityId,
          entry_date: date,
          hours_spent: hours,
        });

      if (error) throw error;

      setEntries((prev) => ({
        ...prev,
        [activityId]: {
          ...prev[activityId],
          [date]: hours,
        },
      }));

      const weekDates = Array.from({ length: 7 }, (_, i) =>
        format(addDays(currentWeekStart, i), "yyyy-MM-dd")
      );
      
      const realizedHours = weekDates.reduce((sum, d) => {
        return sum + (d === date ? hours : (entries[activityId]?.[d] || 0));
      }, 0);

      setSummary((prev) => ({
        ...prev,
        [activityId]: {
          ...prev[activityId],
          realizedHours,
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

  const handleUpdateGoal = async (activityId: string, hours: number) => {
    try {
      const { error } = await supabase
        .from("weekly_goals")
        .upsert({
          activity_id: activityId,
          week_start_date: weekStartDate,
          target_hours: hours,
        });

      if (error) throw error;

      setSummary((prev) => ({
        ...prev,
        [activityId]: {
          ...prev[activityId],
          targetHours: hours,
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

  const handleTimerStop = async (activityId: string, hours: number) => {
    const todayDate = format(new Date(), "yyyy-MM-dd");
    const currentHours = entries[activityId]?.[todayDate] || 0;
    const newTotal = currentHours + hours;
    
    await handleUpdateEntry(activityId, todayDate, newTotal);
    setTimerActivity(null);
    
    toast({
      title: "Tiempo guardado",
      description: `Se agregaron ${hours.toFixed(2)} horas a ${timerActivity?.name}`,
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
        <div className="mb-10">
          <h1 className="text-6xl font-display font-bold text-primary mb-3 tracking-tight">
            MOMENTUM
          </h1>
          <p className="text-xl text-muted-foreground font-medium">
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
          onUpdateGoal={handleUpdateGoal}
          onUpdateReflection={handleUpdateReflection}
        />

        <div className="mb-8">
          <h3 className="text-2xl font-display font-bold mb-6 text-foreground">
            Registro Diario
          </h3>
          <DailyMatrix
            weekStart={currentWeekStart}
            activities={activities}
            entries={entries}
            onUpdateEntry={handleUpdateEntry}
            onStartTimer={(id, name) => setTimerActivity({ id, name })}
          />
        </div>

        <ActivityTimer
          activityId={timerActivity?.id || null}
          activityName={timerActivity?.name || ""}
          onStop={handleTimerStop}
          onCancel={() => setTimerActivity(null)}
        />
      </div>
    </div>
  );
};

export default Index;
