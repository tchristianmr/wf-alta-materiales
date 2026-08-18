import Controller from "sap/ui/core/mvc/Controller";
import type { GenericTile$PressEvent } from "sap/m/GenericTile";
import type AppComponent from "../../Component";

/**
 * @namespace com.alen.mm.wfaltamat.fcl.controller
 */
export default class FCLLaunchpad extends Controller {
  public onInit(): void {
    // sin estado propio
  }

  private getRouter() {
    return (this.getOwnerComponent() as AppComponent).getRouter();
  }

  public onVolver(): void {
    this.getRouter().navTo("launchpad");
  }

  public onGestionarMateriales(_oEvent: GenericTile$PressEvent): void {
    this.getRouter().navTo("fcl");
  }
}
