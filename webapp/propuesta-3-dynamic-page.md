# Especificación Técnica de UI - GAP_P2P_07: Workflow de Alta de Materiales
## Propuesta 3: Dynamic Page Layout (Vista Plana Scrollable)

### 1. Visión General del Diseño
Esta propuesta utiliza el patrón de diseño **sap.f.DynamicPage**, que es el estándar recomendado por SAP Fiori para pantallas de creación de datos complejos en una sola vista lineal y fluida. Evita la fatiga de clics y la fragmentación de la información típica de un Wizard, permitiendo una experiencia de captura rápida y transparente. Usar y/o mejorar los datos dummies del proyecto SAPUI5 WFALTAMAT.

Se elimina el botón redundante "Agregar otro material", centralizando todo el flujo en las acciones de **"Confirmar Datos"**, **"Agregar al Listado"** (que vacía la captura en el grid de staging) y **"Enviar a Workflow"**.

---

### 2. Estructura del Layout (SAPUI5 Controls)
El layout se compone de las siguientes secciones estructuradas verticalmente dentro del control `sap.f.DynamicPage`:

1.  **Header (`sap.f.DynamicPageTitle` / `sap.f.DynamicPageHeader`):**
    *   Título de la aplicación: *Solicitud de Alta y Extensión de Materiales*.
    *   Indicador visual del modo seleccionado: **Creación** vs. **Extensión** (mediante un control `sap.m.SegmentedButton`).
2.  **Sección de Captura Activa (`sap.ui.layout.form.SimpleForm`):**
    *   **Sub-sección 1 (Datos Generales):** Tipo de Material, Centro, Ramo, Tipo de Entrada, Folio (condicional), Org. Ventas, Indicador de Maquila, Indicador de Exportación, e indicadores de Fabricación/Distribución (RadioButtons).
        *   *Control del Folio (Condicional):* Campo de entrada `sap.m.Input` (tipo CHAR-10) cuya visibilidad (`visible="{localUI>/isFolioVisible}"`) es dinámica según las reglas de negocio descritas en la Sección 3.
    *   **Sub-sección 2 (Datos Básicos):** Denominación, Unidad de Medida Base, Sector, Grupo de Tipos de Posición General, Grupo de Artículos y Jerarquía de Productos.
3.  **Sección de Pestañas Informativas (`sap.m.IconTabBar`):**
    *   Contiene las 5 pestañas de validación técnica que se cargan dinámicamente al confirmar los datos del material activo. **Orden actualizado tras prueba de usuario** (la versión original de este documento ponía "Vistas a Crear" al final; se movió a la primera posición porque es la única pestaña accionable — las demás son de solo lectura/informativas — y dejarla al final generaba el error confuso "Seleccione al menos una vista" cuando el usuario intentaba "Agregar al Listado" sin haber navegado hasta ella):
        *   **Pestaña 1 (Vistas a Crear):** Checkboxes de selección de vistas, con semáforos integrados de *Vista Creada* y *Vista en WF* basados en las tablas de configuración (*Objeto Custom 1*). Es la pestaña seleccionada por defecto al confirmar datos.
        *   **Pestaña 2 (Vistas creadas):** Estado de actualización (`MARC-PSTAT`).
        *   **Pestaña 3 (Vistas en WF):** Tareas pendientes de diálogo asociadas.
        *   **Pestaña 4 (Vistas de Ventas):** Combinaciones existentes en `MVKE`.
        *   **Pestaña 5 (Canales Conf.):** Configuración del *Objeto Custom 2*.
4.  **Barra de Acciones Intermedia (`sap.m.OverflowToolbar`):**
    *   Contiene el botón principal **\"Agregar al Listado\"** (`type: Emphasized`).
5.  **Sección de Staging Grid (`sap.m.Table` / Grid de Solicitudes):**
    *   Tabla inferior de solo lectura que almacena temporalmente las solicitudes de materiales listas para enviarse al flujo de trabajo. Cuenta con capacidad de eliminación de filas.
6.  **Barra de Acciones Globales (`sap.f.DynamicPage` Footer):**
    *   Botón **\"Enviar a Workflow\"** (`type: Accept`).
    *   Botón **\"Cancelar\"** (`type: Reject`): Detona el flujo de descarte total con diálogo de UX personalizado.

---

### 3. Comportamiento y Máquina de Estados (UI Controller)

```
[Inicio: Captura Vacía]
       │
       ▼ (Usuario cambia Tipo de Entrada)
[Manejador de Eventos: onTipoEntradaChange] ──> ¿Es DNP, EE o CA?
       │                                            ├── SÍ ─> `isFolioVisible` = true
       │                                            └── NO ─> `isFolioVisible` = false
       ▼ (Usuario llena campos)
[Botón: Confirmar Datos] ──(Fails validation)──> [Muestra Errores en UI]
       │ (Passes validation)
       ▼
[Bloquea campos de captura + Carga IconTabBar]
       │
       ├─────────> [Botón: Modificar Datos] ──> (Desbloquea campos, limpia IconTabBar)
       │
       ▼ (Usuario selecciona vistas a crear)
[Botón: Agregar al Listado]
       │
       ▼ (Valida reglas de negocio)
[Inserta fila en Grid inferior + Limpia y Desbloquea campos superiores] ──> [Listo para otro material]
       │
       ▼ (Usuario da clic en Cancelar)
[Botón: Cancelar] ──> [MessageBox.confirm] ──> SÍ ──> [Limpia Staging + Navega al Launchpad]
       │
       ▼ (Usuario da clic final)
[Botón: Enviar a Workflow] ──> (Llamada OData V4 Action -> Detona WF en Backend)
```

#### Reglas de Negocio Críticas Implementadas:

##### A. Visibilidad Dinámica de Folio (Tipo de Entrada Condicional)
*   **Regla de Negocio:** El campo **Folio** en la Datos Generales es condicional. Sólo debe estar visible para ciertos Tipos de Entrada provenientes del *Objeto Custom 3*.
*   **Códigos Habilitadores:**
    1.  **DNP** (Desarrollo de Nuevos Productos)
    2.  **EE** (Empaques Especiales)
    3.  **CA** (Cambio de Arte)
*   **Lógica en SAPUI5 Controller:**
    *   Se asocia un controlador de eventos `change` (`change="onTipoEntradaChange"`) al control de selección (`sap.m.ComboBox` o `sap.m.Select`) del Tipo de Entrada.
    *   El método evalúa el valor seleccionado del modelo.
    *   Si el valor es `'DNP'`, `'EE'` o `'CA'`, se setea la propiedad del modelo de UI local `localUI>/isFolioVisible` a `true`. Para cualquier otro caso, se setea a `false` (lo que oculta el campo y su etiqueta de manera responsiva).

##### B. Comportamiento del Botón Cancelar (Refinamiento Crítico de UX)
*   **Regla de Negocio:** El botón **"Cancelar"** (`type: Reject`) en el footer global descarta por completo la sesión actual para evitar envíos inconsistentes.
*   **Secuencia de Comportamiento:**
    1.  El usuario hace clic en el botón **"Cancelar"**.
    2.  El sistema intercepta la acción y abre un cuadro de diálogo nativo de Fiori `sap.m.MessageBox.confirm`:
        *   *Texto del Mensaje:* **"¿Está seguro de que desea salir? Se perderán todas las solicitudes acumuladas que no han sido enviadas a Workflow."**
        *   *Título:* **"Confirmar Cancelación"**
        *   *Botones:* **"Sí"** (`MessageBox.Action.YES`) y **"No"** (`MessageBox.Action.NO`).
    3.  **Si el usuario selecciona "No":** El diálogo se cierra y el usuario permanece en su pantalla de trabajo actual con todos sus datos intactos.
    4.  **Si el usuario selecciona "Sí":**
        *   Se vacía el modelo local del grid inferior de staging (eliminando todos los temporales acumulados).
        *   Se resetea el formulario superior de captura.
        *   Se ejecuta la navegación de regreso hacia el Launchpad del prototipo mediante el router de SAPUI5: `this.getOwnerComponent().getRouter().navTo("TargetLaunchpad");`

---

#### Flujo Detallado de Botones Estándar:
*   **Estado Inicial (Captura):**
    *   Campos de Datos Generales y Datos Básicos: `editable="true"`.
    *   Botón **Limpiar**: Habilitado.
    *   Botón **Confirmar Datos**: Habilitado.
    *   Botón **Modificar Datos**: Deshabilitado.
    *   Botón **Agregar al Listado**: Deshabilitado.
    *   `IconTabBar` de Validación: Oculto o deshabilitado (`enabled="false"`).
*   **Al presionar "Confirmar Datos" (Validación Local):**
    *   Se validan formatos de campos obligatorios en el frontend.
    *   Si es válido:
        *   Campos de captura pasan a `editable="false"`.
        *   Botón **Confirmar Datos** y **Limpiar**: Se deshabilitan.
        *   Botón **Modificar Datos** y **Agregar al Listado**: Se habilitan.
        *   Se realiza llamada OData V4 para rellenar las pestañas informativas (`IconTabBar`).
*   **Al presionar "Modificar Datos":**
    *   Se retorna al estado de captura inicial.
    *   Se limpian los datos de las pestañas informativas del `IconTabBar`.
    *   Campos de captura vuelven a `editable="true"`.
*   **Al presionar "Agregar al Listado":**
    *   Se ejecutan las validaciones cruzadas especificadas en el backend (vistas seleccionadas, combinaciones FERT, centro válido en Org. de Ventas, etc.).
    *   Se inserta el registro en el **Grid de Solicitudes (Staging)** inferior.
    *   **Auto-Reset:** El formulario superior se limpia por completo y vuelve a estar en modo editable (`editable="true"`), listo para que el usuario capture otro material o centro si lo desea.
    *   El botón **"Enviar a Workflow"** en el footer se habilita si el grid contiene al menos un elemento.
*   **Al presionar "Enviar a Workflow":**
    *   Se ejecuta un trigger masivo vía OData Action (`EnviarWorkflow`) que procesa los registros del objeto técnico temporal en el backend de ABAP RAP, iniciando los hilos individuales del Workflow.

---

### 4. Integración Técnica (OData V4 & Backend RAP) - Fase 2 - Aún no aplicar
*   **Modelo de Datos:** El controlador de la aplicación se enlazará a la entidad raíz `ZC_WFMAT_SOLIC` del servicio OData V4.
*   **Draft Capabilities / Objeto Temporal:** Para mantener el enfoque Clean Core, se utilizarán las propiedades de guardado temporal de RAP. Cada vez que se agrega un registro al listado, se invoca una acción en la capa de persistencia interna.
*   **Navegación:** Al consumir las tareas desde *Fiori My Inbox*, se invocará un Target Mapping configurado con el *Semantic Object* del material, abriendo de forma nativa la MM01 o la app "Manage Product Master" filtrada por la vista correspondiente.
