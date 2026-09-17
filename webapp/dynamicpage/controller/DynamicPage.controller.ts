import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";
import type Event from "sap/ui/base/Event";
import type { Button$PressEvent } from "sap/m/Button";
import type { ComboBox$ChangeEvent } from "sap/m/ComboBox";
import type { InputBase$ChangeEvent } from "sap/m/InputBase";
import type { CheckBox$SelectEvent } from "sap/m/CheckBox";
import formatter from "../../model/formatter";
import VistasManager from "../../model/VistasManager";
import { createDynamicPageModel, createMaterialHeaderDraft } from "../../model/models";
import type {
  VistasConfig,
  ModoSolicitud,
  ContextoValidacionAgregar,
  ResponsableVistaConfig,
  StatusVistaSimulado,
  CombinacionVentaConfig,
  VentaMaterialSimulada,
  TipoMaterialRangoConfig,
  MaterialMaestroConfig,
  CentroCodigoTexto,
  ResultGrid,
  MaterialHeader
} from "../../model/types";
import type AppComponent from "../../Component";

/** Objeto Custom 3: códigos que habilitan el campo Folio (propuesta-3-dynamic-page.md, Regla A). */
const CODIGOS_HABILITAN_FOLIO = ["DNP", "EE", "CA"];

/**
 * @namespace com.alen.mm.wfaltamat.dynamicpage.controller
 */
export default class DynamicPage extends Controller {
  public formatter = formatter;

  public onInit(): void {
    // Misma lección aprendida en Wizard/FCL: la vista nunca debe quedar sin modelo.
    this.getView()!.setModel(createDynamicPageModel());
  }

  private getRouter() {
    return (this.getOwnerComponent() as AppComponent).getRouter();
  }

  private getModel(): JSONModel {
    return this.getView()!.getModel() as JSONModel;
  }

  private getConfigRows<T>(sModelName: string): T[] {
    return ((this.getView()!.getModel(sModelName) as JSONModel).getProperty("/rows") as T[]) || [];
  }

  private getVistasManager(): VistasManager {
    return new VistasManager(
      this.getConfigRows<ResponsableVistaConfig>("responsableVista"),
      this.getConfigRows<StatusVistaSimulado>("statusVistas"),
      this.getConfigRows<CombinacionVentaConfig>("combinacionVenta"),
      this.getConfigRows<TipoMaterialRangoConfig>("tipoMaterialRango"),
      this.getConfigRows<VentaMaterialSimulada>("ventaMaterial")
    );
  }

  private showStrip(sText: string, sType: "Success" | "Error" | "Warning" | "Information"): void {
    const oModel = this.getModel();
    oModel.setProperty("/ui/messageStripText", sText);
    oModel.setProperty("/ui/messageStripType", sType);
    oModel.setProperty("/ui/messageStripVisible", true);
  }

  private clearStrip(): void {
    this.getModel().setProperty("/ui/messageStripVisible", false);
  }

  private materialExisteEnMaestro(sMaterial: string): boolean {
    return this.getConfigRows<MaterialMaestroConfig>("materialMaestro").some((m) => m.material === sMaterial);
  }

  private getCentroPais(sCentro: string): string {
    const oValueHelpModel = this.getView()!.getModel("valueHelp") as JSONModel;
    const aCentros = (oValueHelpModel.getProperty("/centros") as CentroCodigoTexto[]) || [];
    return aCentros.find((c) => c.key === sCentro)?.pais ?? "";
  }

  // --- Captura activa: Datos Generales + Datos Básicos ------------------------------------------

  public onModoSolicitudChange(_oEvent: Event): void {
    // selectedKey del SegmentedButton ya actualizó /header/modoSolicitud (binding de dos vías).
    this.recalcFormValidated();
  }

  public onCentroChange(_oEvent: ComboBox$ChangeEvent): void {
    this.recalcFormValidated();
  }

  public onTipoMaterialChange(_oEvent: ComboBox$ChangeEvent): void {
    const oModel = this.getModel();
    const sTipoMaterial = oModel.getProperty("/header/tipoMaterial") as string;
    const sRango = this.getVistasManager().calcularRangoNumeracion(sTipoMaterial);
    oModel.setProperty("/ui/rangoNumeracion", sRango);
    if (sRango === "Interno" && oModel.getProperty("/header/modoSolicitud") !== "extension") {
      oModel.setProperty("/header/material", "");
    }
    this.recalcFormValidated();
  }

  /** MD Propuesta 3, Regla de Negocio A: Folio visible solo si Tipo de Entrada es DNP/EE/CA. */
  public onTipoEntradaChange(_oEvent: ComboBox$ChangeEvent): void {
    const oModel = this.getModel();
    const sTipoEntrada = oModel.getProperty("/header/tipoEntrada") as string;
    const oCatalogo = this.getConfigRows<{ idTipoEntrada: string; descripcion: string }>("tipoEntradaCatalogo");
    const oEncontrado = oCatalogo.find((c) => c.idTipoEntrada === sTipoEntrada);
    oModel.setProperty("/header/tipoEntradaDesc", oEncontrado?.descripcion ?? "");
    oModel.setProperty("/ui/isFolioVisible", CODIGOS_HABILITAN_FOLIO.includes(sTipoEntrada));
    if (!CODIGOS_HABILITAN_FOLIO.includes(sTipoEntrada)) {
      oModel.setProperty("/header/folio", "");
    }
  }

  public onModoProcesoChange(oEvent: Event): void {
    const iIndex = (oEvent as unknown as { getParameter: (n: string) => number }).getParameter("selectedIndex");
    this.getModel().setProperty("/header/modoProceso", iIndex === 0 ? "M" : "D");
  }

  public onMaterialChange(_oEvent: InputBase$ChangeEvent): void {
    const oModel = this.getModel();
    const oHeader = oModel.getProperty("/header") as { modoSolicitud: ModoSolicitud; material: string };

    if (oHeader.modoSolicitud === "extension" && oHeader.material) {
      const oMaestro = this.getConfigRows<MaterialMaestroConfig>("materialMaestro").find((m) => m.material === oHeader.material);
      if (oMaestro) {
        oModel.setProperty("/header/tipoMaterial", oMaestro.tipoMaterial);
        oModel.setProperty("/header/ramo", oMaestro.ramo);
        oModel.setProperty("/header/descripcionEs", oMaestro.descripcionEs);
        oModel.setProperty("/header/descripcionEn", oMaestro.descripcionEs);
        oModel.setProperty("/header/umBase", oMaestro.umBase);
        oModel.setProperty("/header/sector", oMaestro.sector);
        oModel.setProperty("/header/grupoTipoPosGral", oMaestro.grupoTipoPosGral);
        oModel.setProperty("/header/grupoArticulos", oMaestro.grupoArticulos);
        oModel.setProperty("/header/jerarquiaProductos", oMaestro.jerarquiaProductos);
      } else {
        this.showStrip("El material capturado no existe.", "Error");
      }
    }
    this.recalcFormValidated();
  }

  public onDenominacionChange(_oEvent: InputBase$ChangeEvent): void {
    const oModel = this.getModel();
    oModel.setProperty("/header/descripcionEn", oModel.getProperty("/header/descripcionEs"));
    this.recalcFormValidated();
  }

  public onDatosBasicosChange(_oEvent: InputBase$ChangeEvent | ComboBox$ChangeEvent): void {
    this.recalcFormValidated();
  }

  /** Consolida Datos Generales + Datos Básicos en un solo gate (sin pasos, igual que FCL). */
  private recalcFormValidated(): void {
    const oModel = this.getModel();
    const oHeader = oModel.getProperty("/header") as MaterialHeader;
    const sRango = oModel.getProperty("/ui/rangoNumeracion") as string | undefined;

    if (oHeader.modoSolicitud === "extension") {
      if (!oHeader.material) {
        oModel.setProperty("/ui/formValidated", false);
        return;
      }
      if (!this.materialExisteEnMaestro(oHeader.material)) {
        this.showStrip("El material capturado no existe.", "Error");
        oModel.setProperty("/ui/formValidated", false);
        return;
      }
    }

    if (!oHeader.centro || !oHeader.tipoMaterial) {
      oModel.setProperty("/ui/formValidated", false);
      return;
    }

    if (sRango === "Externo") {
      if (!oHeader.material) {
        oModel.setProperty("/ui/formValidated", false);
        return;
      }
      if (oHeader.modoSolicitud === "creacion" && this.getVistasManager().existeMaterialEnSistema(oHeader.material)) {
        this.showStrip(`El material ${oHeader.material} ya existe — no puede reutilizarse para una Creación.`, "Error");
        oModel.setProperty("/ui/formValidated", false);
        return;
      }
    }

    const bJerarquiaOk = oHeader.tipoMaterial !== "FERT" || !!oHeader.jerarquiaProductos;
    const bBasicosOk = !!oHeader.descripcionEs && !!oHeader.umBase && bJerarquiaOk;

    this.clearStrip();
    oModel.setProperty("/ui/formValidated", bBasicosOk);
  }

  /** Botón "Limpiar" — resetea solo la captura activa (no toca el grid de staging). */
  public onLimpiar(_oEvent: Button$PressEvent): void {
    const oModel = this.getModel();
    const sModo = oModel.getProperty("/header/modoSolicitud") as ModoSolicitud;
    oModel.setProperty("/header", createMaterialHeaderDraft(sModo));
    oModel.setProperty("/ui/formValidated", false);
    oModel.setProperty("/ui/rangoNumeracion", undefined);
    oModel.setProperty("/ui/isFolioVisible", true);
    this.clearStrip();
  }

  /** Bloquea Datos Generales/Básicos y calcula las vistas (Sección 4). */
  public onConfirmarDatos(_oEvent: Button$PressEvent): void {
    const oModel = this.getModel();
    oModel.setProperty("/header/estadoProceso", "Confirmado");

    const oHeader = oModel.getProperty("/header") as MaterialHeader;
    const oMgr = this.getVistasManager();
    const aVistas = oMgr.calcularVistasRequeridas(
      oHeader.centro,
      oHeader.tipoMaterial,
      oHeader.materialExportacion,
      oHeader.modoSolicitud === "extension" ? oHeader.material : undefined
    );
    oModel.setProperty("/vistasCrear", aVistas);
    // "Vistas de Ventas" — simula MVKE: vistas de venta ya existentes para el MATERIAL de la solicitud.
    oModel.setProperty("/vistasVenta", oMgr.calcularVistasVentaExistentes(oHeader.material));
    // "Canales de Dist. Conf." — Objeto Custom 2: combinaciones Org.Ventas/Canal configuradas para el TIPO DE MATERIAL.
    oModel.setProperty("/canalesConf", oMgr.calcularCombinacionesVenta(oHeader.tipoMaterial));
  }

  public onModificarDatos(_oEvent: Button$PressEvent): void {
    const oModel = this.getModel();
    oModel.setProperty("/header/estadoProceso", "Captura");
    oModel.setProperty("/vistasCrear", []);
    oModel.setProperty("/vistasVenta", []);
    oModel.setProperty("/canalesConf", []);
    this.clearStrip();
  }

  public onVistaSelect(_oEvent: CheckBox$SelectEvent): void {
    // binding de dos vías (selected="{crear}") ya actualizó el modelo; nada más que hacer aquí.
  }

  // --- Grid de Solicitudes (Staging) -------------------------------------------------------------

  /** Botón "Agregar al Listado" — valida, inserta en el grid y resetea la captura (Auto-Reset). */
  public onAgregarAlListado(_oEvent: Button$PressEvent): void {
    const oModel = this.getModel();
    const oHeader = oModel.getProperty("/header") as MaterialHeader;
    const aVistas = oModel.getProperty("/vistasCrear") as VistasConfig[];
    const sPaisCentro = this.getCentroPais(oHeader.centro);
    const oContexto: ContextoValidacionAgregar = {
      tipoMaterial: oHeader.tipoMaterial,
      centro: oHeader.centro,
      paisCentro: sPaisCentro,
      orgVentas: oHeader.orgVentas,
      umBase: oHeader.umBase
    };

    const oResultado = this.getVistasManager().validarAgregar(oContexto, aVistas);
    if (!oResultado.valido) {
      this.showStrip(oResultado.mensaje ?? "No fue posible agregar la solicitud.", "Error");
      return;
    }

    const oFila: ResultGrid = this.getVistasManager().construirFilaGrid(oHeader, aVistas);
    const aGrid = (oModel.getProperty("/grid") as ResultGrid[]) || [];
    aGrid.push(oFila);
    oModel.setProperty("/grid", aGrid);
    this.syncHayRegistrosEnGrid();

    this.clearStrip();
    MessageToast.show((this.getView()!.getModel("i18n") as unknown as { getResourceBundle: () => { getText: (k: string) => string } })
      .getResourceBundle().getText("msgAgregado"));

    this.resetCapturaActiva();
  }

  /** Limpia la captura activa y la regresa a modo editable (Auto-Reset tras Agregar). */
  private resetCapturaActiva(): void {
    const oModel = this.getModel();
    const sModo = oModel.getProperty("/header/modoSolicitud") as ModoSolicitud;
    oModel.setProperty("/header", createMaterialHeaderDraft(sModo));
    oModel.setProperty("/ui/formValidated", false);
    oModel.setProperty("/ui/rangoNumeracion", undefined);
    oModel.setProperty("/ui/isFolioVisible", true);
    oModel.setProperty("/vistasCrear", []);
    oModel.setProperty("/vistasVenta", []);
    oModel.setProperty("/canalesConf", []);
    this.clearStrip();
  }

  public onEliminarGridRow(oEvent: Button$PressEvent): void {
    const oModel = this.getModel();
    const oButton = oEvent.getSource();
    const oContext = oButton.getBindingContext();
    const sPath = oContext?.getPath();
    if (!sPath) {
      return;
    }
    const iIndex = Number(sPath.split("/").pop());
    const aGrid = (oModel.getProperty("/grid") as ResultGrid[]).slice();
    aGrid.splice(iIndex, 1);
    oModel.setProperty("/grid", aGrid);
    this.syncHayRegistrosEnGrid();
  }

  private syncHayRegistrosEnGrid(): void {
    const oModel = this.getModel();
    const aGrid = (oModel.getProperty("/grid") as ResultGrid[]) || [];
    oModel.setProperty("/ui/hayRegistrosEnGrid", aGrid.length > 0);
  }

  // --- Footer global: Enviar a Workflow / Cancelar -----------------------------------------------

  public onEnviarWorkflow(_oEvent: Button$PressEvent): void {
    const oModel = this.getModel();
    const aGrid = (oModel.getProperty("/grid") as ResultGrid[]) || [];

    const bAlgunMaquilado = aGrid.some((r) => r.materialMaquilado);
    const fnEnviar = (): void => {
      MessageToast.show(
        `Workflow disparado correctamente para ${aGrid.length} registro(s). Se notificó a los responsables de cada vista vía SBWP / Fiori My Inbox.`,
        { duration: 5000 }
      );
      oModel.setProperty("/grid", []);
      this.syncHayRegistrosEnGrid();
      this.resetCapturaActiva();
    };

    if (bAlgunMaquilado) {
      MessageBox.warning(
        "Uno o más registros están marcados como Material Maquilado (ZMAQ1). Se notificará este detalle a los responsables antes de que abran la transacción de edición.",
        { onClose: fnEnviar }
      );
    } else {
      fnEnviar();
    }
  }

  /** Botón "Cancelar" — descarta la sesión completa (propuesta-3-dynamic-page.md, Regla B). */
  public onCancelar(_oEvent: Button$PressEvent): void {
    const oBundle = (this.getView()!.getModel("i18n") as unknown as { getResourceBundle: () => { getText: (k: string) => string } }).getResourceBundle();

    MessageBox.confirm(oBundle.getText("dpMsgCancelarTexto"), {
      title: oBundle.getText("dpMsgCancelarTitulo"),
      actions: [MessageBox.Action.YES, MessageBox.Action.NO],
      onClose: (sAction: string) => {
        if (sAction !== MessageBox.Action.YES) {
          return;
        }
        const oModel = this.getModel();
        oModel.setProperty("/grid", []);
        this.syncHayRegistrosEnGrid();
        this.resetCapturaActiva();
        this.getRouter().navTo("launchpad");
      }
    });
  }
}
