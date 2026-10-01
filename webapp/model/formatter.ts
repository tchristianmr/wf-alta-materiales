import type { VistasConfig } from "./types";

/**
 * Formatters de Dynamic Page — GAP_P2P_08.
 */
export default {
  semaforoIcon(bActivo: boolean): string {
    return bActivo ? "sap-icon://accept" : "sap-icon://message-error";
  },

  /** Conteo para el badge de la pestaña "Vistas creadas" (MARC-PSTAT simulado). */
  contarCreadas(aVistas: VistasConfig[]): number {
    return aVistas ? aVistas.filter((v) => v.creada).length : 0;
  },

  /** Conteo para el badge de la pestaña "Vistas en WF" (SWWWIHEAD simulado). */
  contarEnWF(aVistas: VistasConfig[]): number {
    return aVistas ? aVistas.filter((v) => v.enWF).length : 0;
  }
};
