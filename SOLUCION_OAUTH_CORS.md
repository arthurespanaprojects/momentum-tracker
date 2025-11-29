# 🔧 SOLUCIÓN: Error CORS en OAuth

## ❌ Error que estás viendo:

```
Server did not send the correct CORS headers.
The fetch of the id assertion endpoint resulted in a network error: ERR_FAILED
```

## ✅ SOLUCIÓN (5 minutos):

### Paso 1: Ir a Google Cloud Console

Ve a: https://console.cloud.google.com/apis/credentials

### Paso 2: Encontrar tu OAuth Client ID

Busca en la lista: `478894821101-bfgqkejf0a5k97hfr5aa44bmgdoogoaa.apps.googleusercontent.com`

### Paso 3: Click en el ícono del LÁPIZ ✏️ (editar)

⚠️ **NO** hagas click en el nombre, tienes que hacer click en el **ícono del lápiz** a la derecha

### Paso 4: Verificar configuración

Debes tener EXACTAMENTE esto:

#### ✅ **Authorized JavaScript origins:**

```
http://localhost:8080
http://localhost:8081
http://localhost:5173
https://tracker-zeta-pink-67.vercel.app
```

⚠️ **IMPORTANTE:**

- Sin `/` al final
- `http://` para localhost (sin s)
- `https://` para vercel (con s)
- Uno por línea

#### ❌ **Authorized redirect URIs:**

**DEBE ESTAR COMPLETAMENTE VACÍO**

Si ves algo como:

- `http://localhost:8080/`
- `http://localhost:8080/oauth2callback`
- `http://localhost:5173/`

**ELIMÍNALOS TODOS**. Deja esta sección completamente vacía.

### Paso 5: Guardar

1. Click en **SAVE** (abajo)
2. **Espera 2-3 minutos** (Google necesita propagar los cambios)

### Paso 6: Limpiar caché del navegador

#### Opción A - Modo incógnito (más rápido):

1. Cierra **TODAS** las ventanas del navegador
2. Abre ventana de incógnito (Ctrl + Shift + N)
3. Ve a `http://localhost:8080/`
4. Click en "Conectar Google Calendar"

#### Opción B - Limpiar caché:

1. Presiona F12 (Developer Tools)
2. Click derecho en el botón de recargar
3. Selecciona "Empty Cache and Hard Reload"
4. Ve a `http://localhost:8080/`
5. Click en "Conectar Google Calendar"

### Paso 7: Probar

Deberías ver:

1. ✅ Popup de Google se abre
2. ✅ Seleccionas tu cuenta
3. ✅ Autorizas permisos
4. ✅ Popup se cierra
5. ✅ Ves "🟢 Conectado: kusukasa01@gmail.com"

---

## 🐛 Si aún hay problemas:

### Error: "Not a valid origin"

Ve a Google Cloud Console y verifica que en "Authorized JavaScript origins" tengas **EXACTAMENTE** `http://localhost:8080` (sin `/`)

### Error: "redirect_uri_mismatch"

Esto significa que tienes algo en "Authorized redirect URIs". **ELIMÍNALO TODO**.

### Popup no se abre

1. Verifica que no tengas bloqueador de popups activado
2. Asegúrate de que el servidor esté corriendo en `http://localhost:8080/`

### "Access blocked: This app's request is invalid"

Esto pasa si:

1. No configuraste la pantalla de consentimiento
2. Las APIs de Calendar y Tasks no están habilitadas

**Solución:**

- Ve a: https://console.cloud.google.com/apis/library
- Busca "Google Calendar API" → Enable
- Busca "Google Tasks API" → Enable

---

## 📝 Checklist final:

- [ ] OAuth Client ID editado (ícono del lápiz)
- [ ] "Authorized JavaScript origins" tiene los 4 URLs correctos
- [ ] "Authorized redirect URIs" está **VACÍO**
- [ ] Guardaste los cambios (botón SAVE)
- [ ] Esperaste 2-3 minutos
- [ ] Limpiaste caché o usaste incógnito
- [ ] Servidor corriendo en http://localhost:8080/
- [ ] Google Calendar API habilitada
- [ ] Google Tasks API habilitada

Si cumples TODO el checklist y aún no funciona, toma una captura de pantalla de la configuración en Google Cloud Console.
