import { useState, useEffect, useCallback, useRef } from 'react';

// Tipos para eventos del calendario
export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone: string;
  };
  status?: 'confirmed' | 'tentative' | 'cancelled';
  eventType?: 'default' | 'task';
}

export interface GoogleTask {
  id?: string;
  title: string;
  notes?: string;
  due?: string;
  status?: 'needsAction' | 'completed';
}

const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks';
const STORAGE_KEY = 'google_oauth_token';
const STORAGE_EMAIL_KEY = 'google_user_email';
const TOKEN_EXPIRY_KEY = 'google_token_expiry';
const DEFAULT_TASK_LIST = '@default'; // Lista de tareas por defecto de Google

export const useGoogleCalendar = (clientId: string) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const tokenClientRef = useRef<any>(null);
  const gapiInited = useRef(false);
  const gisInited = useRef(false);

  // Función para guardar token de forma segura
  const saveToken = (token: string, email: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, token);
      localStorage.setItem(STORAGE_EMAIL_KEY, email);
      // Token expira en 1 hora (3600 segundos)
      const expiryTime = Date.now() + (3600 * 1000);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    } catch (error) {
      console.error('Error guardando token:', error);
    }
  };

  // Función para recuperar token si aún es válido
  const loadToken = () => {
    try {
      const token = localStorage.getItem(STORAGE_KEY);
      const email = localStorage.getItem(STORAGE_EMAIL_KEY);
      const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
      
      if (token && email && expiry) {
        const expiryTime = parseInt(expiry);
        if (Date.now() < expiryTime) {
          return { token, email };
        } else {
          // Token expirado, limpiar
          clearToken();
        }
      }
    } catch (error) {
      console.error('Error cargando token:', error);
    }
    return null;
  };

  // Función para limpiar token
  const clearToken = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_EMAIL_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    } catch (error) {
      console.error('Error limpiando token:', error);
    }
  };

  // Cargar e inicializar GAPI
  useEffect(() => {
    if (!clientId || clientId === 'PEGA_AQUI_TU_OAUTH_CLIENT_ID' || clientId === '') {
      console.warn('⚠️ OAuth Client ID no configurado. Funcionalidades OAuth deshabilitadas.');
      setIsInitialized(true);
      return;
    }

    // Función para inicializar GAPI Client
    const gapiLoaded = () => {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: '', // No necesitamos API Key aquí, usaremos OAuth token
            discoveryDocs: [
              'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
              'https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest',
            ],
          });
          gapiInited.current = true;
          maybeEnableButtons();
        } catch (error) {
          console.error('Error inicializando GAPI client:', error);
        }
      });
    };

    // Función para inicializar GIS (Google Identity Services)
    const gisLoaded = () => {
      if (!window.google?.accounts?.oauth2) {
        console.error('Google Identity Services no disponible');
        return;
      }

      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: async (response: any) => {
          if (response.error !== undefined) {
            console.error('Error en OAuth callback:', response);
            return;
          }
          
          setAccessToken(response.access_token);
          setIsSignedIn(true);
          
          // Obtener email del usuario
          try {
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` }
            });
            const userInfo = await userInfoResponse.json();
            setUserEmail(userInfo.email);
            
            // Guardar token para persistencia
            saveToken(response.access_token, userInfo.email);
          } catch (error) {
            console.error('Error obteniendo información del usuario:', error);
          }
        },
      });

      gisInited.current = true;
      maybeEnableButtons();
    };

    // Habilitar botones solo cuando ambas APIs estén listas
    const maybeEnableButtons = () => {
      if (gapiInited.current && gisInited.current) {
        setIsInitialized(true);
        
        // Intentar restaurar sesión guardada
        const savedAuth = loadToken();
        if (savedAuth) {
          setAccessToken(savedAuth.token);
          setUserEmail(savedAuth.email);
          setIsSignedIn(true);
          
          // Configurar token en GAPI
          if (window.gapi?.client) {
            window.gapi.client.setToken({ access_token: savedAuth.token });
          }
        }
      }
    };

    // Cargar script de GAPI
    if (!document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = gapiLoaded;
      document.head.appendChild(script);
    } else if (window.gapi) {
      gapiLoaded();
    }

    // Cargar script de GIS
    if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = gisLoaded;
      document.head.appendChild(script);
    } else if (window.google?.accounts?.oauth2) {
      gisLoaded();
    }
  }, [clientId]);

  // Configurar token cuando cambie
  useEffect(() => {
    if (accessToken && window.gapi?.client) {
      window.gapi.client.setToken({ access_token: accessToken });
    }
  }, [accessToken]);

  // Iniciar sesión
  const signIn = useCallback(() => {
    if (!isInitialized) {
      console.error('OAuth no inicializado todavía');
      return;
    }
    
    if (!tokenClientRef.current) {
      console.error('Token client no disponible');
      return;
    }
    
    try {
      // Solicitar nuevo token (abre popup de Google)
      tokenClientRef.current.requestAccessToken({ prompt: '' });
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);
    }
  }, [isInitialized]);

  // Cerrar sesión
  const signOut = useCallback(() => {
    if (accessToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        setIsSignedIn(false);
        setAccessToken(null);
        setUserEmail(null);
        window.gapi.client.setToken(null);
        clearToken();
      });
    } else {
      // Si no hay token activo, solo limpiar estado local
      setIsSignedIn(false);
      setAccessToken(null);
      setUserEmail(null);
      clearToken();
    }
  }, [accessToken]);

  // Crear evento en el calendario
  const createEvent = useCallback(async (calendarId: string, event: CalendarEvent) => {
    if (!isSignedIn || !accessToken) throw new Error('No autenticado');

    try {
      const response = await window.gapi.client.calendar.events.insert({
        calendarId,
        resource: event,
      });
      return response.result;
    } catch (error) {
      console.error('Error creando evento:', error);
      throw error;
    }
  }, [isSignedIn, accessToken]);

  // Actualizar evento
  const updateEvent = useCallback(async (
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEvent>
  ) => {
    if (!isSignedIn || !accessToken) throw new Error('No autenticado');

    try {
      const response = await window.gapi.client.calendar.events.patch({
        calendarId,
        eventId,
        resource: event,
      });
      return response.result;
    } catch (error) {
      console.error('Error actualizando evento:', error);
      throw error;
    }
  }, [isSignedIn, accessToken]);

  // Eliminar evento
  const deleteEvent = useCallback(async (calendarId: string, eventId: string) => {
    if (!isSignedIn || !accessToken) throw new Error('No autenticado');

    try {
      await window.gapi.client.calendar.events.delete({
        calendarId,
        eventId,
      });
    } catch (error) {
      console.error('Error eliminando evento:', error);
      throw error;
    }
  }, [isSignedIn, accessToken]);

  // Crear tarea
  const createTask = useCallback(async (taskListId: string, task: GoogleTask) => {
    if (!isSignedIn || !accessToken) throw new Error('No autenticado');

    try {
      const response = await window.gapi.client.tasks.tasks.insert({
        tasklist: taskListId,
        resource: task,
      });
      return response.result;
    } catch (error) {
      console.error('Error creando tarea:', error);
      throw error;
    }
  }, [isSignedIn, accessToken]);

  // Actualizar tarea (marcar como completada)
  const updateTask = useCallback(async (
    taskListId: string,
    taskId: string,
    task: Partial<GoogleTask>
  ) => {
    if (!isSignedIn || !accessToken) throw new Error('No autenticado');

    try {
      const response = await window.gapi.client.tasks.tasks.patch({
        tasklist: taskListId,
        task: taskId,
        resource: task,
      });
      return response.result;
    } catch (error) {
      console.error('Error actualizando tarea:', error);
      throw error;
    }
  }, [isSignedIn, accessToken]);

  // Listar tareas de Google Tasks
  const listTasks = useCallback(async (taskListId: string = DEFAULT_TASK_LIST) => {
    if (!isSignedIn || !accessToken) throw new Error('No autenticado');

    try {
      const response = await window.gapi.client.tasks.tasks.list({
        tasklist: taskListId,
        showCompleted: true,
        showHidden: false,
      });
      return response.result.items || [];
    } catch (error) {
      console.error('Error listando tareas:', error);
      throw error;
    }
  }, [isSignedIn, accessToken]);

  // Eliminar tarea de Google Tasks
  const deleteTask = useCallback(async (taskListId: string, taskId: string) => {
    if (!isSignedIn || !accessToken) throw new Error('No autenticado');

    try {
      await window.gapi.client.tasks.tasks.delete({
        tasklist: taskListId,
        task: taskId,
      });
    } catch (error) {
      console.error('Error eliminando tarea:', error);
      throw error;
    }
  }, [isSignedIn, accessToken]);

  return {
    isSignedIn,
    isInitialized,
    userEmail,
    signIn,
    signOut,
    createEvent,
    updateEvent,
    deleteEvent,
    createTask,
    updateTask,
    listTasks,
    deleteTask,
  };
};

// Tipos para window.gapi y window.google
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}
