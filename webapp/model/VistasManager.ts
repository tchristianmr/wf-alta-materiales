import type {
  ResponsableVistaConfig,
  StatusVistaSimulado,
  CombinacionVentaConfig,
  TipoMaterialRangoConfig,
  VistasConfig,
  MaterialHeader,
  ResultGrid,
  ResultadoValidacion,
  ContextoValidacionAgregar,
  RangoNumeracion
} from "./types";

/**
 * Componente central de negocio para la Sección 4 (Gestión de Vistas) del MD GAP_P2P_07.
 *
 * No depende de ningún control UI5 ni de la fuente de los datos de configuración: recibe
 * arreglos planos (hoy poblados desde localService/mockdata/*.json, mañana desde un
 * ODataModel v4 sobre las entidades RAP descritas en localService/metadata.xml) y expone
 * únicamente lógica de negocio pura. Reutilizable sin cambios tanto en el prototipo Wizard
 * como en el prototipo FCL.
 *
 * Cubre explícitamente:
 * - MD Sección 4.1: cálculo de vistas requeridas + semáforos "Creada" (MARC-PSTAT simulado)
 *   y "En WF" (SWWWIHEAD simulado).
 * - MD Regla de validación UI #1: bloqueo/obligatoriedad de MATNR según T134 simulado.
 * - MD Paso 4 (User Journey): las 4 validaciones de "pre-vuelo" antes de habilitar "Agregar".
 * - MD Sección 5: proyección de la solicitud confirmada hacia la fila del Grid Detonador.
 */
export default class VistasManager {
  constructor(
    private readonly responsables: ResponsableVistaConfig[],
    private readonly statusVistas: StatusVistaSimulado[],
    private readonly combinacionesVenta: CombinacionVentaConfig[],
    private readonly rangosTipoMaterial: TipoMaterialRangoConfig[]
  ) {}

  /** Regla de validación UI #1 — consulta el T134 simulado (TipoMaterialRango). */
  public calcularRangoNumeracion(sTipoMaterial: string): RangoNumeracion | undefined {
    return this.rangosTipoMaterial.find((r) => r.tipoMaterial === sTipoMaterial)?.rango;
  }

  /**
   * Regla de validación UI #1 (segunda mitad): en modo Creación con rango Externo, el número
   * de material tecleado no debe existir ya en MARA. Simulado reutilizando StatusVistaSimulado
   * (MARC-PSTAT) — cualquier material con registros de vista ahí ya existe en el sistema.
   */
  public existeMaterialEnSistema(sMaterial: string): boolean {
    return this.statusVistas.some((s) => s.material === sMaterial);
  }

  /**
   * MD Sección 4.1: calcula las vistas requeridas para Centro+TipoMaterial+MaterialExportacion
   * (llave completa de Objeto Custom 1, confirmada con el arquitecto), fusionadas con los
   * semáforos de StatusVistaSimulado. Los semáforos solo aplican en modo Extensión — un
   * material nuevo (Creación) no tiene registros previos en MARC/SWWWIHEAD.
   */
  public calcularVistasRequeridas(
    sCentro: string,
    sTipoMaterial: string,
    bMaterialExportacion: boolean,
    sMaterialExtension?: string
  ): VistasConfig[] {
    return this.responsables
      .filter((r) => r.centro === sCentro && r.tipoMaterial === sTipoMaterial && r.materialExportacion === bMaterialExportacion)
      .map((r) => {
        const oStatus = sMaterialExtension
          ? this.statusVistas.find((s) => s.material === sMaterialExtension && s.centro === sCentro && s.vista === r.vista)
          : undefined;

        return {
          vista: r.vista,
          descripcionVista: r.descripcionVista,
          usuarioResponsable: r.usuarioResponsable1,
          usuarioResponsable2: r.usuarioResponsable2,
          crear: false,
          creada: oStatus?.creada ?? false,
          enWF: oStatus?.enWF ?? false,
          workItemId: oStatus?.workItemId
        };
      });
  }

  /** MD Objeto Custom 2 — combinaciones válidas de Org.Ventas/Canal para un Tipo de Material. */
  public calcularCombinacionesVenta(sTipoMaterial: string): { orgVentas: string; canalDistribucion: string }[] {
    return this.combinacionesVenta
      .filter((c) => c.tipoMaterial === sTipoMaterial)
      .map((c) => ({ orgVentas: c.orgVentas, canalDistribucion: c.canalDistribucion }));
  }

  /** Simula el "Side Effect" de OData v4 que validaría Org.Ventas/Canal/TipoMaterial en tiempo real. */
  public validarCombinacionVenta(sTipoMaterial: string, sOrgVentas: string, sCanal: string): boolean {
    return this.combinacionesVenta.some(
      (c) => c.tipoMaterial === sTipoMaterial && c.orgVentas === sOrgVentas && c.canalDistribucion === sCanal
    );
  }

  /**
   * MD Paso 4 del User Journey ("Validación de Reglas de Negocio Pre-vuelo") — ejecuta, en
   * orden, las 4 validaciones descritas antes de permitir el botón "Agregar". Devuelve el
   * primer error encontrado para dar feedback inmediato al usuario.
   */
  public validarAgregar(oContexto: ContextoValidacionAgregar, aVistas: VistasConfig[]): ResultadoValidacion {
    const aSeleccionadas = aVistas.filter((v) => v.crear);

    // 1) Al menos una vista seleccionada.
    if (aSeleccionadas.length === 0) {
      return { valido: false, mensaje: "Seleccione al menos una vista antes de continuar." };
    }

    // 2) Si eligió la vista de Ventas ('V'), debe haber Org.Ventas capturada en Sección 1.
    const bIncluyeVentas = aSeleccionadas.some((v) => v.vista === "V");
    if (bIncluyeVentas && !oContexto.orgVentas) {
      return { valido: false, mensaje: "Debe capturar la Organización de Ventas si selecciona la vista de Ventas." };
    }

    // 2b) Side effect: la combinación Org.Ventas/Canal debe existir en el Objeto Custom 2.
    //     (El Canal de Distribución se resuelve desde la combinación, no se captura aparte.)
    if (bIncluyeVentas) {
      const aCombos = this.calcularCombinacionesVenta(oContexto.tipoMaterial);
      const bComboValida = aCombos.some((c) => c.orgVentas === oContexto.orgVentas);
      if (!bComboValida) {
        return {
          valido: false,
          mensaje: `No existe una combinación de Canal de Distribución configurada para Tipo Material ${oContexto.tipoMaterial} / Org.Ventas ${oContexto.orgVentas}.`
        };
      }
    }

    // 3) FERT en centros México/USA ⇒ UM obligatoria Caja (CJ) o Palet (PAL).
    const bMexicoOUSA = oContexto.paisCentro === "MX" || oContexto.paisCentro === "US";
    if (oContexto.tipoMaterial === "FERT" && bMexicoOUSA && oContexto.umBase !== "CJ" && oContexto.umBase !== "PAL") {
      return {
        valido: false,
        mensaje: "Para FERT en centros de México/USA la Unidad de Medida debe ser obligatoriamente Caja (CJ) o Palet (PAL)."
      };
    }

    // 4) Debe existir un responsable configurado (Objeto Custom 1) para cada vista solicitada.
    //    Por construcción, calcularVistasRequeridas() ya solo devuelve vistas con responsable
    //    resuelto — este chequeo es una red de seguridad explícita por si la fila llega de otra fuente.
    const aSinResponsable = aSeleccionadas.filter((v) => !v.usuarioResponsable).map((v) => v.vista);
    if (aSinResponsable.length > 0) {
      return {
        valido: false,
        mensaje: `No existe un responsable configurado (Objeto Custom 1) para las vistas: ${aSinResponsable.join(", ")}.`
      };
    }

    // 5) MD Regla de validación UI #4 / Sección 4 Paso 3: no permitir vistas ya Creadas ni En WF.
    const aYaProcesadas = aSeleccionadas.filter((v) => v.creada || v.enWF).map((v) => v.vista);
    if (aYaProcesadas.length > 0) {
      return {
        valido: false,
        mensaje: `Las siguientes vistas ya están creadas o en proceso de Workflow y no pueden volver a solicitarse: ${aYaProcesadas.join(", ")}.`
      };
    }

    return { valido: true };
  }

  /** MD Sección 5 — proyecta la solicitud confirmada + vistas seleccionadas hacia la fila del Grid Detonador. */
  public construirFilaGrid(oHeader: MaterialHeader, aVistas: VistasConfig[]): ResultGrid {
    const aSeleccionadas = aVistas.filter((v) => v.crear);
    return {
      solicitudId: oHeader.solicitudId,
      material: oHeader.material || "(nuevo — asignado internamente al confirmar)",
      descripcion: oHeader.descripcionEs,
      centro: oHeader.centro,
      materialMaquilado: oHeader.materialMaquilado,
      // ZLMAT ("Con lista de materiales") se deriva del Modo de Proceso (IND_FD): 'M' Fabricación ⇒ ZLMAT='X'.
      conListaMateriales: oHeader.modoProceso === "M",
      modoProceso: oHeader.modoProceso,
      ramo: oHeader.ramo,
      umBase: oHeader.umBase,
      sector: oHeader.sector,
      grupoTipoPosGral: oHeader.grupoTipoPosGral,
      grupoArticulos: oHeader.grupoArticulos,
      orgVentas: oHeader.orgVentas,
      jerarquiaProductos: oHeader.jerarquiaProductos,
      vistasACrear: aSeleccionadas.map((v) => v.vista).join(", ")
    };
  }
}
