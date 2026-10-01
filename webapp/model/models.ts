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

/** MaterialHeader con valores por defecto vacíos, listo para capturarse. */
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
 * Modelo local de Dynamic Page (propuesta-3-dynamic-page.md): header + estado de UI + vistas
 * calculadas + grid local (MD Sección 5).
 */
export function createDynamicPageModel(): JSONModel {
  return new JSONModel({
    header: createMaterialHeaderDraft("creacion"),
    ui: {
      messageStripText: "",
      messageStripType: "None",
      messageStripVisible: false,
      formValidated: false,
      rangoNumeracion: undefined,
      hayRegistrosEnGrid: false
    },
    vistasCrear: [],
    vistasVenta: [],
    canalesConf: [],
    grid: []
  });
}