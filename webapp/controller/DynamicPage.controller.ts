import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";
import type Event from "sap/ui/base/Event";
import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type { Button$PressEvent } from "sap/m/Button";
import type { ComboBox$ChangeEvent } from "sap/m/ComboBox";
import type { InputBase$ChangeEvent } from "sap/m/InputBase";
import type { CheckBox$SelectEvent } from "sap/m/CheckBox";
import Fragment from "sap/ui/core/Fragment";
import type Control from "sap/ui/core/Control";
import type ResourceModel from "sap/ui/model/resource/ResourceModel";
import type ResourceBundle from "sap/base/i18n/ResourceBundle";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import type ListBinding from "sap/ui/model/ListBinding";
import type TableSelectDialog from "sap/m/TableSelectDialog";
import type { TableSelectDialog$SearchEvent, TableSelectDialog$ConfirmEvent } from "sap/m/TableSelectDialog";
import type { Input$SuggestEvent, Input$SuggestionItemSelectedEvent } from "sap/m/Input";
import formatter from "../model/formatter";
import VistasManager from "../model/VistasManager";
import AltExtMaterialService from "../utils/AltExtMaterialService";
import { createDynamicPageModel, createMaterialHeaderDraft } from "../model/models";
import type {
  VistasConfig,
  ModoSolicitud,
  ContextoValidacionAgregar,
  ResponsableVistaConfig,
  TipoMaterialRangoConfig,
  ResultGrid,
  MaterialHeader,
  RMaterialRAP,
  RValidationRAP,
  CodigoTexto
} from "../model/types";

/**
 * @namespace com.alen.mm.wfaltamat.controller
 */
export default class DynamicPage extends Controller {
  public formatter = formatter;

  /** Instanciado en onInit contra el modelo OData v4 "altextmaterial" (manifest.json). */
  private oMaterialService!: AltExtMaterialService;

  private oValueHelpDialog?: TableSelectDialog;
  private fnValueHelpSeleccion?: (sKey: string, sText: string) => void;

  private sTipoMaterialPrevio = "";
  private sCentroPrevio = "";

  /** Campos con ayuda de búsqueda: lista en el modelo valueHelp, título y acción posterior al cambio. */
  private readonly mAyudas: Record<string, { lista: string; titulo: string; alCambiar: () => void | Promise<void> }> = {
    tipoMaterial: { lista: "tiposMaterial", titulo: "lblTipoMaterial", alCambiar: () => this.onTipoMaterialChange() },
    ramo: { lista: "ramos", titulo: "lblRamo", alCambiar: () => this.recalcFormValidated() },
    tipoEntrada: { lista: "tiposEntrada", titulo: "lblTipoEntrada", alCambiar: () => this.recalcFormValidated() },
    centro: { lista: "centros", titulo: "lblCentro", alCambiar: () => this.onCentroChange() },
    orgVentas: { lista: "orgVentas", titulo: "lblOrgVentas", alCambiar: () => this.recalcFormValidated() },
    umBase: { lista: "unidades", titulo: "lblUmBase", alCambiar: () => this.recalcFormValidated() },
    sector: { lista: "sectores", titulo: "lblSector", alCambiar: () => this.recalcFormValidated() },
    grupoTipoPosGral: { lista: "gruposTipoPosGral", titulo: "lblGrupoTipoPosGral", alCambiar: () => this.recalcFormValidated() },
    grupoArticulos: { lista: "gruposArticulos", titulo: "lblGrupoArticulos", alCambiar: () => this.recalcFormValidated() }
  };

  public onInit(): void {
    // La vista nunca debe quedar sin modelo (evita que bindings/expression bindings caigan
    // silenciosamente al defaultValue del control).
    this.getView()!.setModel(createDynamicPageModel());

    // "valueHelp" se crea vacío aquí y se puebla: (a) una sola vez al inicio con las 7 Value
    // Helps estáticas (cargarValueHelpsEstaticas), y (b) en tiempo real por
    // onTipoMaterialChange/onCentroChange (Centro/Org.Ventas, dependientes de acciones bound).
    this.getView()!.setModel(
      new JSONModel({
        centros: [],
        orgVentas: [],
        tiposMaterial: [],
        ramos: [],
        tiposEntrada: [],
        unidades: [],
        sectores: [],
        gruposTipoPosGral: [],
        gruposArticulos: [],
        rangos: []
      }),
      "valueHelp"
    );

    this.oMaterialService = new AltExtMaterialService(this.getOwnerComponent()!.getModel("altextmaterial") as ODataModel);

    void this.cargarValueHelpsEstaticas();
  }

  /** Fase 1 — carga las 7 Value Helps estáticas UNA vez, centralizado vía AltExtMaterialService (nunca binding XML directo). */
  private async cargarValueHelpsEstaticas(): Promise<void> {
    const oValueHelpModel = this.getView()!.getModel("valueHelp") as JSONModel;
    try {
      const [aTiposMaterial, aRamos, aTiposEntrada, aUnidades, aSectores, aGruposTipoPosGral, aGruposArticulos, aRangos] = await Promise.all([
        this.oMaterialService.getTiposMaterial(),
        this.oMaterialService.getRamos(),
        this.oMaterialService.getTiposEntrada(),
        this.oMaterialService.getUnidadesMedida(),
        this.oMaterialService.getSectores(),
        this.oMaterialService.getGruposTipoPosGral(),
        this.oMaterialService.getGruposArticulos(),
        this.oMaterialService.getRangosNumeracion()
      ]);

      oValueHelpModel.setProperty(
        "/rangos",
        aRangos.map((r) => ({ tipoMaterial: r.tipoMaterial, rango: r.rango }))
      );
      oValueHelpModel.setProperty(
        "/tiposMaterial",
        aTiposMaterial.map((t) => ({ key: t.Mtart, text: t.MaterialTypeName }))
      );
      oValueHelpModel.setProperty(
        "/ramos",
        aRamos.map((r) => ({ key: r.idRamo, text: r.descripcion }))
      );
      oValueHelpModel.setProperty(
        "/tiposEntrada",
        aTiposEntrada.map((t) => ({ key: t.idTipoEntrada, text: t.descripcion }))
      );
      oValueHelpModel.setProperty(
        "/unidades",
        aUnidades.map((u) => ({ key: u.UnitOfMeasure, text: u.UnitOfMeasureLongName }))
      );
      oValueHelpModel.setProperty(
        "/sectores",
        aSectores.map((s) => ({ key: s.Division, text: s.DivisionName }))
      );
      oValueHelpModel.setProperty(
        "/gruposTipoPosGral",
        aGruposTipoPosGral.map((g) => ({ key: g.ItemCategoryGroup, text: g.ItemCategoryGroupName }))
      );
      oValueHelpModel.setProperty(
        "/gruposArticulos",
        aGruposArticulos.map((g) => ({ key: g.ProductGroup, text: g.ProductGroupText }))
      );
    } catch (oError) {
      this.showStrip(this.texto("msgErrCatalogos"), "Error");
    }
  }

  private texto(sClave: string, aArgs?: string[]): string {
    const oBundle = (this.getView()!.getModel("i18n") as ResourceModel).getResourceBundle() as ResourceBundle;
    return oBundle.getText(sClave, aArgs) ?? sClave;
  }

  private getModel(): JSONModel {
    return this.getView()!.getModel() as JSONModel;
  }

  private getConfigRows<T>(sModelName: string): T[] {
    return ((this.getView()!.getModel(sModelName) as JSONModel).getProperty("/rows") as T[]) || [];
  }

  private getVistasManager(): VistasManager {
    return new VistasManager((this.getView()!.getModel("valueHelp") as JSONModel).getProperty("/rangos") as TipoMaterialRangoConfig[]);
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

  // --- Captura activa: Datos Generales + Datos Básicos ------------------------------------------

   public async onModoSolicitudChange(_oEvent: Event): Promise<void> {
    this.getModel().setProperty("/ui/materialExiste", undefined); 
    this.clearStrip();
    await this.onMaterialChange(); 
  }

  /** Fase 1 — IM_OrgVtaByMtart. Vacío es negocio normal: este Centro+TipoMaterial no tiene vista Ventas configurada. */
  public async onCentroChange(_oEvent?: Event): Promise<void> {
    const oModel = this.getModel();
    const oValueHelpModel = this.getView()!.getModel("valueHelp") as JSONModel;
    const sCentro = oModel.getProperty("/header/centro") as string;
    const sTipoMaterial = oModel.getProperty("/header/tipoMaterial") as string;

    if (sCentro !== this.sCentroPrevio) {
      oModel.setProperty("/header/orgVentas", "");
      oModel.setProperty("/header/orgVentasDesc", "");
      oValueHelpModel.setProperty("/orgVentas", []);
    }
    this.sCentroPrevio = sCentro;

    if (sCentro && sTipoMaterial) {
      try {
        const aOrgVtas = await this.oMaterialService.getOrgVtaByMtart(sTipoMaterial, sCentro);
        oValueHelpModel.setProperty(
          "/orgVentas",
          aOrgVtas.map((o) => ({ key: o.orgvta, text: o.name }))
        );
        this.clearStrip();
      } catch (oError) {
        this.showStrip(this.texto("msgErrOrgVentas"), "Error");
      }
    }

    this.recalcFormValidated();
  }

  // --- Ayuda de búsqueda reutilizable (Input + sugerencias + diálogo) -----------------------------

  /** Abre el diálogo genérico de búsqueda; `fnSeleccion` recibe el código y la descripción elegidos. */
  private async abrirAyudaBusqueda(sTitulo: string, aItems: CodigoTexto[], fnSeleccion: (sKey: string, sText: string) => void): Promise<void> {
    if (!this.oValueHelpDialog) {
      this.oValueHelpDialog = (await Fragment.load({
        id: this.getView()!.getId(),
        name: "com.alen.mm.wfaltamat.view.fragments.ValueHelpDialog",
        controller: this
      })) as TableSelectDialog;
      this.getView()!.addDependent(this.oValueHelpDialog);
    }
    this.oValueHelpDialog.setModel(new JSONModel({ titulo: sTitulo, items: aItems }), "vhDialog");
    this.fnValueHelpSeleccion = fnSeleccion;
    this.oValueHelpDialog.open("");
  }

  private filtroCodigoTexto(sValor: string): Filter[] {
    return sValor
      ? [new Filter({ filters: [new Filter("key", FilterOperator.Contains, sValor), new Filter("text", FilterOperator.Contains, sValor)], and: false })]
      : [];
  }

  public onValueHelpSearch(oEvent: TableSelectDialog$SearchEvent): void {
    const oBinding = oEvent.getSource().getBinding("items") as ListBinding;
    oBinding.filter(this.filtroCodigoTexto(oEvent.getParameter("value") ?? ""));
  }

  public onValueHelpConfirm(oEvent: TableSelectDialog$ConfirmEvent): void {
    const oContext = oEvent.getParameter("selectedItem")?.getBindingContext("vhDialog");
    if (oContext && this.fnValueHelpSeleccion) {
      this.fnValueHelpSeleccion(oContext.getProperty("key") as string, oContext.getProperty("text") as string);
    }
  }

  /** Filtra la tabla de sugerencias del Input por código o descripción mientras se escribe. */
  public onSuggestFiltrar(oEvent: Input$SuggestEvent): void {
    const oBinding = oEvent.getSource().getBinding("suggestionRows") as ListBinding;
    oBinding.filter(this.filtroCodigoTexto(oEvent.getParameter("suggestValue") ?? ""));
  }

  // --- Ayuda de búsqueda genérica: cada Input lleva customData "campo" (nombre del campo del header) ---

  private getListaAyuda(sCampo: string): CodigoTexto[] {
    return (this.getView()!.getModel("valueHelp") as JSONModel).getProperty(`/${this.mAyudas[sCampo].lista}`) as CodigoTexto[];
  }

  private aplicarSeleccion(sCampo: string, sKey: string, sText: string): void {
    const oModel = this.getModel();
    oModel.setProperty(`/header/${sCampo}`, sKey);
    oModel.setProperty(`/header/${sCampo}Desc`, sText);
    void this.mAyudas[sCampo].alCambiar();
  }

  /** Rellena las descripciones de todos los campos según su código actual (útil cuando el header se llena por código). */
  private sincronizarDescripciones(): void {
    const oModel = this.getModel();
    for (const sCampo of Object.keys(this.mAyudas)) {
      const sKey = oModel.getProperty(`/header/${sCampo}`) as string;
      oModel.setProperty(`/header/${sCampo}Desc`, this.getListaAyuda(sCampo).find((o) => o.key === sKey)?.text ?? "");
    }
  }

  public onAyudaBusqueda(oEvent: Event): void {
    const sCampo = (oEvent.getSource() as Control).data("campo") as string;
    void this.abrirAyudaBusqueda(this.texto("vhSeleccionar", [this.texto(this.mAyudas[sCampo].titulo)]), this.getListaAyuda(sCampo), (sKey, sText) =>
      this.aplicarSeleccion(sCampo, sKey, sText)
    );
  }

  public onAyudaSugerenciaSeleccionada(oEvent: Input$SuggestionItemSelectedEvent): void {
    const sCampo = oEvent.getSource().data("campo") as string;
    const oContext = oEvent.getParameter("selectedRow")?.getBindingContext("valueHelp");
    if (oContext) {
      this.aplicarSeleccion(sCampo, oContext.getProperty("key") as string, oContext.getProperty("text") as string);
    }
  }

  /** Valor escrito a mano: se acepta código o descripción (sin importar mayúsculas) y se normaliza al código. */
  public onAyudaCambio(oEvent: Event): void {
    const sCampo = (oEvent.getSource() as Control).data("campo") as string;
    const oModel = this.getModel();
    const sEscrito = ((oModel.getProperty(`/header/${sCampo}`) as string) ?? "").trim();
    const oOpcion = this.getListaAyuda(sCampo).find((o) => o.key.toUpperCase() === sEscrito.toUpperCase() || o.text.toUpperCase() === sEscrito.toUpperCase());

    if (oOpcion) {
      this.aplicarSeleccion(sCampo, oOpcion.key, oOpcion.text);
      return;
    }
    oModel.setProperty(`/header/${sCampo}`, "");
    oModel.setProperty(`/header/${sCampo}Desc`, "");
    void this.mAyudas[sCampo].alCambiar();
    if (sEscrito) {
      this.showStrip(this.texto("msgValorNoExiste", [sEscrito, this.texto(this.mAyudas[sCampo].titulo)]), "Error");
    }
  }

  /** Limpia Centro y Org. Ventas (valor, descripción y listas) cuando dejan de ser válidos. */
  private limpiarCentroYOrg(): void {
    const oModel = this.getModel();
    const oValueHelpModel = this.getView()!.getModel("valueHelp") as JSONModel;
    oModel.setProperty("/header/centro", "");
    oModel.setProperty("/header/centroDesc", "");
    oModel.setProperty("/header/orgVentas", "");
    oModel.setProperty("/header/orgVentasDesc", "");
    oValueHelpModel.setProperty("/centros", []);
    oValueHelpModel.setProperty("/orgVentas", []);
    this.sCentroPrevio = "";
  }

  /** Fase 1 — IM_PlantByMtart (✅ funcional): carga los centros reales donde aplica el Tipo de Material. */
  public async onTipoMaterialChange(_oEvent?: Event): Promise<void> {
    const oModel = this.getModel();
    const oValueHelpModel = this.getView()!.getModel("valueHelp") as JSONModel;
    const sTipoMaterial = oModel.getProperty("/header/tipoMaterial") as string;
    const sRango = this.getVistasManager().calcularRangoNumeracion(sTipoMaterial);
    oModel.setProperty("/ui/rangoNumeracion", sRango);
    if (sRango === "Interno" && oModel.getProperty("/header/modoSolicitud") !== "extension") {
      oModel.setProperty("/header/material", "");
    }

    if (sTipoMaterial !== this.sTipoMaterialPrevio) {
      this.limpiarCentroYOrg();
    }
    this.sTipoMaterialPrevio = sTipoMaterial;

    if (sTipoMaterial) {
      try {
        const aPlants = await this.oMaterialService.getPlantsByMtart(sTipoMaterial);
        oValueHelpModel.setProperty(
          "/centros",
          aPlants.map((p) => ({ key: p.plant, text: p.plantName }))
        );
        if (aPlants.length === 0) {
          this.showStrip(this.texto("msgSinCentros", [sTipoMaterial]), "Information");
        } else {
          this.clearStrip();
        }
      } catch (oError) {
        this.showStrip(this.texto("msgErrCentros"), "Error");
      }
    }

    if (sRango === "SinRango") {
      this.showStrip(this.texto("msgSinRango", [sTipoMaterial]), "Error");
    }

    this.recalcFormValidated();
  }

  public onModoProcesoChange(oEvent: Event): void {
    const iIndex = (oEvent as unknown as { getParameter: (n: string) => number }).getParameter("selectedIndex");
    this.getModel().setProperty("/header/modoProceso", iIndex === 0 ? "M" : "D");
  }

  public async onMaterialChange(_oEvent?: InputBase$ChangeEvent): Promise<void> {
    const oModel = this.getModel();
    const oHeader = oModel.getProperty("/header") as MaterialHeader;
    oModel.setProperty("/ui/materialExiste", undefined);

    if (oHeader.modoSolicitud === "extension" && oHeader.material) {
      oModel.setProperty("/ui/formValidated", false);
      try {
        const oEntry = AltExtMaterialService.mapHeaderToEntryParameters(oHeader, "", "");
        const oResult: RMaterialRAP = await this.oMaterialService.extenderMaterial([oEntry]);

        // Si el usuario cambió el material mientras esperaba la respuesta, se descarta.
        if ((oModel.getProperty("/header/material") as string) !== oHeader.material) {
          return;
        }

        if (oResult.id === "E") {
          oModel.setProperty("/ui/materialExiste", false);
        } else {
          oModel.setProperty("/ui/materialExiste", true);
          oModel.setProperty("/header/tipoMaterial", oResult.tipoMaterial);
          oModel.setProperty("/header/ramo", oResult.ramo);
          oModel.setProperty("/header/descripcionEs", oResult.descripcion);
          oModel.setProperty("/header/descripcionEn", oResult.descripcion);
          oModel.setProperty("/header/umBase", oResult.umBase);
          oModel.setProperty("/header/sector", oResult.sector);
          oModel.setProperty("/header/grupoTipoPosGral", oResult.grupoTipoPosGral);
          oModel.setProperty("/header/grupoArticulos", oResult.grupoArticulos);
          oModel.setProperty("/header/jerarquiaProductos", oResult.jerarquiaProductos);

          this.sincronizarDescripciones();
          await this.onTipoMaterialChange(); // carga rango y centros del tipo de material real
        }
      } catch (oError) {
        this.showStrip(this.texto("msgErrConfirmar"), "Error");
        return;
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

  /** Consolida Datos Generales + Datos Básicos en un solo gate (sin pasos). */
  private recalcFormValidated(): void {
    const oModel = this.getModel();
    const oHeader = oModel.getProperty("/header") as MaterialHeader;
    const sRango = oModel.getProperty("/ui/rangoNumeracion") as string | undefined;

    if (oHeader.modoSolicitud === "extension") {
      if (!oHeader.material) {
        oModel.setProperty("/ui/formValidated", false);
        return;
      }

      const bExiste = oModel.getProperty("/ui/materialExiste") as boolean | undefined;
      if (bExiste === undefined) {
        oModel.setProperty("/ui/formValidated", false);
        return;
      }
      if (bExiste === false) {
        this.showStrip(this.texto("msgMaterialNoExiste"), "Error");
        oModel.setProperty("/ui/formValidated", false);
        return;
      }
    }

    if (sRango === "SinRango" && oHeader.modoSolicitud !== "extension") {
      this.showStrip(this.texto("msgSinRango", [oHeader.tipoMaterial]), "Error");
      oModel.setProperty("/ui/formValidated", false);
      return;
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

    this.sTipoMaterialPrevio = "";
    this.limpiarCentroYOrg();

    oModel.setProperty("/ui/formValidated", false);
    oModel.setProperty("/ui/rangoNumeracion", undefined);
    oModel.setProperty("/ui/materialExiste", undefined); 
    this.clearStrip();
  }

  /**
   * Bloquea Datos Generales/Básicos y trae las vistas por crear (Sección 4).
   *
   * Llama a IM_CreateMaterial (Creación) o IM_ExtendMaterial (Extensión) solo para obtener
   * _viewsxcreate, _salesViews y _disChannel reales; no persisten nada (la creación del material
   * ocurre en IM_SendWF con proceso "C"). El responsable por vista (Custom 1) se sigue resolviendo
   * contra el mock `responsableVista` hasta conectar GAP_P2P_07.
  */
  public async onConfirmarDatos(_oEvent: Button$PressEvent): Promise<void> {
    const oModel = this.getModel();
    const oHeader = oModel.getProperty("/header") as MaterialHeader;
    const oEntry = AltExtMaterialService.mapHeaderToEntryParameters(oHeader, "", (oModel.getProperty("/ui/rangoNumeracion") as string) ?? "");

    try {
      const oResult: RMaterialRAP =
        oHeader.modoSolicitud === "extension"
          ? await this.oMaterialService.extenderMaterial([oEntry])
          : await this.oMaterialService.crearMaterial([oEntry]);

      // El backend rechazó la solicitud (ej. material ya existe): no se avanza, el usuario corrige.
      if (oResult.id === "E") {
        this.showStrip(oResult.mensaje || this.texto("msgErrConfirmarBackend"), "Error");
        return;
      }

      const aResponsables = this.getConfigRows<ResponsableVistaConfig>("responsableVista").filter(
        (r) => r.centro === oHeader.centro && r.tipoMaterial === oHeader.tipoMaterial && r.materialExportacion === oHeader.materialExportacion
      );
      const fnResolverResponsable = (sVista: string): { descripcionVista: string; usuarioResponsable: string; usuarioResponsable2?: string } | undefined => {
        const oResp = aResponsables.find((r) => r.vista === sVista);
        return oResp
          ? { descripcionVista: oResp.descripcionVista, usuarioResponsable: oResp.usuarioResponsable1, usuarioResponsable2: oResp.usuarioResponsable2 }
          : undefined;
      };

      oModel.setProperty("/vistasCrear", AltExtMaterialService.mapViewsXCreateToVistasConfig(oResult._viewsxcreate, oResult._viewsWF, fnResolverResponsable));
      oModel.setProperty("/vistasVenta", oResult._salesViews.map((v) => ({ material: v.material, orgVentas: v.orgventas, canalDistribucion: v.canaldistribucion }))
      );
      oModel.setProperty(
        "/canalesConf",
        oResult._disChannel.map((c) => ({ orgVentas: c.orgVtas, canalDistribucion: c.canalDis }))
      );

      this.clearStrip();
      oModel.setProperty("/header/estadoProceso", "Confirmado");
    } catch (oError) {
      this.showStrip(this.texto("msgErrConfirmar"), "Error");
    }
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

  /**
   * Botón "Agregar al Listado" — valida, inserta en el grid y resetea la captura (Auto-Reset).
   *
   * Primero corren las validaciones del front (VistasManager.validarAgregar: vista seleccionada,
   * Org. Ventas y canal para la vista V, responsable resuelto, vistas no procesadas) y la regla de
   * no duplicar Material + Centro. Después, una llamada a IM_ValMaterial por cada vista
   * seleccionada, con `views` = esa vista: el backend valida la Regla 6 (centro válido para la
   * Org. Ventas) y la Regla 7 (responsable configurado en Custom 1).
  */
  public async onAgregarAlListado(_oEvent: Button$PressEvent): Promise<void> {
    const oModel = this.getModel();
    const oHeader = oModel.getProperty("/header") as MaterialHeader;
    const aVistas = oModel.getProperty("/vistasCrear") as VistasConfig[];

    const oContexto: ContextoValidacionAgregar = {
      tipoMaterial: oHeader.tipoMaterial,
      orgVentas: oHeader.orgVentas,
      canalesConfigurados: (oModel.getProperty("/canalesConf") as { orgVentas: string; canalDistribucion: string }[]) || []
    };

    const oResultado = this.getVistasManager().validarAgregar(oContexto, aVistas);
    if (!oResultado.valido) {
      this.showStrip(oResultado.claveMensaje ? this.texto(oResultado.claveMensaje, oResultado.argsMensaje) : this.texto("msgErrAgregar"), "Error");
      return;
    }

    const aGridActual = (oModel.getProperty("/grid") as ResultGrid[]) || [];
    if (oHeader.material && aGridActual.some((r) => r.material === oHeader.material && r.centro === oHeader.centro)) {
      this.showStrip(this.texto("msgMaterialDuplicado", [oHeader.material, oHeader.centro]), "Error");
      return;
    }

    const aSeleccionadas = aVistas.filter((v) => v.crear);
    const sRango = (oModel.getProperty("/ui/rangoNumeracion") as string) ?? "";
    try {
      for (const oVista of aSeleccionadas) {
        const oEntry = AltExtMaterialService.mapHeaderToEntryParameters(oHeader, oVista.vista, sRango);
        const aValidacion: RValidationRAP[] = await this.oMaterialService.validarVista(oEntry);
        const oErrorVista = aValidacion.find((v) => v.id === "E");
        if (oErrorVista) {
          this.showStrip(this.texto("msgVistaError", [oVista.vista, oErrorVista.mensaje]), "Error");
          return;
        }
      }
    } catch (oError) {
      this.showStrip(this.texto("msgErrValidar"), "Error");
      return;
    }

    // `views` lleva las vistas seleccionadas concatenadas y en orden de secuencia (ej. "EV").
    const oEntrada = AltExtMaterialService.mapHeaderToEntryParameters(oHeader, aSeleccionadas.map((v) => v.vista).join(""), sRango);
    const oFila: ResultGrid = this.getVistasManager().construirFilaGrid(oHeader, aVistas, oEntrada);
    const aGrid = (oModel.getProperty("/grid") as ResultGrid[]) || [];
    aGrid.push(oFila);
    oModel.setProperty("/grid", aGrid);
    this.syncHayRegistrosEnGrid();

    this.clearStrip();
    MessageToast.show(this.texto("msgAgregado"));

    this.resetCapturaActiva();
  }

  /** Limpia la captura activa y la regresa a modo editable (Auto-Reset tras Agregar). */
  private resetCapturaActiva(): void {
    const oModel = this.getModel();
    const sModo = oModel.getProperty("/header/modoSolicitud") as ModoSolicitud;
    oModel.setProperty("/header", createMaterialHeaderDraft(sModo));

    this.sTipoMaterialPrevio = "";
    this.limpiarCentroYOrg();

    oModel.setProperty("/ui/formValidated", false);
    oModel.setProperty("/ui/rangoNumeracion", undefined);
    oModel.setProperty("/ui/materialExiste", undefined);
    oModel.setProperty("/vistasCrear", []);
    oModel.setProperty("/vistasVenta", []);
    oModel.setProperty("/canalesConf", []);
    this.clearStrip();
  }

  public onEliminarGridRow(oEvent: Button$PressEvent): void {
    const oModel = this.getModel();
    const oContext = oEvent.getSource().getBindingContext();
    const sPath = oContext?.getPath();
    if (!sPath) {
      return;
    }
    const iIndex = Number(sPath.split("/").pop());
    const aGrid = (oModel.getProperty("/grid") as ResultGrid[]).slice();
    if (!this.esEnviable(aGrid[iIndex])) {
      return;
    }
    aGrid.splice(iIndex, 1);
    oModel.setProperty("/grid", aGrid);
    this.syncHayRegistrosEnGrid();
  }

  private syncHayRegistrosEnGrid(): void {
    const oModel = this.getModel();
    const aGrid = (oModel.getProperty("/grid") as ResultGrid[]) || [];
    oModel.setProperty("/ui/hayRegistrosEnGrid", aGrid.some((r) => this.esEnviable(r)));
  }

  // --- Footer global: Enviar a Workflow / Cancelar -----------------------------------------------

  /** Cambiar a `true` cuando Janeth confirme que SENDWF ya no ejecuta BAPI_MATERIAL_SAVEDATA con proceso "E". */
  private static readonly EXTENSION_ENVIO_HABILITADO = true;

  private esEnviable(oFila: ResultGrid): boolean {
    return oFila.estado === "pendiente" || oFila.estado === "E";
  }

  public async onEnviarWorkflow(_oEvent: Button$PressEvent): Promise<void> {
    const aGrid = (this.getModel().getProperty("/grid") as ResultGrid[]) || [];
    const aPorEnviar = aGrid.filter((r) => this.esEnviable(r));
    if (aPorEnviar.length === 0) {
      return;
    }
    if (aPorEnviar.some((r) => r.materialMaquilado)) {
      MessageBox.warning(this.texto("msgMaquiladoAviso"), { onClose: () => void this.enviarPendientes() });
    } else {
      await this.enviarPendientes();
    }
  }

  /** IM_SendWF: Creación ("C") y Extensión ("E") van en llamadas separadas; una línea fallida no detiene las demás. */
  private async enviarPendientes(): Promise<void> {
    const oModel = this.getModel();
    const aGrid = (oModel.getProperty("/grid") as ResultGrid[]) || [];
    const aProcesadas: ResultGrid[] = [];

    this.getView()!.setBusy(true);
    try {
      for (const sProceso of ["C", "E"] as const) {
        const aLote = aGrid.filter((r) => this.esEnviable(r) && (r.modoSolicitud === "creacion") === (sProceso === "C"));
        if (aLote.length === 0) {
          continue;
        }

        if (sProceso === "E" && !DynamicPage.EXTENSION_ENVIO_HABILITADO) {
          for (const oFila of aLote) {
            oFila.estado = "E";
            oFila.mensaje = this.texto("msgExtensionBloqueada");
          }
          aProcesadas.push(...aLote);
          continue;
        }

        try {
          const aResultados = await this.oMaterialService.enviarWorkflow(
            aLote.map((r) => r.entrada),
            sProceso
          );
          for (const oFila of aLote) {
            this.aplicarResultadoEnvio(
              oFila,
              aResultados.filter((r) => r.idlinea === oFila.entrada.idlinea)
            );
          }
        } catch (oError) {
          for (const oFila of aLote) {
            oFila.estado = "E";
            oFila.mensaje = this.texto("msgErrEnviar");
          }
        }
        aProcesadas.push(...aLote);
      }
    } finally {
      this.getView()!.setBusy(false);
    }

    oModel.setProperty("/grid", aGrid.slice());
    this.syncHayRegistrosEnGrid();

    const iEnviadas = aProcesadas.filter((r) => r.estado === "S").length;
    const iSinWf = aProcesadas.filter((r) => r.estado === "W").length;
    const iErrores = aProcesadas.filter((r) => r.estado === "E").length;
    this.showStrip(this.texto("msgEnvioResumen", [String(iEnviadas), String(iSinWf), String(iErrores)]), iSinWf + iErrores === 0 ? "Success" : "Warning");
  }

  /** Traduce las filas de respuesta de una línea (S/W/E) al estado de la fila del grid; gana el peor estado. */
  private aplicarResultadoEnvio(oFila: ResultGrid, aResultados: RValidationRAP[]): void {
    if (aResultados.length === 0) {
      oFila.estado = "E";
      oFila.mensaje = this.texto("msgSinRespuestaLinea");
      return;
    }

    const bError = aResultados.some((r) => r.id !== "S" && r.id !== "W");
    const bSinWf = aResultados.some((r) => r.id === "W");

    if (bError) { 
      oFila.estado = "E";
    } else if (bSinWf) {
      oFila.estado = "W";
    } else {
      oFila.estado = "S";
    }

    const sMaterial = aResultados.find((r) => r.material)?.material ?? "";
    if (oFila.estado !== "E" && sMaterial) {
      oFila.material = sMaterial;
    }

    const sMensaje = aResultados
      .map((r) => r.mensaje)
      .filter((m) => !!m)
      .join(" ");
    oFila.mensaje = oFila.estado === "W" ? `${sMensaje} ${this.texto("msgMaterialCreadoSinWf", [sMaterial])}`.trim() : sMensaje;
  }

  /** Botón "Cancelar" — descarta la sesión completa (propuesta-3-dynamic-page.md, Regla B). */
  public onCancelar(_oEvent: Button$PressEvent): void {
    const oBundle = (this.getView()!.getModel("i18n") as unknown as { getResourceBundle: () => { getText: (k: string) => string } }).getResourceBundle();

    MessageBox.confirm(oBundle.getText("dpMsgCancelarTexto"), {
      title: oBundle.getText("dpMsgCancelarTitulo"),
      actions: [MessageBox.Action.YES, MessageBox.Action.NO],
      onClose: (sAction: string) => {
        if (sAction !== String(MessageBox.Action.YES)) {
          return;
        }
        const oModel = this.getModel();
        oModel.setProperty("/grid", []);
        this.syncHayRegistrosEnGrid();
        this.resetCapturaActiva();
      }
    });
  }
}