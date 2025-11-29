# Configurar OAuth 2.0 para Google Calendar

## ¿Por qué OAuth 2.0?

- **API Key**: Solo permite **leer** eventos del calendario (lo que ya tienes funcionando)
- **OAuth 2.0**: Permite **crear, editar y eliminar** eventos y tareas directamente desde la aplicación

## Pasos para obtener OAuth 2.0 Client ID

### 1. Ir a Google Cloud Console

Ve a: https://console.cloud.google.com/

### 2. Seleccionar tu proyecto

Usa el mismo proyecto donde obtuviste el API Key actual.

### 3. Ir a Credenciales

- Navega a: **APIs & Services** > **Credentials**

### 4. Configurar pantalla de consentimiento (si no lo has hecho)

Si te pide configurar la pantalla de consentimiento primero:

1. Click en **"CONFIGURE CONSENT SCREEN"**
2. Selecciona **"External"** (usuarios externos)
3. Click **"CREATE"**
4. Llena la información:
   - **Nombre de la app**: `Momentum Tracker`
   - **Email de soporte del usuario**: `tu-email@gmail.com`
   - **Dominio de la app**: (déjalo vacío por ahora)
   - **Dominios autorizados**: (déjalo vacío)
   - **Email del desarrollador**: `tu-email@gmail.com`
5. Click **"SAVE AND CONTINUE"**
6. En **"Scopes"**: Click **"SAVE AND CONTINUE"** (sin agregar nada)
7. En **"Test users"**: Click **"SAVE AND CONTINUE"** (sin agregar nada)
8. En **"Summary"**: Click **"BACK TO DASHBOARD"**

### 5. Crear OAuth Client ID

1. Vuelve a **Credentials**
2. Click en **"+ CREATE CREDENTIALS"**
3. Selecciona **"OAuth client ID"**
4. Tipo de aplicación: **"Web application"**
5. Nombre: `Momentum Tracker Web`

6. **Authorized JavaScript origins** (agregar estos):

   ```
   http://localhost:8080
   http://localhost:5173
   https://tu-proyecto.vercel.app
   ```

   ⚠️ **Importante**:

   - Reemplaza `tu-proyecto.vercel.app` con tu URL real de Vercel
   - NO agregues `/` al final
   - Usa `http://` para localhost (sin s)
   - Usa `https://` para Vercel (con s)

7. **Authorized redirect URIs**:

   ⚠️ **DEJAR VACÍO** - Con la nueva API (Google Identity Services) no se necesitan redirect URIs

8. Click **"CREATE"**

### 6. Copiar el Client ID

Aparecerá un diálogo con:

- **Client ID**: `123456789-xxxxxxxxxxxxx.apps.googleusercontent.com`
- **Client Secret**: (no lo necesitas)

**COPIA EL CLIENT ID** (el que termina en `.apps.googleusercontent.com`)

### 7. Agregar a tu archivo .env

Abre el archivo `.env` y agrega:

```env
VITE_GOOGLE_OAUTH_CLIENT_ID=123456789-xxxxxxxxxxxxx.apps.googleusercontent.com
```

Reemplaza con tu Client ID real.

### 8. Reiniciar el servidor

```bash
npm run dev
```

## ¿Cómo funciona?

Una vez configurado:

1. **Conectar cuenta**: Verás un botón "Conectar Google Calendar" en la parte superior del calendario
2. **Autorizar**: Se abrirá una ventana de Google para que autorices la aplicación
3. **Crear eventos**: Haz click en cualquier fecha del calendario y aparecerá un formulario
4. **Marcar tareas**: Click en una tarea y botón "Marcar como Completada"
5. **Sincronización**: Los cambios se ven inmediatamente en el calendario

## Permisos que solicita

- `calendar.events`: Crear, editar, eliminar eventos en tus calendarios
- `tasks`: Crear, editar, completar tareas

## Seguridad

- OAuth 2.0 es el estándar de seguridad de Google
- Solo tú puedes autorizar la aplicación
- Puedes revocar el acceso en cualquier momento desde: https://myaccount.google.com/permissions
- Los tokens se guardan solo en tu navegador (localStorage)
- Nadie más tiene acceso a tus credenciales

## Solución de problemas

### "Error: redirect_uri_mismatch"

- Verifica que agregaste `http://localhost:8080` en **Authorized JavaScript origins**
- Verifica que agregaste `http://localhost:8080` en **Authorized redirect URIs**
- Asegúrate de NO tener un `/` al final

### "Error: access_denied"

- Revisa que la pantalla de consentimiento esté configurada
- Intenta cerrar sesión y volver a conectar

### No aparece el botón de conectar

- Verifica que `VITE_GOOGLE_OAUTH_CLIENT_ID` esté en el archivo `.env`
- Reinicia el servidor con `npm run dev`
- Revisa la consola del navegador para errores

### Los eventos no se actualizan

- Después de crear/editar, el calendario se refresca automáticamente
- Si no se actualiza, recarga la página (F5)

## Producción (Deployment en Vercel)

### Si agregaste la URL de Vercel desde el inicio:

Ya está todo listo! Solo necesitas:

1. **Desplegar en Vercel**:

   ```bash
   vercel --prod
   ```

2. **Agregar variables de entorno en Vercel**:

   - Ve a: https://vercel.com/tu-proyecto/settings/environment-variables
   - Agrega estas variables:
     ```
     VITE_SUPABASE_URL=tu-url-de-supabase
     VITE_SUPABASE_ANON_KEY=tu-anon-key
     VITE_GOOGLE_CALENDAR_API_KEY=tu-api-key
     VITE_GOOGLE_OAUTH_CLIENT_ID=tu-oauth-client-id
     VITE_GOOGLE_CALENDAR_PRIMARY=tu-email@gmail.com
     VITE_GOOGLE_CALENDAR_SECONDARY=3c5660e2d8f37467770a6b7231803e92b8b37444d11510e35f8a5a1e1ad308d7@group.calendar.google.com
     VITE_GOOGLE_CALENDAR_HOLIDAYS=es.bolivian#holiday@group.v.calendar.google.com
     ```

3. **Redeploy** para que tome las variables

### Si NO agregaste la URL de Vercel al inicio:

1. Despliega primero en Vercel para obtener tu URL
2. Ve a Google Cloud Console > Credentials > Tu OAuth Client ID
3. Edita y agrega tu URL de Vercel en:
   - **Authorized JavaScript origins**: `https://tu-proyecto.vercel.app`
   - **Authorized redirect URIs**: `https://tu-proyecto.vercel.app`
4. Guarda los cambios
5. Agrega las variables de entorno en Vercel (ver arriba)
6. Redeploy
