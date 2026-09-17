# Flujo de Experiencia del Usuario (User Journey)
## Prototipo 1 — Asistente Guiado (SAPUI5 `sap.m.Wizard`)

**Proyecto:** WFALTAMAT — GAP_P2P_07 (Alta/Extensión de Materiales, migración ZWFMM01)
**Audiencia de este documento:** equipo funcional-técnico interno (AlEn), como apoyo a la presentación del prototipo.
**Patrón de diseño:** Wizard de 4 pasos. Recomendado por las SAP Fiori Design Guidelines para creación guiada de un objeto nuevo — el usuario avanza de forma lineal y no puede saltarse pasos sin completar el anterior.

---

## 1. Propósito

Guiar al usuario, paso a paso, en la captura de una solicitud de Alta o Extensión de material, validando cada sección antes de permitir avanzar. Está pensado para el usuario que **necesita máxima asistencia** y prefiere no tomar decisiones sobre qué llenar primero.

---

## 2. Punto de Entrada

```
WF Alta de Material (Launchpad)
   └─ Tile "Prototipo 1 — Asistente guiado paso a paso (Wizard)"
        └─ Sub-Launchpad "Prototipo 1 — Asistente Guiado"
             ├─ Tile "Crear Material"     → fija Modo de Solicitud = Creación
             └─ Tile "Extender Material"  → fija Modo de Solicitud = Extensión
```

> **Nota de diseño:** a diferencia de los otros dos prototipos, aquí el Modo de Solicitud **no se elige dentro de la pantalla** — queda fijo desde el tile por el que se entra. Dentro del Wizard se muestra como un indicador de solo lectura ("🔒 Modo de Solicitud: Creación/Extensión") para que el usuario nunca pierda de vista en qué modo está trabajando.

---

## 3. Flujo Paso a Paso

### Paso 1 — Datos Generales
Campos: Material, Tipo de Material, Ramo, Tipo de Entrada (+ su descripción, mostrada al costado), Folio, Centro, Organiz. Ventas, ¿Material Maquilado?, Material de Exp., Modo de Proceso (Fabricación/Distribución).

- **Modo Creación:** el campo Material permanece bloqueado (`Se asigna automáticamente — rango interno`) hasta que el Tipo de Material seleccionado tenga rango **Externo**, en cuyo caso se vuelve editable y obligatorio.
- **Modo Extensión:** el campo Material es editable desde el inicio. Al capturarlo, el sistema valida su existencia contra el maestro (MARA simulado):
  - Si **no existe** → mensaje de error **"El material capturado no existe."** y no se puede avanzar.
  - Si **existe** → se autocompletan automáticamente Tipo de Material, Ramo, Denominación, UM, Sector, Grupo de Artículos y Jerarquía de Productos (ver Paso 2), quedando de solo lectura.
- Botón **Limpiar**: reinicia el paso.
- Botón **Siguiente**: se habilita solo cuando Centro y Tipo de Material están capturados (y Material, si el rango lo exige).

### Paso 2 — Datos Básicos
Campos: Denominación, UM base, Sector, Gr.tp.pos.gral., Grupo artículos, Jerarquía Produc. (obligatoria si el Tipo de Material es **FERT**).

- En modo Extensión, todos estos campos llegan ya llenos desde el Paso 1 y **no son editables** (garantiza integridad contra el maestro).
- Botón **Confirmar Datos**: se habilita cuando la sección está completa. Al presionarlo:
  - Se bloquean los Pasos 1 y 2 (ya no se pueden modificar).
  - Se calculan automáticamente las vistas a crear (Paso 3), consultando los objetos de configuración por Centro + Tipo de Material + indicador de Exportación.

### Paso 3 — Selección de Vistas
Pestañas (en este orden): **Vistas a Crear** (la accionable) · Vistas creadas · Vistas en WF · Vistas de Ventas · Canales de Dist. Conf.

- En **Vistas a Crear**, cada fila muestra: Vista, Descripción, Usuario responsable, y dos semáforos — **Creada** (verde si ya existe en MARC-PSTAT) y **En WF** (verde si ya hay un Work Item activo). Una vista con cualquiera de los dos semáforos en verde **no puede volver a marcarse**.
- El usuario marca los checkboxes de las vistas que necesita solicitar y presiona **Agregar**.
- Al presionar Agregar, el sistema valida en este orden:
  1. Al menos una vista seleccionada.
  2. Si se seleccionó la vista de Ventas, que Organiz. Ventas esté capturada y que la combinación Org.Ventas/Canal esté configurada para ese Tipo de Material.
  3. Si el material es FERT y el centro es de México/USA, que la Unidad de Medida sea Caja (CJ) o Palet (PAL).
  4. Que exista un responsable configurado para cada vista solicitada.
  5. Que ninguna vista seleccionada esté ya Creada o En WF.
- Si todo pasa, el registro baja al Grid del Paso 4 y el asistente avanza automáticamente.

### Paso 4 — Revisión y Confirmación
Muestra el Grid **"Solicitudes de Materiales para Crear"** con todos los registros acumulados en la sesión (columnas: No. Material, Descripción, Centro, ¿Mat Maq?, ¿C.Lt?, Tipo Fab/Dis, Ramo, Unid.Med., Sector, Gr.tp.pos.gral, Gpo.Art., Org.Ventas, Jquía.productos, Vistas a crear, y un ícono de eliminar por fila).

- **Botón "Agregar Otro Material"** — visible **solo en modo Creación** (en Extensión no aplica, porque cada sesión extiende un único material existente). Regresa al Paso 1, conservando el Grid.
- **Botón "Enviar Workflow"** — se habilita en cuanto el Grid tiene al menos un registro. Si algún registro está marcado como Maquilado, se muestra una advertencia de confirmación antes de continuar. Al enviar: se notifica el éxito, se vacía el Grid y el asistente vuelve al Paso 1, listo para una nueva sesión.

---

## 4. Reglas de Bloqueo de Campos (Seguridad)

| Estado del proceso | Secciones 1–2 | Sección 3 (checkboxes) |
|---|---|---|
| Captura | Editables | No aplica (aún no calculadas) |
| Confirmado | Bloqueadas | Editables (solo vistas sin semáforo verde) |
| Agregado | Bloqueadas | Bloqueadas |

---

## 5. Comparativo Rápido con los Otros Prototipos

| | Prototipo 1 (Wizard) | Prototipo 2 (FCL) | Prototipo 3 (Dynamic Page) |
|---|---|---|---|
| Navegación | Lineal, 4 pasos obligatorios | 2 columnas simultáneas | Una sola vista continua |
| Modo Creación/Extensión | Fijo por tile de entrada | `RadioButtonGroup` dentro de la pantalla | `SegmentedButton` en el encabezado |
| Ideal para | Usuario ocasional, máxima guía | Usuario experto, gestiona varias solicitudes a la vez | Usuario que prioriza rapidez, mínimos clics |
