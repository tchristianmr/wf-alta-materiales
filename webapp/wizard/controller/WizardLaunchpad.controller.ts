import Controller from "sap/ui/core/mvc/Controller";
import type { GenericTile$PressEvent } from "sap/m/GenericTile";
import type AppComponent from "../../Component";

/**
 * @namespace com.alen.mm.wfaltamat.wizard.controller
 */
export default class WizardLaunchpad extends Controller {
  public onInit(): void {
    // sin estado propio
  }

  private getRouter() {
    return (this.getOwnerComponent() as AppComponent).getRouter();
  }

  public onVolver(): void {
    this.getRouter().navTo("launchpad");
  }

  /** El tile fija el modo — confirmado con el arquitecto (el radio button del Paso 1 del MD queda fijo). */
  public onCrearMaterial(_oEvent: GenericTile$PressEvent): void {
    this.getRouter().navTo("wizard", { modo: "creacion" });
  }

  public onExtenderMaterial(_oEvent: GenericTile$PressEvent): void {
    this.getRouter().navTo("wizard", { modo: "extension" });
  }
}
