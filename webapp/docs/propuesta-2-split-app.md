# Especificación Técnica de UI - GAP_P2P_07: Workflow de Alta de Materiales
## Propuesta 2: Split App (Master-Detail / Carrito de Compras) - v2

### 1. Visión General del Diseño
Esta propuesta adopta el patrón de diseño **Split App** (o **Master-Detail** / **Flexible Column Layout**) para proveer al usuario un control visual continuo y completo sobre el conjunto de solicitudes acumuladas en el "carrito" de pre-guardado, mientras gestiona la captura y validación individual de un material en el mismo espacio de pantalla. Usar y/o mejorar los datos dummies del proyecto SAPUI5 WFALTAMAT.

Al igual que en la Propuesta 1 (propuesta-1-dynamic-page), el botón redundante "Agregar otro material" se elimina de la barra de acciones. El flujo de captura y "staging" ocurre a la derecha, mientras que la vista acumulada se alimenta a la izquierda, culminando con el disparo del Workflow desde el panel izquierdo.

---

### 2. Estructura del Layout (SAPUI5 Controls)
El layout se divide horizontalmente mediante un control **sap.m.SplitApp** o **sap.f.FlexibleColumnLayout** (FCL):

#### Panel Izquierdo - Master (Staging Grid o "Carrito")
*   **Header (`sap.m.SearchField`):**
    *   Buscador rápido dentro de los materiales pre-agregados en la solicitud activa para agilizar la depuración.
*   **Contenido (`sap.m.List` / `sap.m.Table`):**
    *   Muestra un listado condensado de los materiales agregados en la sesión actual.
    *   Cada elemento de la lista muestra: *Material (o 'N/A' si es interno), Centro, Descripción, Tipo de Material y un control de estado visual (`sap.m.ObjectStatus`)*.
    *   **Comportamiento del Estado Visual (Icono y Semántica):** En lugar de un estático semáforo de validación (ya que todo registro en esta lista ya es válido por definición al haber pasado el botón "Agregar"), el estado representará:
        *   **Tipo de Operación:** Diferenciación visual clara mediante color e ícono:
            *   *Alta Nueva:* `sap-icon://create` en color verde (*Success*) indicando que es un material nuevo.
            *   *Extensión:* `sap-icon://add-process` en color azul (*Information*) indicando que se extenderá un material existente.
        *   **Estado de Tránsito (En Cola vs. Enviado):**
            *   *Listo para Enviar (Default):* Estado neutral o indicación de que espera confirmación.
            *   *Enviando / Procesando:* Un spinner temporal durante el procesamiento síncrono.
            *   *Enviado:* Check verde (`sap-icon://sys-enter-2`) antes de la limpieza final del listado.
    *   Cada ítem cuenta con un botón de borrado rápido (`sap.m.Button` con icono `decline`).
*   **Footer (`sap.m.OverflowToolbar`):**
    *   Botón **"Enviar a Workflow"** (`type: Accept`): Dispara secuencial o paralelamente las solicitudes agregadas en la lista.

#### Panel Derecho - Detail (Captura Activa)
*   **Header (`sap.m.Title`):**
    *   Título dinámico: *Captura de Material Nuevo / Extensión*.
*   **Contenido (`sap.ui.layout.form.SimpleForm`):**
    *   Formularios agrupados para **Datos Generales** y **Datos Básicos**.
*   **Validación (`sap.m.IconTabBar`):**
    *   Pestañas técnicas para el análisis de estatus de las vistas (Vistas creadas, Vistas en WF, Vistas de Ventas, Canales Conf. y Vistas a Crear).
*   **Footer (`sap.m.OverflowToolbar`):**
    *   Botón **"Confirmar Datos"**: Habilita la lectura de pestañas y bloquea campos de texto.
    *   Botón **"Modificar Datos"**: Permite re-editar el material activo.
    *   Botón **"Agregar al Listado"** (`type: Emphasized`): Inserta el material en el listado Master (Izquierdo) y limpia el formulario de captura.

---

### 3. Comportamiento y Máquina de Estados (UI Controller)

```
[Panel Izquierdo: Lista Vacía]           [Panel Derecho: Formulario de Captura]
               │                                           │
               │                                           ▼
               │                            [Botón: Confirmar Datos]
               │                                           │
               │                                           ▼ (Bloquea campos)
               │                             [Carga de IconTabBar de Validación]
               │                                           │
               ▼ <─────[Botón: Agregar al Listado]─────────┤
[Agrega Item a la Lista]                                   ▼ (Auto-Reset)
- Identifica "Alta" vs "Extensión"                         [Limpia y desbloquea Formulario]
- Setea Estado "Listo para Enviar"
               │
               ▼ (Usuario da clic en el Master o Enviar)
[Botón: Enviar a Workflow] ──> (Llamada masiva OData V4)
```

#### Reglas de Operación y Control:
1.  **Selección de Elementos:** Al dar clic sobre un elemento del panel izquierdo (Master), el panel derecho se carga en modo **"Solo Lectura"** (`editable="false"`) mostrando el detalle exacto de lo capturado para ese material específico, deshabilitando la botonera de edición.
2.  **Agregar Nuevo Material:** Para agregar otro registro después de haber seleccionado un elemento guardado, se presiona un botón **"+"** o **"Nuevo"** en la cabecera del panel izquierdo, lo cual limpia el panel derecho y lo regresa a su estado activo de captura.
3.  **Botón "Agregar al Listado":** Valida el formulario derecho e identifica si se trata de un flujo de creación o extensión para asociar el icono correspondiente. Inserta los datos en la tabla del panel izquierdo con estado "Listo para Enviar". Posteriormente, ejecuta un reset del formulario derecho (limpieza y enfoque en el primer campo de captura de datos generales) para agilizar la entrada de datos.

---

### 4. Ventajas de Usabilidad para AlEn
*   **Monitoreo en Tiempo Real:** El usuario ve exactamente cuántos materiales y centros lleva configurados sin necesidad de hacer scroll vertical.
*   **Operación Tipo "Carrito de Compras":** El usuario de datos maestros está familiarizado con este patrón, lo que minimiza la curva de aprendizaje y acelera el proceso de extensión masiva por centros.
*   **Diferenciación Visual Clara:** La visualización rápida mediante iconos de "Alta" vs "Extensión" ayuda al solicitante a validar rápidamente de un vistazo el propósito de cada solicitud acumulada antes de enviar al Workflow.
