import JSONModel from "sap/ui/model/json/JSONModel";
import Device from "sap/ui/Device";
import type { MaterialHeader, ModoSolicitud } from "./types";

export function createDeviceModel () {
    const model = new JSONModel(Device);
    model.setDefaultBindingMode("OneWay");
    return model;
}

/** Clave técnica local del draft (no es un campo SAP) — ver MaterialHeader.solicitudId en types.ts. */
export function generarSolicitudId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * MaterialHeader con valores por defecto vacíos, listo para capturarse. `modoSolicitud` se
 * recibe como parámetro porque en el Prototipo 1 (Wizard) lo fija el tile de origen
 * (Crear Material / Extender Material — confirmado con el arquitecto), mientras que en el
 * Prototipo 2 (FCL) lo elige el usuario dentro del propio formulario.
 */
export function createMaterialHeaderDraft(sModoSolicitud: ModoSolicitud = "creacion"): MaterialHeader {
  return {
    solicitudId: generarSolicitudId(),
    modoSolicitud: sModoSolicitud,
    material: "",
    tipoMaterial: "",
    tipoMaterialDesc: "",
    ramo: "",
    ramoDesc: "",
    tipoEntrada: "",
    tipoEntradaDesc: "",
    folio: "",
    centro: "",
    centroDesc: "",
    orgVentas: "",
    orgVentasDesc: "",
    materialMaquilado: false,
    materialExportacion: false,
    modoProceso: "M",
    descripcionEs: "",
    descripcionEn: "",
    umBase: "",
    umBaseDesc: "",
    sector: "",
    sectorDesc: "",
    grupoTipoPosGral: "",
    grupoTipoPosGralDesc: "",
    grupoArticulos: "",
    grupoArticulosDesc: "",
    jerarquiaProductos: "",
    estadoProceso: "Captura"
  };
}

/**
 * Modelo local compartido por ambos prototipos (Wizard y FCL) para una solicitud en curso:
 * header + estado de UI (semáforos de bloqueo, mensajes) + vistas calculadas + grid local
 * (MD Sección 5). Cada prototipo instancia su propia copia — no es un singleton compartido
 * en tiempo de ejecución, sino la misma FORMA de modelo reutilizada por ambos.
 */
export function createSolicitudModel(sModoSolicitud: ModoSolicitud = "creacion"): JSONModel {
  return new JSONModel({
    header: createMaterialHeaderDraft(sModoSolicitud),
    ui: {
      messageStripText: "",
      messageStripType: "None",
      messageStripVisible: false,
      step1Validated: false,
      step2Validated: false,
      step3Validated: false,
      hayRegistrosEnGrid: false
    },
    vistasCrear: [],
    vistasVenta: [],
    canalesConf: [],
    grid: []
  });
}