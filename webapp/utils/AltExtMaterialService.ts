import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type ODataContextBinding from "sap/ui/model/odata/v4/ODataContextBinding";
import type { MaterialHeader, VistasConfig } from "../model/types";
import type {
  EntryParametersRAP,
  RMaterialRAP,
  RValidationRAP,
  RPlantMtartRAP,
  ROrgVtaMtartRAP,
  ProductTypeVH,
  IndustrySectorVH,
  TipEntVH,
  UnitOfMeasureVH,
  DivisionTextVH,
  ItemCategoryGroupVH,
  ProductGroupVH,
  MaterialRangoVH
} from "../model/types";

/**
 * ÚNICO punto de acceso a OData en WFALTAMAT — mismo principio que Utils.ts de handheldpp:
 * ningún controller ni vista llama al ODataModel directamente (bindContext, bindList, etc.).
 * Todo pasa por un método de esta clase.
 *
 * Contrato verificado contra el `$metadata` real de ZPP_UI_ALTEXTMATERIAL_O4.
 *
 * Reglas duras:
 * - `create`/`update`/`delete`/`read` de `ZPPD_R_ALTEXTMATERIAL` están vacíos en el backend —
 *   NUNCA usar CRUD estándar sobre esa entidad. Solo las 6 acciones bound.
 * - Los parámetros de las acciones viajan SUELTOS (`proceso` + `_material`, o `mtart` + `plant`).
 * - `proceso: "P"` es un flag de depuración interno de Janeth — nunca se expone aquí.
 * - `IM_ValMaterial` valida UNA vista (`views`, una sola letra) a la vez; en el envío `views` lleva todas concatenadas.
 * - `IM_SendWF` devuelve una fila por línea (`idlinea`, `material`, `id` S/W/E, `mensaje`); `proceso = "E"` solo lanza el WF.
 */
export default class AltExtMaterialService {
  private static readonly DUMMY_KEY = "0";
  private static readonly NAMESPACE = "com.sap.gateway.srvd.zpp_ui_altextmaterial_srv.v0001";

  constructor(private readonly oModel: ODataModel) { }

  // --- Value Helps estáticas (✅ EntitySets reales, lectura simple) ------------------------------
  // Antes se bindeaban directo en el XML (`items="{altextmaterial>/...}"`) — se centralizan aquí
  // para que TODO el acceso a OData pase por esta clase, sin excepción.

  public async getTiposMaterial(): Promise<ProductTypeVH[]> {
    return this.readEntitySet<ProductTypeVH>("/ZPPD_I_PRODUCTTYPE_VH");
  }

  public async getRamos(): Promise<IndustrySectorVH[]> {
    return this.readEntitySet<IndustrySectorVH>("/ZPPD_I_INDUSTRYSECTOR_VH");
  }

  public async getTiposEntrada(): Promise<TipEntVH[]> {
    return this.readEntitySet<TipEntVH>("/ZPPD_I_TIPENT_VH");
  }

  public async getUnidadesMedida(): Promise<UnitOfMeasureVH[]> {
    return this.readEntitySet<UnitOfMeasureVH>("/ZPPD_I_UnitOfMeasureText_VH");
  }

  public async getSectores(): Promise<DivisionTextVH[]> {
    return this.readEntitySet<DivisionTextVH>("/ZPPD_I_DivisionText_VH");
  }

  public async getGruposTipoPosGral(): Promise<ItemCategoryGroupVH[]> {
    return this.readEntitySet<ItemCategoryGroupVH>("/ZPPD_I_ItemCategoryGroupTextVH");
  }

  public async getGruposArticulos(): Promise<ProductGroupVH[]> {
    return this.readEntitySet<ProductGroupVH>("/ZPPD_I_PRODUCTGROUPTEXT_2_VH");
  }

  public async getRangosNumeracion(): Promise<MaterialRangoVH[]> {
    return this.readEntitySet<MaterialRangoVH>("/ZPPD_I_MATERIALRANGO");
  }

  // --- Value Helps dependientes (✅ acciones bound funcionales) ----------------------------------

  public async getPlantsByMtart(sMtart: string): Promise<RPlantMtartRAP[]> {
    return this.callBoundActionCollection<RPlantMtartRAP>("IM_PlantByMtart", { mtart: sMtart, plant: "" });
  }

  public async getOrgVtaByMtart(sMtart: string, sPlant: string): Promise<ROrgVtaMtartRAP[]> {
    return this.callBoundActionCollection<ROrgVtaMtartRAP>("IM_OrgVtaByMtart", { mtart: sMtart, plant: sPlant });
  }

  // --- Validación -----------------------------------------------------------------------------

  public async validarVista(oEntry: EntryParametersRAP): Promise<RValidationRAP[]> {
    return this.callBoundActionCollection<RValidationRAP>("IM_ValMaterial", { proceso: "C", _material: [oEntry] });
  }

  // --- Creación / Extensión --------------------------------------------------------------------

  public async crearMaterial(aMateriales: EntryParametersRAP[]): Promise<RMaterialRAP> {
    return this.callBoundActionSingle<RMaterialRAP>("IM_CreateMaterial", { proceso: "C", _material: aMateriales });
  }

  public async extenderMaterial(aMateriales: EntryParametersRAP[]): Promise<RMaterialRAP> {
    return this.callBoundActionSingle<RMaterialRAP>("IM_ExtendMaterial", { proceso: "E", _material: aMateriales });
  }

  // --- Envío de Workflow ------------------------------------------------------------------------

  public async enviarWorkflow(aMateriales: EntryParametersRAP[], sProceso: "C" | "E"): Promise<RValidationRAP[]> {
    return this.callBoundActionCollection<RValidationRAP>("IM_SendWF", { proceso: sProceso, _material: aMateriales });
  }

  // --- Mapeo dominio (UI) -> wire (RAP) ----------------------------------------------------------
  public static mapHeaderToEntryParameters(oHeader: MaterialHeader, sViews: string, sRangoNumeracion: string): EntryParametersRAP {
    return {
      idlinea: String(oHeader.solicitudId ?? "").slice(0, 36),
      material: oHeader.material,
      tipoMaterial: oHeader.tipoMaterial,
      ramo: oHeader.ramo,
      tipoEntrada: oHeader.tipoEntrada,
      centro: oHeader.centro,
      orgVtas: oHeader.orgVentas,
      flagMaquila: oHeader.materialMaquilado ? "X" : "",
      flagExpMat: oHeader.materialExportacion ? "X" : "",
      flagModPro: oHeader.modoProceso === "M" ? "F" : "D",
      descripcion: oHeader.descripcionEs,
      umBase: oHeader.umBase,
      sector: oHeader.sector,
      grupoTipoPosGral: oHeader.grupoTipoPosGral,
      grupoArticulos: oHeader.grupoArticulos,
      jerarquiaProductos: oHeader.jerarquiaProductos,
      matExt: sRangoNumeracion,
      views: sViews
    };
  }

   public static mapViewsXCreateToVistasConfig(
    aViewsXCreate: RMaterialRAP["_viewsxcreate"],
    aViewsWF: RMaterialRAP["_viewsWF"]
  ): VistasConfig[] {
    return [...aViewsXCreate].sort((a, b) => a.idsec - b.idsec).map((v) => {
      const oWf = aViewsWF.find((w) => w.idView === v.vista);
      return {
        secuencia: v.idsec,
        vista: v.vista,
        descripcionVista: v.descripcion ?? "",
        usuarioResponsable: (v.wiUsuario ?? "").split("/").filter((u) => !!u).join(", "),
        crear: false,
        creada: v.creada,
        enWF: v.enWF,
        wiTitulo: oWf?.descripcion,
        wiFechaCreacion: oWf?.fechacreacion,
        wiUsuario: oWf?.usuarios || undefined
      };
    });
  }

  // --- Motor genérico de lectura (entity sets simples) -------------------------------------------

  /** GET simple a un EntitySet, sin key ni acción — usado por las 7 Value Helps estáticas. */
  private async readEntitySet<T>(sEntitySetPath: string): Promise<T[]> {
    const oBinding = this.oModel.bindList(sEntitySetPath);
    const aContexts = (await oBinding.requestContexts()) ?? [];
    return aContexts.map((oContext) => oContext.getObject() as T);
  }

  // --- Motor genérico de invocación de acciones bound ---------------------------------------------
  private bindAction(sActionName: string, mParameters: Record<string, unknown>): ODataContextBinding {
    const sEntityPath = `/ZPPD_R_ALTEXTMATERIAL(material='${AltExtMaterialService.DUMMY_KEY}')`;
    const oParentContext = this.oModel.bindContext(sEntityPath).getBoundContext();
    const oBinding = this.oModel.bindContext(
      `${AltExtMaterialService.NAMESPACE}.${sActionName}(...)`,
      oParentContext,
      { $$groupId: "$direct" }
    );
    for (const [sName, vValue] of Object.entries(mParameters)) {
      oBinding.setParameter(sName, vValue);
    }
    return oBinding;
  }

  /** Para acciones cuyo `ReturnType` es un tipo simple (no `Collection(...)`). */
  private async callBoundActionSingle<TResult>(sActionName: string, mParameters: Record<string, unknown>): Promise<TResult> {
    const oBinding = this.bindAction(sActionName, mParameters);
    await oBinding.execute();
    return oBinding.getBoundContext().getObject() as TResult;
  }

  /** Para acciones cuyo `ReturnType` es `Collection(...)`. */
  private async callBoundActionCollection<TResult>(sActionName: string, mParameters: Record<string, unknown>): Promise<TResult[]> {
    const oBinding = this.bindAction(sActionName, mParameters);
    await oBinding.execute();
    const vResult = oBinding.getBoundContext().getObject() as TResult[] | { value: TResult[] };
    return Array.isArray(vResult) ? vResult : vResult.value ?? [];
  }
}