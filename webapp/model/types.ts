/**
 * Tipos de dominio — GAP_P2P_07 (Alta/Extensión de Materiales, migración ZWFMM01).
 *
 * Reflejan literalmente los campos listados en UI_Prototype_Specification.md (Secciones 1, 2,
 * 4 y 5, más la definición de los 3 Objetos Custom). Los comentarios //-- referencian el campo
 * SAP legacy correspondiente cuando el MD lo cita explícitamente.
 *
 * Diseñados para mapear 1:1 con las entidades de localService/metadata.xml, de forma que el
 * futuro ODataModel v4 (RAP) pueda sustituir los JSONModel mock sin tocar estas interfaces.
 */

// --- Enumeraciones de dominio -------------------------------------------------------------

/** Paso 1 del User Journey (MD Sección 4). No es un campo SAP legacy explícito. */
export type ModoSolicitud = "creacion" | "extension";

/** IND_FD — Modo de Proceso (MD Sección 1). */
export type ModoProceso = "M" | "D"; // M = Fabricación, D = Distribución

/** Gobierna el bloqueo de campos (reglas UI #3 y #7 del MD). */
export type EstadoProceso = "Captura" | "Confirmado" | "Agregado";

/** T134-NUMKE simulado — ver TipoMaterialRangoConfig. */
export type RangoNumeracion = "Interno" | "Externo";

// --- Catálogos genéricos (value help) -------------------------------------------------------

export interface CodigoTexto {
  key: string;
  text: string;
}

/** Centro con país, necesario para la regla "FERT en centros México/USA ⇒ UM = CJ/PAL". */
export interface CentroCodigoTexto extends CodigoTexto {
  pais: "MX" | "US" | string;
}

// --- Entidad principal: Solicitud de Alta/Extensión (MaterialHeader) ------------------------

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
  folio: string; // CHAR10
  centro: string; // WERKS, CHAR4
  centroDesc: string; // NAME1, CHAR30
  orgVentas: string; // VKORG, CHAR4 — obligatorio solo si se selecciona la vista Ventas
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

// --- Objeto Custom 1: Responsables por Vista -------------------------------------------------

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

// --- Mock de MARC-PSTAT / SWWWIHEAD (semáforos) ----------------------------------------------

/** Solo aplica en modo Extensión: vistas que ya existen o ya tienen un Work Item activo. */
export interface StatusVistaSimulado {
  material: string;
  centro: string;
  vista: string;
  creada: boolean; // Semáforo "Creada" — simula MARC-PSTAT
  enWF: boolean; // Semáforo "En WF" — simula SWWWIHEAD
  workItemId?: string; // SWWWIHEAD/SWWUSERWI, solo si enWF === true
}

/** Fila de la pestaña "Vistas a Crear" (MD Sección 4.1): ResponsableVistaConfig + StatusVistaSimulado fusionados. */
export interface VistasConfig {
  vista: string;
  descripcionVista: string;
  usuarioResponsable: string; // Responsable 1
  usuarioResponsable2?: string;
  crear: boolean; // checkbox "Crear"
  creada: boolean; // semáforo verde/rojo — MARC-PSTAT
  enWF: boolean; // semáforo verde/rojo — SWWWIHEAD
  workItemId?: string;
}

// --- Objeto Custom 2: Combinaciones de Vistas de Venta -----------------------------------------

/**
 * NOTA: el MD define la llave como (TipoMaterial, OrgVentas) y Canal como campo de DATOS
 * (no de llave) — es decir, una única combinación de canal válida por Org.Ventas+TipoMaterial.
 * Lo implemento tal como está escrito en el MD; si en la práctica se necesitan varios canales
 * válidos para la misma Org.Ventas, Canal tendría que sumarse a la llave. Señalado para revisión.
 */
export interface CombinacionVentaConfig {
  tipoMaterial: string;
  orgVentas: string;
  canalDistribucion: string;
}

// --- Objeto Custom 3: Catálogo de Tipos de Entrada ---------------------------------------------

export interface TipoEntradaConfig {
  idTipoEntrada: string; // CHAR3
  descripcion: string; // CHAR40 en MD 2.1 ("Desc. Tip. Entr."); la def. del Objeto Custom 3 dice CHAR30 — uso CHAR40 (el más detallado) y lo señalo.
}

// --- T134 simulado: Rango de Numeración por Tipo de Material (nuevo, acordado con el arquitecto) --

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
}

// --- Resultado de validaciones (feedback inmediato en cliente) ---------------------------------

export interface ResultadoValidacion {
  valido: boolean;
  mensaje?: string;
}

/** Contexto mínimo que VistasManager necesita para las validaciones del botón "Agregar" (MD Sección 4, Paso 4). */
export interface ContextoValidacionAgregar {
  tipoMaterial: string;
  centro: string;
  paisCentro: string; // resuelto por el caller desde ValueHelp.centros[].pais — el manager no conoce el catálogo
  orgVentas: string;
  umBase: string;
}
