# Flujo de Experiencia del Usuario (User Journey)
## Prototipo 3 — Captura Fluida en Una Sola Vista (SAPUI5 `sap.f.DynamicPage`)

**Proyecto:** WFALTAMAT — GAP_P2P_07 (Alta/Extensión de Materiales, migración ZWFMM01)
**Audiencia de este documento:** equipo funcional-técnico interno (AlEn), como apoyo a la presentación del prototipo.
**Patrón de diseño:** `sap.f.DynamicPage` (`propuesta-3-dynamic-page.md`), el estándar recomendado por SAP Fiori para pantallas de creación de datos complejos en una sola vista lineal y fluida — evita la fatiga de clics y la fragmentación de un Wizard.

---

## 1. Propósito

Ofrecer al usuario que **prioriza velocidad** una experiencia de captura transparente: todo el formulario, la validación de vistas y el grid de solicitudes acumuladas viven en una sola página con scroll, sin pasos ni columnas — sin salir nunca de la misma pantalla.

---

## 2. Punto de Entrada

```
WF Alta de Material (Launchpad)
   └─ Tile "Prototipo 3 — Captura fluida en una sola vista (Dynamic Page)"
        └─ Pantalla única "Solicitud de Alta y Extensión de Materiales"
```

> **Nota de diseño:** a diferencia de los Prototipos 1 y 2, el Prototipo 3 **no tiene sub-launchpad**. El tile navega directo a la pantalla, y el Modo de Solicitud se elige dentro de ella con un `SegmentedButton` — consistente con la premisa de "minimizar clics" del propio diseño.

---

## 3. Estructura de Pantalla (de arriba hacia abajo, con scroll)

1. **Encabezado:** título "Solicitud de Alta y Extensión de Materiales" + `SegmentedButton` Creación/Extensión (bloqueado una vez que se presiona "Confirmar Datos").
2. **Datos Generales** y **Datos Básicos**, en dos columnas lado a lado (mismos campos y reglas de negocio que los Prototipos 1 y 2).
3. **`IconTabBar`** de 5 pestañas (Vistas a Crear primero, luego Vistas creadas, Vistas en WF, Vistas de Ventas, Canales de Dist. Conf.) — visible solo después de "Confirmar Datos".
4. **Barra de acciones intermedia:** Limpiar, Confirmar Datos, Modificar Datos, Agregar al Listado.
5. **Grid "Solicitudes de Materiales para Crear"** — acumula los registros agregados en la sesión, con eliminación por fila.
6. **Pie de página (fijo):** botones **Cancelar** y **Enviar a Workflow**.

---

## 4. Flujo Paso a Paso

1. **Elegir modo**: con el `SegmentedButton` del encabezado, Creación o Extensión.
2. **Capturar Datos Generales y Datos Básicos**: mismas reglas que los otros dos prototipos (rango interno/externo, validación MARA en Extensión con el error "El material capturado no existe.", FERT+México/USA, etc.).
   - **Regla propia de este prototipo — Folio condicional:** el campo Folio solo aparece si el Tipo de Entrada capturado es **DNP**, **EE** o **CA**. Para cualquier otro valor, el campo (y su etiqueta) se ocultan automáticamente y su contenido se limpia.
3. **Confirmar Datos**: bloquea la captura y calcula las vistas a crear, mostrando el `IconTabBar` con la pestaña "Vistas a Crear" activa por defecto (es la única pestaña accionable; las otras cuatro son de consulta).
4. **Marcar vistas y Agregar al Listado**: mismas 5 validaciones de negocio que los otros prototipos. Al pasar, el registro baja al Grid inferior y **todo el formulario superior se limpia y desbloquea automáticamente** (Auto-Reset), listo para capturar otro material sin recargar la página.
5. **Repetir** los pasos 2–4 tantas veces como se necesite.
6. **Enviar a Workflow**: botón del pie de página, habilitado en cuanto el Grid tiene al menos un registro. Si algún registro está marcado como Maquilado, se muestra la advertencia correspondiente antes de continuar. Al enviar: confirmación de éxito, se vacía el Grid y el formulario queda listo para una nueva sesión.
7. **Cancelar** (alternativa al paso 6, en cualquier momento): abre un cuadro de confirmación —
   - **Título:** "Confirmar Cancelación"
   - **Texto:** "¿Está seguro de que desea salir? Se perderán todas las solicitudes acumuladas que no han sido enviadas a Workflow."
   - **Si el usuario confirma (Sí):** se vacía por completo el Grid de staging, se resetea la captura activa, y el sistema regresa al Launchpad principal (Prototipo 1/2/3).
   - **Si el usuario cancela (No):** el diálogo se cierra y todo permanece intacto.

---

## 5. Reglas de Negocio Propias de Este Prototipo

| Regla | Detalle |
|---|---|
| Folio condicional | Visible únicamente si Tipo de Entrada ∈ {DNP, EE, CA} |
| Botón Cancelar | Único entre los 3 prototipos: descarta **toda** la sesión (no solo la captura activa) y navega fuera de la pantalla |
| Orden de pestañas | "Vistas a Crear" es la primera (ajustado tras prueba de usuario, documentado en `propuesta-3-dynamic-page.md`) |

---

## 6. Comparativo Rápido con los Otros Prototipos

| | Prototipo 1 (Wizard) | Prototipo 2 (FCL) | Prototipo 3 (Dynamic Page) |
|---|---|---|---|
| Navegación | Lineal, 4 pasos obligatorios | 2 columnas simultáneas | Una sola vista continua (scroll) |
| Modo Creación/Extensión | Fijo por tile de entrada | `RadioButtonGroup` dentro de la pantalla | `SegmentedButton` en el encabezado |
| Descartar toda la sesión | No existe esa acción | No existe esa acción | Botón "Cancelar" dedicado |
| Ideal para | Usuario ocasional, máxima guía | Usuario experto, gestiona varias solicitudes a la vez | Usuario que prioriza rapidez, mínimos clics |
