import type {
  EntryParametersRAP,
  TipoMaterialRangoConfig,
  VistasConfig,
  MaterialHeader,
  ResultGrid,
  ResultadoValidacion,
  ContextoValidacionAgregar,
  RangoNumeracion
} from "./types";

/**
 * Lógica de negocio pura de la captura de solicitudes de material (GAP_P2P_08).
 *
 * No depende de ningún control UI5. Los datos de configuración que todavía son mock
 * No depende de ningún control UI5. El rango de numeración llega del backend
 * (ZPPD_I_MATERIALRANGO); las vistas por crear, sus responsables y los canales de distribución
 * vienen de IM_CreateMaterial / IM_ExtendMaterial, no de esta clase.
 * crear, sus responsables y los canales de distribución vienen del backend real
 * (IM_CreateMaterial / IM_ExtendMaterial), no de esta clase.
 *
 * Los mensajes de error se devuelven como claves i18n (`claveMensaje` + `argsMensaje`); el
 * controller los traduce.
 */
export default class VistasManager {
  constructor(private readonly rangosTipoMaterial: TipoMaterialRangoConfig[]) { }

  /** Rango de numeración por Tipo de Material (ZPPD_I_MATERIALRANGO). */
  public calcularRangoNumeracion(sTipoMaterial: string): RangoNumeracion | undefined {
    return this.rangosTipoMaterial.find((r) => r.tipoMaterial === sTipoMaterial)?.rango;
  }

  /**
   * Validaciones previas al botón "Agregar al Listado". Devuelve el primer error encontrado.
   * Las reglas 6 (centro válido para la Org. Ventas) y 7 (responsable configurado en Custom 1)
   * las valida el backend en IM_ValMaterial, no esta clase.
   */
  public validarAgregar(oContexto: ContextoValidacionAgregar, aVistas: VistasConfig[]): ResultadoValidacion {
    const aSeleccionadas = aVistas.filter((v) => v.crear);

    // 1) Al menos una vista seleccionada.
    if (aSeleccionadas.length === 0) {
      return { valido: false, claveMensaje: "msgSeleccioneVista" };
    }

    // 2) Si eligió la vista de Ventas ('V'), debe haber Org. Ventas capturada.
    const bIncluyeVentas = aSeleccionadas.some((v) => v.vista === "V");
    if (bIncluyeVentas && !oContexto.orgVentas) {
      return { valido: false, claveMensaje: "msgOrgVentasRequerida" };
    }

    // 3) La Org. Ventas debe tener canal de distribución configurado (canales reales del backend).
    if (bIncluyeVentas && !oContexto.canalesConfigurados.some((c) => c.orgVentas === oContexto.orgVentas)) {
      return { valido: false, claveMensaje: "msgSinCanalConfigurado", argsMensaje: [oContexto.tipoMaterial, oContexto.orgVentas] };
    }

    // 4) Cada vista solicitada debe tener responsable resuelto.
    const aSinResponsable = aSeleccionadas.filter((v) => !v.usuarioResponsable).map((v) => v.vista);
    if (aSinResponsable.length > 0) {
      return { valido: false, claveMensaje: "msgSinResponsable", argsMensaje: [aSinResponsable.join(", "), oContexto.centro, oContexto.tipoMaterial, oContexto.exportacionTexto, oContexto.modoTexto] };
    }

    // 5) No permitir vistas ya creadas ni ya en Workflow.
    const aYaProcesadas = aSeleccionadas.filter((v) => v.creada || v.enWF).map((v) => v.vista);
    if (aYaProcesadas.length > 0) {
      return { valido: false, claveMensaje: "msgVistasYaProcesadas", argsMensaje: [aYaProcesadas.join(", ")] };
    }

    return { valido: true };
  }

  /** Proyecta la solicitud confirmada + vistas seleccionadas hacia la fila del grid de solicitudes. */
  public construirFilaGrid(oHeader: MaterialHeader, aVistas: VistasConfig[], oEntrada: EntryParametersRAP): ResultGrid {
    const aSeleccionadas = aVistas.filter((v) => v.crear);
    return {
      solicitudId: oHeader.solicitudId,
      material: oHeader.material || "(nuevo — asignado internamente al confirmar)",
      descripcion: oHeader.descripcionEs,
      centro: oHeader.centro,
      materialMaquilado: oHeader.materialMaquilado,
      // ZLMAT ("Con lista de materiales") se deriva del Modo de Proceso: 'M' Fabricación ⇒ ZLMAT='X'.
      conListaMateriales: oHeader.modoProceso === "M",
      modoProceso: oHeader.modoProceso,
      ramo: oHeader.ramo,
      umBase: oHeader.umBase,
      sector: oHeader.sector,
      grupoTipoPosGral: oHeader.grupoTipoPosGral,
      grupoArticulos: oHeader.grupoArticulos,
      orgVentas: oHeader.orgVentas,
      jerarquiaProductos: oHeader.jerarquiaProductos,
      vistasACrear: aSeleccionadas.map((v) => v.vista).join(", "),
      modoSolicitud: oHeader.modoSolicitud,
      entrada: oEntrada,
      estado: "pendiente",
      mensaje: ""
    };
  }
}