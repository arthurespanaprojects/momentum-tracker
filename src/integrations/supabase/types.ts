export interface Database {
  public: {
    Tables: {
      activities: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          activity_type: "time" | "count";
          target_unit: string;
          created_at: string;
          display_order: number;
        };
      };
      daily_entries: {
        Row: {
          id: string;
          activity_id: string;
          entry_date: string;
          value_amount: number;
          created_at: string;
        };
      };
      weekly_goals: {
        Row: {
          id: string;
          activity_id: string;
          week_start_date: string;
          target_value: number;
          created_at: string;
        };
      };
      weekly_reflections: {
        Row: {
          id: string;
          activity_id: string;
          week_start_date: string;
          reflection_text: string;
          created_at: string;
        };
      };
    };
  };
}
