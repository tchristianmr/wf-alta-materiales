import type { VistasConfig, ModoProceso, ModoSolicitud, EstadoEnvio, MaterialHeader } from "./types";

/**
 * Formatters compartidos por ambos prototipos (Wizard y FCL) — GAP_P2P_07.
 */
export default {
  /** Semáforo genérico Verde/Rojo (MD Sección 4.1: "Creada" y "En WF"). */
  semaforoState(bActivo: boolean): "Success" | "Error" {
    return bActivo ? "Success" : "Error";
  },

  semaforoIcon(bActivo: boolean): string {
    return bActivo ? "sap-icon://accept" : "sap-icon://message-error";
  },

  modoProcesoTexto(sModoProceso: ModoProceso): string {
    return sModoProceso === "M" ? "Fabricación" : "Distribución";
  },

  modoSolicitudTexto(sModoSolicitud: ModoSolicitud): string {
    return sModoSolicitud === "extension" ? "Extensión" : "Creación";
  },

  /** MD Sección 5: "Con lista de materiales" (¿C.Lt?) se deriva de IND_FD, no es captura manual. */
  zlmatHint(sModoProceso: ModoProceso): string {
    return sModoProceso === "M"
      ? "Con lista de materiales: X (Fabricación)"
      : "Con lista de materiales: (vacío — Distribución)";
  },

  /** Conteo para el badge de la pestaña "Vistas creadas" (MARC-PSTAT simulado). */
  contarCreadas(aVistas: VistasConfig[]): number {
    return aVistas ? aVistas.filter((v) => v.creada).length : 0;
  },

  /** Conteo para el badge de la pestaña "Vistas en WF" (SWWWIHEAD simulado). */
  contarEnWF(aVistas: VistasConfig[]): number {
    return aVistas ? aVistas.filter((v) => v.enWF).length : 0;
  },

  /** Resumen legible de las vistas marcadas para crear, usado en pantallas de revisión. */
  vistasSeleccionadasResumen(aVistas: VistasConfig[]): string {
    if (!aVistas || aVistas.length === 0) {
      return "(ninguna)";
    }
    const aSeleccionadas = aVistas.filter((v) => v.crear).map((v) => v.vista);
    return aSeleccionadas.length > 0 ? aSeleccionadas.join(", ") : "(ninguna)";
  },

  /**
   * propuesta-2-split-app.md v2, Sección 2: icono/texto/estado del ObjectStatus de cada ítem
   * del carrito. Mientras estadoEnvio==="Listo" se muestra el Tipo de Operación (Alta/Extensión);
   * durante el envío, el ícono cambia temporalmente para reflejar el tránsito.
   */
  calcularEstadoVisualCarrito(
    sModoSolicitud: ModoSolicitud,
    sEstadoEnvio: EstadoEnvio
  ): { icon: string; text: string; state: "Success" | "Information" | "Warning" | "None" } {
    if (sEstadoEnvio === "Enviando") {
      return { icon: "sap-icon://pending", text: "Enviando...", state: "Warning" };
    }
    if (sEstadoEnvio === "Enviado") {
      return { icon: "sap-icon://sys-enter-2", text: "Enviado", state: "Success" };
    }
    return sModoSolicitud === "extension"
      ? { icon: "sap-icon://add-process", text: "Extensión", state: "Information" }
      : { icon: "sap-icon://create", text: "Alta Nueva", state: "Success" };
  },

  /** propuesta-2-split-app.md, Sección 2: título dinámico del panel Detail (FCL). */
  tituloDetalleFCL(oRoot: { ui: { modoLectura: boolean }; header: MaterialHeader }): string {
    if (!oRoot) {
      return "";
    }
    if (oRoot.ui.modoLectura) {
      return "Detalle de Solicitud (Solo Lectura)";
    }
    return oRoot.header.modoSolicitud === "extension" ? "Captura de Extensión de Material" : "Captura de Material Nuevo";
  }
};
