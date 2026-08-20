import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import type Event from "sap/ui/base/Event";
import type List from "sap/m/List";
import type { Button$PressEvent } from "sap/m/Button";
import type { ComboBox$ChangeEvent } from "sap/m/ComboBox";
import type { InputBase$ChangeEvent } from "sap/m/InputBase";
import type { CheckBox$SelectEvent } from "sap/m/CheckBox";
import type { SearchField$LiveChangeEvent } from "sap/m/SearchField";
import type { ListBase$ItemPressEvent } from "sap/m/ListBase";
import formatter from "../../model/formatter";
import VistasManager from "../../model/VistasManager";
import { createCarritoModel, createMaterialHeaderDraft, generarSolicitudId } from "../../model/models";
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
  ResultGrid,
  SolicitudCarritoItem,
  MaterialHeader
} from "../../model/types";
import type AppComponent from "../../Component";

/**
 * @namespace com.alen.mm.wfaltamat.fcl.controller
 */
export default class FCL extends Controller {
  public formatter = formatter;

  public onInit(): void {
    // Modelo por defecto inmediato — misma lección aprendida en el Wizard: la vista nunca debe
    // quedar sin modelo, o los bindings simples caen al defaultValue del control.
    this.getView()!.setModel(createCarritoModel());
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
    this.getRouter().navTo("fclLaunchpad");
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

  public onModoSolicitudChange(oEvent: Event): void {
    const iIndex = (oEvent as unknown as { getParameter: (n: string) => number }).getParameter("selectedIndex");
    this.getModel().setProperty("/header/modoSolicitud", iIndex === 1 ? "extension" : "creacion");
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

  /** Consolida las validaciones de Datos Generales + Datos Básicos (Paso 1 + Paso 2 del Wizard) en un solo gate. */
  private recalcFormValidated(): void {
    const oModel = this.getModel();
    const oHeader = oModel.getProperty("/header") as MaterialHeader;
    const sRango = oModel.getProperty("/ui/rangoNumeracion") as string | undefined;

    // MD Paso 1 (Extensión): material obligatorio y debe existir en el maestro (MARA simulado).
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

  /** MD Paso 2 del User Journey — bloquea Datos Generales/Básicos y calcula las vistas (Sección 4). */
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

  /** "Permite re-editar el material activo" (propuesta-2-split-app.md, Sección 2). */
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

  // --- Carrito (Panel Izquierdo / Master) --------------------------------------------------------

  /** "Botón Agregar al Listado" — valida, inserta en el carrito con estado 'Listo' y resetea la captura. */
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

    const oFilaGrid: ResultGrid = this.getVistasManager().construirFilaGrid(oHeader, aVistas);
    const oEstadoVisual = formatter.calcularEstadoVisualCarrito(oHeader.modoSolicitud, "Listo");
    const oItem: SolicitudCarritoItem = {
      id: oHeader.solicitudId,
      header: { ...oHeader, estadoProceso: "Agregado" },
      vistasSeleccionadas: aVistas.map((v) => ({ ...v })),
      vistasVenta: (oModel.getProperty("/vistasVenta") as { orgVentas: string; canalDistribucion: string }[]) || [],
      canalesConf: (oModel.getProperty("/canalesConf") as { canal: string }[]) || [],
      filaGrid: oFilaGrid,
      estadoEnvio: "Listo",
      estadoIconSrc: oEstadoVisual.icon,
      estadoTexto: oEstadoVisual.text,
      estadoState: oEstadoVisual.state
    };

    const aCarrito = (oModel.getProperty("/carrito") as SolicitudCarritoItem[]) || [];
    aCarrito.push(oItem);
    oModel.setProperty("/carrito", aCarrito);
    this.syncHayRegistrosEnCarrito();

    this.clearStrip();
    MessageToast.show((this.getView()!.getModel("i18n") as unknown as { getResourceBundle: () => { getText: (k: string) => string } })
      .getResourceBundle().getText("msgAgregado"));

    this.resetCapturaActiva();
  }

  /** Limpia el panel Detail y lo regresa a modo de captura activa (usado por Agregar y por "Nuevo"). */
  private resetCapturaActiva(): void {
    const oModel = this.getModel();
    oModel.setProperty("/header", createMaterialHeaderDraft("creacion"));
    oModel.setProperty("/ui/formValidated", false);
    oModel.setProperty("/ui/rangoNumeracion", undefined);
    oModel.setProperty("/ui/modoLectura", false);
    oModel.setProperty("/ui/carritoSeleccionadoId", null);
    oModel.setProperty("/vistasCrear", []);
    oModel.setProperty("/vistasVenta", []);
    oModel.setProperty("/canalesConf", []);
    this.clearStrip();
  }

  /** Botón "Nuevo" en la cabecera del Master (propuesta-2-split-app.md, Sección 3, Regla 2). */
  public onNuevoMaterial(_oEvent: Button$PressEvent): void {
    this.resetCapturaActiva();
  }

  /** Clic en un ítem del Master — carga el detalle exacto en modo Solo Lectura (Regla 1). */
  public onSeleccionarCarritoItem(oEvent: ListBase$ItemPressEvent): void {
    const oListItem = oEvent.getParameter("listItem");
    const oContext = oListItem?.getBindingContext();
    const oItem = oContext?.getObject() as SolicitudCarritoItem | undefined;
    if (!oItem) {
      return;
    }

    const oModel = this.getModel();
    oModel.setProperty("/header", { ...oItem.header });
    oModel.setProperty(
      "/vistasCrear",
      oItem.vistasSeleccionadas.map((v) => ({ ...v }))
    );
    oModel.setProperty("/vistasVenta", oItem.vistasVenta);
    oModel.setProperty("/canalesConf", oItem.canalesConf);
    oModel.setProperty("/ui/modoLectura", true);
    oModel.setProperty("/ui/carritoSeleccionadoId", oItem.id);
    this.clearStrip();
  }

  public onEliminarCarritoItem(oEvent: Button$PressEvent): void {
    const oContext = oEvent.getSource().getBindingContext();
    const oItem = oContext?.getObject() as SolicitudCarritoItem | undefined;
    if (!oItem) {
      return;
    }

    const oModel = this.getModel();
    const aCarrito = ((oModel.getProperty("/carrito") as SolicitudCarritoItem[]) || []).filter((i) => i.id !== oItem.id);
    oModel.setProperty("/carrito", aCarrito);
    this.syncHayRegistrosEnCarrito();

    if (oModel.getProperty("/ui/carritoSeleccionadoId") === oItem.id) {
      this.resetCapturaActiva();
    }
  }

  private syncHayRegistrosEnCarrito(): void {
    const oModel = this.getModel();
    const aCarrito = (oModel.getProperty("/carrito") as SolicitudCarritoItem[]) || [];
    oModel.setProperty("/ui/hayRegistrosEnCarrito", aCarrito.length > 0);
  }

  public onBuscarCarrito(oEvent: SearchField$LiveChangeEvent): void {
    const sQuery = (oEvent.getParameter("newValue") as string) || "";
    const oList = this.byId("fclListCarrito") as List;
    const oBinding = oList.getBinding("items");
    if (!oBinding) {
      return;
    }

    if (!sQuery) {
      (oBinding as unknown as { filter: (f: Filter[]) => void }).filter([]);
      return;
    }

    const aFilters = [
      new Filter("filaGrid/material", FilterOperator.Contains, sQuery),
      new Filter("filaGrid/centro", FilterOperator.Contains, sQuery),
      new Filter("filaGrid/descripcion", FilterOperator.Contains, sQuery),
      new Filter("header/tipoMaterial", FilterOperator.Contains, sQuery)
    ];
    (oBinding as unknown as { filter: (f: Filter, b?: string) => void }).filter(new Filter({ filters: aFilters, and: false }));
  }

  // --- Envío a Workflow ----------------------------------------------------------------------------

  /** MD "Lógica del Detonador de Workflow" — envío secuencial simulado con transición de estado por ítem. */
  public onEnviarWorkflow(_oEvent: Button$PressEvent): void {
    const oModel = this.getModel();
    const aCarrito = (oModel.getProperty("/carrito") as SolicitudCarritoItem[]) || [];

    const bAlgunMaquilado = aCarrito.some((i) => i.header.materialMaquilado);
    const fnEnviar = (): void => {
      void this.enviarSecuencial(aCarrito);
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

  private async enviarSecuencial(aCarrito: SolicitudCarritoItem[]): Promise<void> {
    const oModel = this.getModel();

    for (const oItem of aCarrito) {
      this.actualizarEstadoEnvioItem(oItem.id, "Enviando");
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 400));
      this.actualizarEstadoEnvioItem(oItem.id, "Enviado");
    }

    await new Promise((resolve) => setTimeout(resolve, 300));

    MessageToast.show(
      `Workflow disparado correctamente para ${aCarrito.length} registro(s). Se notificó a los responsables de cada vista vía SBWP / Fiori My Inbox.`,
      { duration: 5000 }
    );

    oModel.setProperty("/carrito", []);
    this.syncHayRegistrosEnCarrito();
    this.resetCapturaActiva();
  }

  private actualizarEstadoEnvioItem(sId: string, sEstado: "Enviando" | "Enviado"): void {
    const oModel = this.getModel();
    const aCarrito = (oModel.getProperty("/carrito") as SolicitudCarritoItem[]) || [];
    const iIndex = aCarrito.findIndex((i) => i.id === sId);
    if (iIndex === -1) {
      return;
    }
    const oEstadoVisual = formatter.calcularEstadoVisualCarrito(aCarrito[iIndex].header.modoSolicitud, sEstado);
    oModel.setProperty(`/carrito/${iIndex}/estadoEnvio`, sEstado);
    oModel.setProperty(`/carrito/${iIndex}/estadoIconSrc`, oEstadoVisual.icon);
    oModel.setProperty(`/carrito/${iIndex}/estadoTexto`, oEstadoVisual.text);
    oModel.setProperty(`/carrito/${iIndex}/estadoState`, oEstadoVisual.state);
  }
}
