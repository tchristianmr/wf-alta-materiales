/**
 * Tipos de dominio — GAP_P2P_08 (Alta/Extensión de Materiales, migración ZWFMM01).
 *
 * Reflejan literalmente los campos listados en UI_Prototype_Specification.md (Secciones 1, 2,
 * 4 y 5, más la definición de los 3 Objetos Custom). Los comentarios //-- referencian el campo
 * SAP legacy correspondiente cuando el MD lo cita explícitamente.
 *
 * NOTA 2026-09-18: `localService/metadata.xml` quedó obsoleto como referencia de contrato — el
 * backend real (Service Binding ZPP_UI_ALTEXTMATERIAL_O4 sobre la entidad custom
 * ZPPD_R_ALTEXTMATERIAL) fue inspeccionado directamente en S4D vía ADT. El contrato real vive
 * al final de este archivo (interfaces *RAP) y se documenta en
 * docs/estrategia-tecnica-migracion-rap-odata.md. Los tipos de dominio de arriba (MaterialHeader,
 * VistasConfig, etc.) se mantienen sin cambios de forma — el mapeo hacia/desde el contrato real
 * lo hace AltExtMaterialService.ts, no estas interfaces.
 */

/** Paso 1 del User Journey (MD Sección 4). No es un campo SAP legacy explícito. */
export type ModoSolicitud = "creacion" | "extension";

/** IND_FD — Modo de Proceso (MD Sección 1). */
export type ModoProceso = "M" | "D"; // M = Fabricación, D = Distribución

/** Gobierna el bloqueo de campos (reglas UI #3 y #7 del MD). */
export type EstadoProceso = "Captura" | "Confirmado" | "Agregado";

/** Estado de envío de una fila del grid: pendiente, o el código devuelto por IM_SendWF (S/W/E). */
export type EstadoEnvio = "pendiente" | "S" | "W" | "E";

/** T134-NUMKE simulado — ver TipoMaterialRangoConfig. */
export type RangoNumeracion = "Interno" | "Externo" | "SinRango"; // <-- AGREGAR AQUÍ: "SinRango"

// --- Catálogos genéricos (value help) -------------------------------------------------------
export interface CodigoTexto {
  key: string;
  text: string;
}

/**
 * Cabecera de la solicitud. Combina MD Sección 1 (Datos Generales) y Sección 2 (Datos Básicos,
 * mapeo directo a BAPI_MATERIAL_SAVEDATA/HEADDATA). `solicitudId` es una clave técnica local
 * (no es un campo SAP) que identifica el draft antes de que exista un MATNR real.
 */
export interface MaterialHeader {
  /** Clave técnica del draft local; futura key del EntityType MaterialHeader en RAP. */
  solicitudId: string;

  // -- Sección 1: Datos Generales --
  modoSolicitud: ModoSolicitud;
  material: string; // MATNR, CHAR18 — bloqueado si TipoMaterial es de rango Interno (ver TipoMaterialRangoConfig)
  tipoMaterial: string; // MTART, CHAR4
  tipoMaterialDesc: string; // MTBEZ, CHAR25 (resuelto vía valueHelp, solo lectura)
  ramo: string; // MBRSH, CHAR1
  ramoDesc: string; // T137T-MBBEZ, CHAR25
  tipoEntrada: string; // Objeto Custom 3, CHAR3
  tipoEntradaDesc: string; // Objeto Custom 3, descripción (resuelto vía valueHelp, solo lectura)
  // Folio: descartado de la UI el 2026-09-24 (no lo almacena ni lo usa el backend).
  centro: string; // WERKS, CHAR4
  centroDesc: string; // NAME1, CHAR30
  orgVentas: string; // VKORG, CHAR4 — el front lo exige solo con la vista Ventas; IM_ValMaterial (Regla 6) lo valida siempre (pendiente con Janeth)
  orgVentasDesc: string; // VTEXT, CHAR20
  materialMaquilado: boolean; // ZMAQ1
  materialExportacion: boolean; // ZINDEXP — también es parte de la llave de búsqueda en Objeto Custom 1
  modoProceso: ModoProceso; // IND_FD

  // -- Sección 2: Datos Básicos --
  descripcionEs: string; // MAKTX CHAR40, captura manual en español
  descripcionEn: string; // MAKTX CHAR40, réplica automática a inglés (side effect de UI)
  umBase: string; // MEINS, UNIT3
  umBaseDesc: string;
  sector: string; // SPART, CHAR2
  sectorDesc: string;
  grupoTipoPosGral: string; // TPTM-MTPOS, CHAR4
  grupoTipoPosGralDesc: string;
  grupoArticulos: string; // T023-MATKL, CHAR9
  grupoArticulosDesc: string;
  jerarquiaProductos: string; // T179-PRODH, CHAR18 — obligatorio si tipoMaterial === "FERT"

  // -- Estado de proceso --
  estadoProceso: EstadoProceso;
}

/**
 * Llave compuesta CONFIRMADA con el arquitecto: Centro + TipoMaterial + Vista +
 * MaterialExportacion. El indicador XFELD es parte de la llave de búsqueda, no solo informativo.
 */
export interface ResponsableVistaConfig {
  centro: string;
  tipoMaterial: string;
  vista: string; // ID Status/Vista (K, A, B, D, E, L, Q, V...)
  materialExportacion: boolean; // XFELD — parte de la llave
  descripcionVista: string;
  usuarioResponsable1: string;
  usuarioResponsable2?: string; // "listas de usuarios soportadas" — 2do responsable opcional
}

/** Fila de la pestaña "Vistas a Crear" (MD Sección 4.1): ResponsableVistaConfig + StatusVistaSimulado fusionados. */
export interface VistasConfig {
  secuencia?: number;
  vista: string;
  descripcionVista: string;
  usuarioResponsable: string; // Responsable 1
  usuarioResponsable2?: string;
  crear: boolean; // checkbox "Crear"
  creada: boolean; // semáforo verde/rojo — MARC-PSTAT
  enWF: boolean; // semáforo verde/rojo — SWWWIHEAD
  wiTitulo?: string;
  wiFechaCreacion?: string;
  wiUsuario?: string;
}

// --- Rango de numeración por Tipo de Material (viene de ZPPD_I_MATERIALRANGO)
export interface TipoMaterialRangoConfig {
  tipoMaterial: string;
  rango: RangoNumeracion;
}

// --- Sección 5: Grid de Solicitudes (ResultGrid) -----------------------------------------------

/**
 * Fila del "Grid Detonador" (MD Sección 5). Es una PROYECCIÓN calculada de MaterialHeader +
 * las vistas seleccionadas — no una entidad persistida independiente.
 */
export interface ResultGrid {
  solicitudId: string; // referencia a MaterialHeader.solicitudId
  material: string;
  descripcion: string;
  centro: string;
  materialMaquilado: boolean; // ¿Mat Maq?
  conListaMateriales: boolean; // ¿C.Lt? — ZLMAT, derivado de modoProceso (Fabricación='X')
  modoProceso: ModoProceso; // Tipo (Fab/Dis)
  ramo: string;
  umBase: string;
  sector: string;
  grupoTipoPosGral: string;
  grupoArticulos: string;
  orgVentas: string;
  jerarquiaProductos: string;
  vistasACrear: string; // concatenadas, ej. "K, B, D, V"
  modoSolicitud: ModoSolicitud;
  entrada: EntryParametersRAP; // entrada completa que se enviará a IM_SendWF (idlinea = solicitudId, views concatenadas)
  estado: EstadoEnvio;
  mensaje: string; // mensaje del backend tras el envío
}

// --- Resultado de validaciones (feedback inmediato en cliente) ---------------------------------

export interface ResultadoValidacion {
  valido: boolean;
  claveMensaje?: string;
  argsMensaje?: string[];
}

/** Contexto mínimo que VistasManager necesita para las validaciones del botón "Agregar". */
export interface ContextoValidacionAgregar {
  tipoMaterial: string;
  orgVentas: string;
  canalesConfigurados: { orgVentas: string; canalDistribucion: string }[];
  centro: string;
  exportacionTexto: string;
  modoTexto: string;
}

// ================================================================================================
// Contrato real RAP — confirmado por inspección directa en S4D vía ADT (2026-09-18).
// Service Binding: ZPP_UI_ALTEXTMATERIAL_O4 · Entidad: ZPPD_R_ALTEXTMATERIAL (custom entity, unmanaged,
// sin draft, key: material). Ver docs/estrategia-tecnica-migracion-rap-odata.md para el detalle completo
// de madurez por acción. Estas interfaces son el espejo 1:1 de las abstract entities ABAP — el mapeo
// hacia/desde los tipos de dominio de arriba lo hace AltExtMaterialService.ts, nunca el controller.
// ================================================================================================

/**
 * Espejo de `ZPPS_EntryParameters` — una fila de `_material[]` en el parámetro de las 6 acciones.
 * Los flags viajan como CHAR1 ('X'/''), no boolean — el mapeo lo hace el service, no la vista.
 *
 * ✅ VERIFICADO contra el `$metadata` real (2026-09-18) — `material` es MaxLength 40 aquí (no 10
 * como en la key de `ZPPD_R_ALTEXTMATERIAL`); el resto de longitudes coincide con lo inferido del
 * BDEF.
 */
export interface EntryParametersRAP {
  idlinea: string;            // char36 — el solicitudId (UUID) de la fila; el backend lo devuelve idéntico en la respuesta
  material: string;           // MATNR, MaxLength 40 en este contexto
  tipoMaterial: string;       // MTART
  ramo: string;               // MBRSH
  tipoEntrada: string;        // ZENTTYPE, CHAR3
  centro: string;             // WERKS_D
  orgVtas: string;            // VKORG
  flagMaquila: string;        // ZMATMAQ — 'X' | ''
  flagExpMat: string;         // ZEXPMAT — 'X' | ''
  flagModPro: string;         // ZMODPRO — 'F' (Fabricación) | 'D' (Distribución)
  descripcion: string;        // MAKTX
  umBase: string;             // CHAR3 (confirmado en el CDS real — no es el elemento MEINS aquí)
  sector: string;             // SPART
  grupoTipoPosGral: string;   // MTPOS_MARA
  grupoArticulos: string;     // MATKL
  jerarquiaProductos: string; // PRODH_D
  matExt: string;             // CHAR7 — literal "Interno" | "Externo" (no booleano)
  views: string;              // PSTAT_D (char15) — en IM_ValMaterial va UNA letra por llamada; en el envío, todas concatenadas (ej. "ACD")
}

/**
 * Espejo de `ZPPS_RMATERIAL` — resultado de `IM_CreateMaterial`/`IM_ExtendMaterial`.
 */
export interface RMaterialRAP {
  material: string;
  tipoMaterial: string;
  ramo: string;
  tipoEntrada: string;
  centro: string;
  orgVtas: string;
  flagMaquila: string;
  flagExpMat: string;
  flagModPro: string;
  descripcion: string;
  umBase: string;
  sector: string;
  grupoTipoPosGral: string;
  grupoArticulos: string;
  jerarquiaProductos: string;
  matExt: string;
  id: string; // tipo mensaje estilo BAPI_RETURN ('E'/'S'/...)
  mensaje: string;
  _createdView: { idView: string; descripcion: string }[];
  _viewsWF: { idView: string; descripcion: string; fechacreacion: string; usuarios: string }[];
  _disChannel: { orgVtas: string; canalDis: string }[];  
  _viewsxcreate: { idsec: number; vista: string; descripcion: string; creada: boolean; enWF: boolean; wiUsuario: string }[]; 
  _salesViews: { material: string; orgventas: string; canaldistribucion: string }[];
}

/** Espejo de `ZPPS_RVALIDATION` — resultado de `IM_ValMaterial`/`IM_SendWF` (ambas devuelven colección). */
export interface RValidationRAP {
  idlinea: string;
  material: string;
  id: string;
  mensaje: string;
}

/** Espejo de `ZPPS_RPLANTMTART` — resultado de `IM_PlantByMtart`. ✅ Acción completamente funcional. */
export interface RPlantMtartRAP {
  plant: string;
  plantName: string;
}

/** Espejo de `ZPPS_RORGVTAMTART` — resultado de `IM_OrgVtaByMtart`. ✅ Acción completamente funcional. */
export interface ROrgVtaMtartRAP {
  orgvta: string;
  name: string;
}


// ================================================================================================
// Value Helps estáticas — espejo de los 7 EntitySet reales confirmados en $metadata.
// Consumidas por AltExtMaterialService (utils/), no por binding directo en el XML.
// ================================================================================================

/** Espejo de `ZPPD_I_PRODUCTTYPE_VHType`. */
export interface ProductTypeVH {
  Mtart: string;
  MaterialTypeName: string;
}

/** Espejo de `ZPPD_I_INDUSTRYSECTOR_VHType`. */
export interface IndustrySectorVH {
  idRamo: string;
  descripcion: string;
}

/** Espejo de `ZPPD_I_TIPENT_VHType`. */
export interface TipEntVH {
  idTipoEntrada: string;
  descripcion: string;
}

/** Espejo de `ZPPD_I_UnitOfMeasureText_VHType`. */
export interface UnitOfMeasureVH {
  UnitOfMeasure: string;
  UnitOfMeasureLongName: string;
}

/** Espejo de `ZPPD_I_DivisionText_VHType`. */
export interface DivisionTextVH {
  Division: string;
  DivisionName: string;
}

/** Espejo de `ZPPD_I_ItemCategoryGroupTextVHType`. */
export interface ItemCategoryGroupVH {
  ItemCategoryGroup: string;
  ItemCategoryGroupName: string;
}

/** Espejo de `ZPPD_I_PRODUCTGROUPTEXT_2_VHType`. */
export interface ProductGroupVH {
  ProductGroup: string;
  ProductGroupText: string;
}

/** Espejo de `ZPPD_I_MATERIALRANGO` (rango de numeración por Tipo de Material). */
export interface MaterialRangoVH {
  tipoMaterial: string;
  rango: RangoNumeracion;
}