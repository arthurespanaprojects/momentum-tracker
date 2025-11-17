import { useState } from "react";
import { startOfWeek, addWeeks, format } from "date-fns";
import { es } from "date-fns/locale";

export function useWeekNavigation() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const previousWeek = () => {
    setCurrentWeekStart((prev) => addWeeks(prev, -1));
  };

  const nextWeek = () => {
    setCurrentWeekStart((prev) => addWeeks(prev, 1));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const weekStartDate = format(currentWeekStart, "yyyy-MM-dd");
  const weekDisplay = format(currentWeekStart, "'Semana del' d 'al' ", { locale: es }) +
    format(addWeeks(currentWeekStart, 1).getTime() - 86400000, "d 'de' MMMM", { locale: es });

  return {
    currentWeekStart,
    weekStartDate,
    weekDisplay,
    previousWeek,
    nextWeek,
    goToToday,
  };
}
