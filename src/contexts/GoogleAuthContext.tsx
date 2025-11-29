import { createContext, useContext, ReactNode, useState } from 'react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';

interface GoogleAuthContextType {
  isSignedIn: boolean;
  isInitialized: boolean;
  userEmail: string | null;
  signIn: () => void;
  signOut: () => void;
  createEvent: (calendarId: string, event: any) => Promise<any>;
  updateEvent: (calendarId: string, eventId: string, event: any) => Promise<any>;
  deleteEvent: (calendarId: string, eventId: string) => Promise<void>;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | null>(null);

export function GoogleAuthProvider({ children, clientId }: { children: ReactNode; clientId: string }) {
  const googleAuth = useGoogleCalendar(clientId);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <GoogleAuthContext.Provider value={{ ...googleAuth, refreshTrigger, triggerRefresh }}>
      {children}
    </GoogleAuthContext.Provider>
  );
}

export function useGoogleAuth() {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuth must be used within GoogleAuthProvider');
  }
  return context;
}
