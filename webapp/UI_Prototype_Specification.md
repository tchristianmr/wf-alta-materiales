# Especificación Funcional: Prototipo de Pantalla Custom (Alta/Extensión de Materiales)
**ID Requerimiento:** GAP_P2P_07
**Estado:** Prototipo de Alta Fidelidad (Legacy Migración ZWFMM01)
**Desarrollo:** SAPUI5 Freestyle (TypeScript) con Mock Data (JSON)

## 1. Propósito de la Aplicación
Interface centralizada para que el solicitante capture los datos iniciales, valide la configuración de vistas según el tipo de material/centro y detone el flujo de trabajo (Workflow) para los responsables de cada área.

## 2. Estructura de la Pantalla (Secciones)

### Sección 1: Datos Generales (Niveles Organizacionales)
Basado en la cabecera de la transacción legacy (Zona 1) - Captura de los parámetros que determinan la visibilidad y responsables:

- **Material:** (Input) (MATNR - CHAR18) + Descripción (MAKTX - CHAR40). Validación de rango interno/externo (T134-NUMKE).
- **Tipo de Material:** (MTART - CHAR4) + Descripción (MTBEZ - CHAR25). Validado contra Objeto Custom 1.
- **Ramo:** (MBRSH - CHAR1) + Descripción (T137T-MBBEZ - CHAR25).
- **Tipo de Entrada:** (Objeto Custom 3 - CHAR3). + Descripción (CHAR 40). Ejemplo: Tipo: DNP, Denominación: Desarrollo Nuevos Productos.
- **Desc. Tip. Entr.:** (Campo descriptivo (CHAR 40) del Objeto Custom 3).
- **Folio:** (CHAR10).
- **Centro:** (WERKS - CHAR4) + Descripción (NAME1 - CHAR30). Validar contra Objeto Custom 1.
- **Organiz. ventas:** (VKORG - CHAR4) + Descripción (VTEXT - CHAR20). Validar contra Objeto Custom 2.
- **¿Material Maquilado?:** (Checkbox - ZMAQ1).
- **Material de Exp.:** (Checkbox - ZINDEXP).
- **Modo de Proceso:** (Radio Buttons - IND_FD). Opciones: "Fabricación" (Valor 'M') o "Distribución" (Valor 'D').

### Sección 2: Datos Básicos
Datos maestros iniciales para la creación básica (HEADDATA / BASIC_VIEW) - Mapeo directo a `BAPI_MATERIAL_SAVEDATA` (Zona 2):

- **Denominación:** (MAKTX - CHAR40). Entrada manual en ESPAÑOL (ES) y replicarlo a EN (internamente).
- **UM base:** (MEINS - UNIT3) + Descripción.
- **Sector:** (SPART - CHAR2) + Descripción.
- **Gr.tp.pos.gral.:** (TPTM-MTPOS - CHAR4) + Descripción.
- **Grupo artículos:** (T023-MATKL - CHAR9) + Descripción.
- **Jerarquía Produc:** (T179-PRODH - CHAR18). Obligatorio si el material es FERT.

### Sección 3: Control de Tiempos
- **Estado:** No aplica para esta fase del desarrollo.

### Sección 4: Gestión de Vistas (Tabs Dinámicos)
Esta sección orquesta la lógica de visibilidad del Workflow (Zona 4) - Lógica de consulta para determinar el estado del material:

1.  **Pestaña Vistas a Crear:**
    - Basado en **Objeto Custom 1** (STATM).
    - Campos: `Vista` (ID Vista), `Descripción`, `Usuario` (Responsable configurado).
    - **Controles:** Checkbox `Crear`.
    - **Semáforo 'Creada':** Verde si el status existe en `MARC-PSTAT`, Rojo si no.
    - **Semáforo 'En WF':** Verde si el Work Item está activo en `SWWWIHEAD`, Rojo si no.
2.  **Pestaña Vistas creadas:** Lista detallada basada en los status de actualización de la tabla `MARC`.
3.  **Pestaña Vistas en WF:** Reporte de tareas pendientes consultando `SWWWIHEAD` y `SWWUSERWI` para el Material/Centro.
4.  **Pestaña Vistas de Ventas:** Consulta a tabla `MVKE` (MATNR, VKORG, VTWEG).
5.  **Pestaña Canales de Dist. Conf.:** Consulta de configuración en **Objeto Custom 2**.

### Sección 5: Solicitudes de Materiales para Crear (Grid Detonador)
- **Función:** Tabla de pre-guardado local (solo visualización) que acumula los registros confirmados. Tabla de acumulación antes del envío (Zona 5).
- **Acción "Enviar Workflow":** Al disparar este botón, el sistema debe:
- **Columnas:** No. Material, Descripción, Centro, ¿Mat Maq?, ¿C.Lt?, Tipo (Fab/Dis), Ramo, Unid.Med., Sector, Gr.tp.pos.gral, Gpo.Art., Org.Ventas, Jquía.productos, Vistas a crear (concatenadas).
- **Acciones:** Eliminar registro.
- **Acción Pie de página: Enviar a Workflow** (Trigger Principal).

## 3. Reglas de Validación UI
1. **Rango de Números:** Si el tipo de material es interno, el campo "Material" debe bloquearse. Si es externo, es obligatorio y debe validarse que no exista en MARA.
   - **En modo Extensión** (independientemente del rango): el campo "Material" es de captura obligatoria. El sistema valida su existencia contra MARA; si el material capturado no existe, el sistema bloquea el avance y muestra el mensaje: **"El material capturado no existe."**
2. **Validación FERT:** Para centros en México/USA, la unidad de medida debe ser obligatoriamente 'Caja' (CJ) o 'Palet' (PAL).
3. **Botón Confirmar:** Al presionar, se bloquean las secciones 1 y 2, y se habilita el botón "Agregar".
4. **Botón Agregar:** Solo permite añadir al grid si la vista seleccionada no está ya creada ni está actualmente en proceso de Workflow.
5. **Divulgación Progresiva:** Las pestañas de la Sección 4 solo se activan tras confirmar los datos generales.
6. **Feedback Inmediato:** Uso de semáforos (Rojo/Verde) para informar al usuario sobre el estado real de la base de datos sin salir de la pantalla.
7. **Seguridad:** Los campos se vuelven de solo lectura según el estado del proceso (Confirmado/Agregado).


## 4. Flujo de Experiencia del Usuario (User Journey)
Desde el punto de vista del **Usuario Solicitante**, la interacción con el prototipo sigue un flujo lógico de validación progresiva para evitar errores en el Dato Maestro:

### Paso 1: Definición del Escenario (Creación vs. Extensión)
El usuario inicia seleccionando mediante un `Radio Button` o `Checkbox` si desea crear un material nuevo o extender uno existente:
- **Si es Creación:** El sistema valida el rango de números según el Tipo de Material. Si es interno, el sistema asignará el número al final; si es externo, el usuario debe teclearlo y el sistema validará en tiempo real que no exista ya en el catálogo.
- **Si es Extensión:** El usuario ingresa un número de material existente (captura obligatoria). El sistema valida contra MARA; si el código no existe, lanza el error "El material capturado no existe" y no permite avanzar. Si el material existe, el sistema autocompleta automáticamente los siguientes campos desde el maestro de materiales (MARA): **Tipo de Material, Ramo, Denominación, UM, Sector, Grupo de Artículos y Jerarquía de Productos.** Estos campos se muestran solo para visualización y no pueden ser modificados por el usuario durante la extensión.

### Paso 2: Bloqueo de Niveles Organizacionales
Una vez capturados los Datos Generales (Sección 1) y Datos Básicos (Sección 2), el usuario debe presionar el botón **"Confirmar Datos"**.
- **Efecto en la UI:** Los campos de las secciones 1 y 2 se bloquean (read-only). Se deshabilitan los botones "Limpiar" y "Confirmar".
- **Propósito:** Evitar que el usuario cambie el Centro o el Tipo de Material mientras está seleccionando las vistas en los siguientes pasos, lo cual invalidaría la configuración de responsables.

### Paso 3: Selección Inteligente de Vistas
El usuario se dirige a la pestaña **"Vistas a crear"**. Aquí el prototipo le asiste visualmente:
- El sistema consulta automáticamente el **Objeto Custom 1** y muestra solo las vistas que corresponden a ese Centro y Tipo de Material.
- El usuario utiliza los **Semáforos** para tomar decisiones:
    - Si ve un semáforo **Verde** en "Vista creada", sabe que no necesita seleccionarla.
    - Si ve un semáforo **Verde** en "En WF", sabe que ya hay una solicitud en curso y no debe duplicarla.
- El usuario marca los checkboxes de las vistas que realmente necesita y presiona el botón **"Agregar"**.

### Paso 4: Validación de Reglas de Negocio (Pre-vuelo)
Al presionar "Agregar", el usuario recibe feedback inmediato del sistema. El prototipo valida:
- Que haya al menos una vista seleccionada.
- Que si eligió la vista de Ventas, haya capturado la Org. de Ventas en la Sección 1.
- Que si el material es tipo **FERT** y es para México/USA, la Unidad de Medida sea obligatoriamente Caja o Palet.
- Que exista un responsable configurado en el **Objeto Custom 1** para cada vista solicitada.

### Paso 5: Consolidación y Envío (El Detonador)
Si las validaciones son exitosas, la solicitud baja al **Grid de la Sección 5**. 
- El usuario puede repetir los pasos anteriores para agregar diferentes combinaciones de Material/Centro en una sola sesión de trabajo.
- El usuario revisa el resumen en el grid (puede eliminar líneas si se equivocó).
- Finalmente, presiona **"Enviar Workflow"**. En este momento, el usuario recibe una confirmación de que el material ha sido creado de forma básica y que las tareas han sido distribuidas a los responsables (Ventas, Compras, Contabilidad, etc.).

## 5. Estrategia de Implementación (Mocking)
Al no contar con servicios OData v4 activos, el prototipo utilizará **JSON Models** (`sap.ui.model.json.JSONModel`) locales que simulen la respuesta de:

- `ObjetoCustom1.json`: Mapeo de Centros/Materiales/Vistas/Usuarios.
- `ObjetoCustom2.json`: Configuración de Organizaciones de Ventas.
- `StatusVistas.json`: Datos simulados de `MARC` y `SWWWIHEAD` para los semáforos.
- Si se requiere implementar otras, hazlo.


# Definición de Objetos Custom (Tablas de Configuración)

## Objeto Custom 1: Responsables por Vista
Determina quién debe recibir la tarea de Workflow según la ubicación y el tipo de material.
- **Campos Clave:** Centro, Tipo de Material, ID Status (Vista).
- **Campos de Datos:** Usuario Responsable 1, Usuario Responsable 2 (Listas de usuarios soportadas).
- **Indicador:** Material de Exportación (XFELD).

## Objeto Custom 2: Combinaciones de Vistas de Venta
Determina en qué Organizaciones de Venta y Canales debe crearse el material.
- **Campos Clave:** Tipo de Material, Organización de Ventas.
- **Campos de Datos:** Canal de Distribución.

## Objeto Custom 3: Catálogo de Tipos de Entrada
Clasificación para el proceso de alta.
- **Campos:** ID Tipo de Entrada (CHAR3), Descripción (CHAR30).
- **Ejemplos:** DNP (Nuevos productos), EE (Empaques especiales), CA (Cambio de arte).


# Lógica del Detonador de Workflow (Botón Enviar)

## Proceso de Ejecución
1. **Consolidación:** El sistema toma todos los registros acumulados en el "Grid de Solicitudes" (Sección 5).
2. **Validación de Responsables:** Por cada registro, consulta el **Objeto Custom 1** para identificar a los destinatarios.
3. **Secuenciación:** El envío de notificaciones debe seguir una secuencia definida en un objeto de constantes (modificable por el usuario).
4. **Notificación:**
    - Generación de correo electrónico/notificación en Fiori My Inbox.
    - **Texto base:** "Capturar vista Material [MATNR] Centro [WERKS]".
    - **Link Dinámico:** El doble clic en la notificación debe abrir la transacción `MM01` (o app Fiori equivalente) posicionada directamente en la vista correspondiente según el ID del Workflow.

## Consideraciones Especiales
- **No Rechazo:** Por definición de negocio, el Workflow no permite rechazos. Si hay error técnico, se reinicia la tarea al responsable.
- **Maquila:** Si el indicador `ZMAQ1` está activo, se debe desplegar un mensaje preventivo al responsable antes de abrir la transacción de edición.