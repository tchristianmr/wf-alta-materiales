# Flujo de Experiencia del Usuario (User Journey)
## Prototipo 2 — Gestión de Solicitudes (SAPUI5 `sap.f.FlexibleColumnLayout` / Split App)

**Proyecto:** WFALTAMAT — GAP_P2P_07 (Alta/Extensión de Materiales, migración ZWFMM01)
**Audiencia de este documento:** equipo funcional-técnico interno (AlEn), como apoyo a la presentación del prototipo.
**Patrón de diseño:** Split App / Master-Detail (`propuesta-2-split-app.md`). Columna izquierda = carrito de solicitudes acumuladas; columna derecha = captura activa de un material. Ambas visibles al mismo tiempo.

---

## 1. Propósito

Dar al usuario **experto**, que gestiona múltiples solicitudes en una sola sesión de trabajo, control visual continuo sobre todo lo que lleva acumulado sin perder de vista el formulario de captura — sin necesidad de navegar entre pantallas ni pasos.

---

## 2. Punto de Entrada

```
WF Alta de Material (Launchpad)
   └─ Tile "Prototipo 2 — Gestión eficiente multi-solicitud (FCL)"
        └─ Sub-Launchpad "Prototipo 2 — Gestión de Solicitudes"
             └─ Tile "Gestionar Materiales" → pantalla de dos columnas
```

---

## 3. Estructura de Pantalla

### Columna Izquierda — "Solicitudes" (Master / Carrito)
- Buscador rápido (filtra por Material, Centro, Descripción o Tipo de Material entre lo ya agregado).
- Botón **"+ Nuevo"**: limpia la columna derecha y la deja lista para capturar un material distinto.
- Lista de solicitudes agregadas en la sesión: cada renglón muestra Material, Centro · Tipo de Material · Descripción, un ícono de estado y una "X" para eliminar el registro.
- Pie de columna: botón **"Enviar Workflow"**, habilitado en cuanto hay al menos una solicitud en la lista.

### Columna Derecha — Detalle (Captura Activa o Solo Lectura)
- Encabezado con título dinámico: *Captura de Material Nuevo* / *Captura de Extensión de Material* / *Detalle de Solicitud (Solo Lectura)* — según el contexto.
- **Dos botones en la esquina superior derecha del encabezado:**
  - **Expandir / Salir de pantalla completa** — alterna el panel de detalle entre las dos columnas normales y ancho completo de pantalla.
  - **Cerrar (✕)** — colapsa el panel de detalle, deja visible solo la columna Master, y resetea la captura activa.
- Cuerpo: mismos campos y reglas de Datos Generales y Datos Básicos que el Prototipo 1 (el Modo de Solicitud aquí se elige con un `RadioButtonGroup` dentro de la propia pantalla, no por un tile). Debajo, el `IconTabBar` de 5 pestañas (mismo orden y semáforos que el Prototipo 1), visible solo después de "Confirmar Datos".
- Pie de columna: **Confirmar Datos** (mientras se captura) → **Modificar Datos** + **Agregar al Listado** (una vez confirmado).

---

## 4. Flujo Paso a Paso

1. **Capturar**: con la columna derecha en blanco (estado inicial o tras "+ Nuevo"), el usuario llena Datos Generales y Datos Básicos, exactamente con las mismas validaciones y reglas de negocio que el Prototipo 1 (rango interno/externo, MARA en Extensión, FERT+México/USA, etc.).
2. **Confirmar Datos**: bloquea la captura y calcula las vistas a crear (mismas 5 pestañas y semáforos que el Wizard, con "Vistas a Crear" primero).
3. **Marcar vistas y Agregar al Listado**: aplica las mismas 5 validaciones de negocio del Paso 4 del Prototipo 1. Al pasar, el registro aparece de inmediato en la lista de la columna izquierda y la columna derecha **se limpia automáticamente**, lista para capturar el siguiente material — sin salir de la pantalla ni perder el contexto del carrito.
4. **Repetir** el paso 1–3 tantas veces como materiales se quieran agregar en la sesión.
5. **Revisar el carrito**: el usuario puede hacer clic en cualquier renglón de la izquierda para ver su detalle completo en modo **solo lectura** en la columna derecha (todos los campos bloqueados, sin botones de edición). Desde ahí puede usar **Cerrar (✕)** para volver a capturar algo nuevo, o **Expandir** para revisar el detalle a pantalla completa.
6. **Enviar Workflow**: con uno o más registros en el carrito, se presiona el botón del pie de la columna izquierda. Si algún registro está marcado como Maquilado, se muestra la advertencia correspondiente antes de continuar. El envío se procesa **secuencialmente**, mostrando el estado de cada registro (Enviando → Enviado) antes de confirmar el éxito total y vaciar el carrito.

---

## 5. Reglas de Interacción Clave

| Acción | Efecto |
|---|---|
| Clic en un renglón del carrito | Detalle se abre en solo lectura; layout pasa a dos columnas si estaba cerrado |
| Botón "+ Nuevo" | Limpia la captura activa; layout pasa a dos columnas si estaba cerrado |
| Botón "Cerrar" (✕) en el detalle | Layout pasa a una sola columna (Master); resetea la captura activa |
| Botón "Expandir" | Alterna el detalle entre dos columnas y pantalla completa (no afecta el carrito) |

---

## 6. Comparativo Rápido con los Otros Prototipos

| | Prototipo 1 (Wizard) | Prototipo 2 (FCL) | Prototipo 3 (Dynamic Page) |
|---|---|---|---|
| Navegación | Lineal, 4 pasos obligatorios | 2 columnas simultáneas | Una sola vista continua |
| Ver solicitudes ya agregadas | Solo en el Paso 4, al final | Siempre visibles en la columna izquierda | Siempre visibles al final de la página (scroll) |
| Revisar una solicitud ya agregada | No es posible reabrirla | Sí, clic en el carrito → solo lectura | No es posible reabrirla |
| Ideal para | Usuario ocasional, máxima guía | Usuario experto, gestiona varias solicitudes a la vez | Usuario que prioriza rapidez, mínimos clics |
