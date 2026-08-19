import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";
import type Event from "sap/ui/base/Event";
import type SapMWizard from "sap/m/Wizard";
import type { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import type { Button$PressEvent } from "sap/m/Button";
import type { ComboBox$ChangeEvent } from "sap/m/ComboBox";
import type { InputBase$ChangeEvent } from "sap/m/InputBase";
import type { CheckBox$SelectEvent } from "sap/m/CheckBox";
import formatter from "../../model/formatter";
import VistasManager from "../../model/VistasManager";
import { createSolicitudModel, createMaterialHeaderDraft } from "../../model/models";
import type {
  VistasConfig,
  ModoSolicitud,
  ContextoValidacionAgregar,
  ResponsableVistaConfig,
  StatusVistaSimulado,
  CombinacionVentaConfig,
  TipoMaterialRangoConfig,
  MaterialMaestroConfig,
  CentroCodigoTexto,
  ResultGrid
} from "../../model/types";
import type AppComponent from "../../Component";

/**
 * @namespace com.alen.mm.wfaltamat.wizard.controller
 */
export default class Wizard extends Controller {
  public formatter = formatter;

  public onInit(): void {
    // Modelo por defecto inmediato: la vista nunca debe quedar sin modelo. Si esto se omite,
    // los bindings simples (ej. "visible") caen al defaultValue del control (true) en vez de
    // a nuestro valor, y las expression bindings evalúan sobre "undefined" — bloqueando campos
    // silenciosamente. onRouteMatched reemplaza este modelo por el de modo correcto poco después.
    this.getView()!.setModel(createSolicitudModel("creacion"));

    const oRouter = this.getRouter();
    oRouter.getRoute("wizard")?.attachPatternMatched(this.onRouteMatched, this);
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
      this.getConfigRows<TipoMaterialRangoConfig>("tipoMaterialRango")
    );
  }

  /** Se dispara al entrar por el sub-launchpad: el modo (Crear/Extender) ya viene fijado por el tile. */
  private onRouteMatched(oEvent: Route$PatternMatchedEvent): void {
    const oArgs = oEvent.getParameter("arguments") as { modo: string };
    const sModo: ModoSolicitud = oArgs.modo === "extension" ? "extension" : "creacion";

    this.getView()!.setModel(createSolicitudModel(sModo));
    this.getWizard().discardProgress(this.getStep(0), false);
    this.getWizard().goToStep(this.getStep(0), true);
  }

  private getWizard(): SapMWizard {
    return this.byId("wizWizardAlta") as SapMWizard;
  }

  private getStep(iIndex: number) {
    return this.getWizard().getSteps()[iIndex];
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

  public onVolver(): void {
    this.getRouter().navTo("wizardLaunchpad");
  }

  // --- Paso 1: Datos Generales ---------------------------------------------------------------

  public onLimpiar(): void {
    const oModel = this.getModel();
    const sModo = oModel.getProperty("/header/modoSolicitud") as ModoSolicitud;
    oModel.setProperty("/header", createMaterialHeaderDraft(sModo));
    oModel.setProperty("/ui/step1Validated", false);
    oModel.setProperty("/ui/step2Validated", false);
    oModel.setProperty("/ui/rangoNumeracion", undefined);
    this.clearStrip();
  }

  public onCentroChange(_oEvent: ComboBox$ChangeEvent): void {
    this.recalcStep1Validated();
  }

  public onTipoMaterialChange(_oEvent: ComboBox$ChangeEvent): void {
    const oModel = this.getModel();
    const sTipoMaterial = oModel.getProperty("/header/tipoMaterial") as string;
    const sRango = this.getVistasManager().calcularRangoNumeracion(sTipoMaterial);
    oModel.setProperty("/ui/rangoNumeracion", sRango);
    // Regla de validación UI #1: rango Interno ⇒ MATNR bloqueado y se limpia lo tecleado.
    if (sRango === "Interno" && oModel.getProperty("/header/modoSolicitud") !== "extension") {
      oModel.setProperty("/header/material", "");
    }
    this.recalcStep1Validated();
  }

  public onTipoEntradaChange(_oEvent: ComboBox$ChangeEvent): void {
    const oModel = this.getModel();
    const sTipoEntrada = oModel.getProperty("/header/tipoEntrada") as string;
    const oCatalogo = this.getConfigRows<{ idTipoEntrada: string; descripcion: string }>("tipoEntradaCatalogo");
    const oEncontrado = oCatalogo.find((c) => c.idTipoEntrada === sTipoEntrada);
    oModel.setProperty("/header/tipoEntradaDesc", oEncontrado?.descripcion ?? "");
  }

  public onModoProcesoChange(oEvent: Event): void {
    const iIndex = (oEvent as unknown as { getParameter: (n: string) => number }).getParameter("selectedIndex");
    this.getModel().setProperty("/header/modoProceso", iIndex === 0 ? "M" : "D");
  }

  /** Regla de validación UI #1 (segunda mitad): en Creación + rango Externo, valida que MATNR no exista ya en MARA. */
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
        this.showStrip(`El material ${oHeader.material} no se encontró en el maestro (MARA simulado).`, "Warning");
      }
    }
    this.recalcStep1Validated();
    this.recalcStep2Validated();
  }

  private recalcStep1Validated(): void {
    const oModel = this.getModel();
    const oHeader = oModel.getProperty("/header") as { modoSolicitud: ModoSolicitud; centro: string; tipoMaterial: string; material: string };
    const sRango = oModel.getProperty("/ui/rangoNumeracion") as string | undefined;

    if (!oHeader.centro || !oHeader.tipoMaterial) {
      oModel.setProperty("/ui/step1Validated", false);
      return;
    }

    if (oHeader.modoSolicitud === "extension" || sRango === "Externo") {
      if (!oHeader.material) {
        oModel.setProperty("/ui/step1Validated", false);
        return;
      }
      if (oHeader.modoSolicitud === "creacion" && this.getVistasManager().existeMaterialEnSistema(oHeader.material)) {
        this.showStrip(`El material ${oHeader.material} ya existe — no puede reutilizarse para una Creación.`, "Error");
        oModel.setProperty("/ui/step1Validated", false);
        return;
      }
    }

    this.clearStrip();
    oModel.setProperty("/ui/step1Validated", true);
  }

  public onSiguientePaso1(_oEvent: Button$PressEvent): void {
    this.getWizard().nextStep();
  }

  // --- Paso 2: Datos Básicos ------------------------------------------------------------------

  public onDenominacionChange(_oEvent: InputBase$ChangeEvent): void {
    const oModel = this.getModel();
    oModel.setProperty("/header/descripcionEn", oModel.getProperty("/header/descripcionEs"));
    this.recalcStep2Validated();
  }

  public onDatosBasicosChange(_oEvent: InputBase$ChangeEvent): void {
    this.recalcStep2Validated();
  }

  private recalcStep2Validated(): void {
    const oModel = this.getModel();
    const oHeader = oModel.getProperty("/header") as { tipoMaterial: string; descripcionEs: string; umBase: string; jerarquiaProductos: string };
    const bJerarquiaOk = oHeader.tipoMaterial !== "FERT" || !!oHeader.jerarquiaProductos;
    oModel.setProperty("/ui/step2Validated", !!oHeader.descripcionEs && !!oHeader.umBase && bJerarquiaOk);
  }

  /** MD Paso 2 del User Journey — bloquea Secciones 1 y 2 (estadoProceso='Confirmado') y avanza. */
  public onConfirmarDatos(_oEvent: Button$PressEvent): void {
    this.getModel().setProperty("/header/estadoProceso", "Confirmado");
    this.getWizard().nextStep();
  }

  // --- Paso 3: Selección de Vistas (Sección 4) -------------------------------------------------

  public onStepVistasActivate(_oEvent: Event): void {
    const oModel = this.getModel();
    const oHeader = oModel.getProperty("/header") as {
      centro: string;
      tipoMaterial: string;
      materialExportacion: boolean;
      modoSolicitud: ModoSolicitud;
      material: string;
    };
    const oMgr = this.getVistasManager();

    const aVistas = oMgr.calcularVistasRequeridas(
      oHeader.centro,
      oHeader.tipoMaterial,
      oHeader.materialExportacion,
      oHeader.modoSolicitud === "extension" ? oHeader.material : undefined
    );
    oModel.setProperty("/vistasCrear", aVistas);
    oModel.setProperty("/vistasVenta", oMgr.calcularCombinacionesVenta(oHeader.tipoMaterial));

    const aCombinaciones = this.getConfigRows<CombinacionVentaConfig>("combinacionVenta").filter(
      (c) => c.tipoMaterial === oHeader.tipoMaterial
    );
    const aCanalesUnicos: string[] = [];
    aCombinaciones.forEach((c) => {
      if (!aCanalesUnicos.includes(c.canalDistribucion)) {
        aCanalesUnicos.push(c.canalDistribucion);
      }
    });
    oModel.setProperty(
      "/canalesConf",
      aCanalesUnicos.map((c) => ({ canal: c }))
    );
  }

  public onVistaSelect(_oEvent: CheckBox$SelectEvent): void {
    // binding de dos vías (selected="{crear}") ya actualizó el modelo; nada más que hacer aquí.
  }

  /** MD Paso 3/4: valida y, si procede, baja la solicitud al Grid de la Sección 5. */
  public onAgregar(_oEvent: Button$PressEvent): void {
    const oModel = this.getModel();
    const oHeader = oModel.getProperty("/header") as { tipoMaterial: string; centro: string; orgVentas: string; umBase: string };
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

    const oHeaderCompleto = oModel.getProperty("/header");
    const oFila: ResultGrid = this.getVistasManager().construirFilaGrid(oHeaderCompleto, aVistas);
    const aGrid = (oModel.getProperty("/grid") as ResultGrid[]) || [];
    aGrid.push(oFila);
    oModel.setProperty("/grid", aGrid);
    this.syncHayRegistrosEnGrid();
    oModel.setProperty("/header/estadoProceso", "Agregado");

    this.clearStrip();
    MessageToast.show((this.getView()!.getModel("i18n") as unknown as { getResourceBundle: () => { getText: (k: string) => string } })
      .getResourceBundle().getText("msgAgregado"));
    this.getWizard().nextStep();
  }

  private getCentroPais(sCentro: string): string {
    const oValueHelpModel = this.getView()!.getModel("valueHelp") as JSONModel;
    const aCentros = (oValueHelpModel.getProperty("/centros") as CentroCodigoTexto[]) || [];
    return aCentros.find((c) => c.key === sCentro)?.pais ?? "";
  }

  /** Mantiene /ui/hayRegistrosEnGrid sincronizado — usado por "Enviar Workflow" en vez de una
   * expression binding directa sobre ${/grid}.length, por consistencia con step1/2Validated. */
  private syncHayRegistrosEnGrid(): void {
    const oModel = this.getModel();
    const aGrid = (oModel.getProperty("/grid") as ResultGrid[]) || [];
    oModel.setProperty("/ui/hayRegistrosEnGrid", aGrid.length > 0);
  }

  // --- Paso 4: Revisión y Confirmación (Sección 5) ---------------------------------------------

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

  /** MD Paso 5: reinicia el asistente para capturar otro material, conservando el Grid acumulado. */
  public onOtroMaterial(_oEvent: Button$PressEvent): void {
    const oModel = this.getModel();
    const sModo = oModel.getProperty("/header/modoSolicitud") as ModoSolicitud;
    oModel.setProperty("/header", createMaterialHeaderDraft(sModo));
    oModel.setProperty("/ui/step1Validated", false);
    oModel.setProperty("/ui/step2Validated", false);
    oModel.setProperty("/ui/rangoNumeracion", undefined);
    oModel.setProperty("/vistasCrear", []);
    oModel.setProperty("/vistasVenta", []);
    oModel.setProperty("/canalesConf", []);
    this.clearStrip();

    this.getWizard().discardProgress(this.getStep(0), false);
    this.getWizard().goToStep(this.getStep(0), true);
  }

  /** MD "Lógica del Detonador de Workflow": consolida el Grid y dispara la notificación (simulada). */
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
      this.onOtroMaterial(_oEvent);
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
}
