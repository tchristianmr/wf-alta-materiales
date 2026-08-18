import Controller from "sap/ui/core/mvc/Controller";
import type { Button$PressEvent } from "sap/m/Button";
import type { GenericTile$PressEvent } from "sap/m/GenericTile";
import type AppComponent from "../Component";

/**
 * @namespace com.alen.mm.wfaltamat.controller
 */
export default class Launchpad extends Controller {
  public onInit(): void {
    // sin estado propio: solo navega a los sub-launchpads de cada prototipo
  }

  private getRouter() {
    return (this.getOwnerComponent() as AppComponent).getRouter();
  }

  public onAbrirPrototipo1(_oEvent: GenericTile$PressEvent | Button$PressEvent): void {
    this.getRouter().navTo("wizardLaunchpad");
  }

  public onAbrirPrototipo2(_oEvent: GenericTile$PressEvent | Button$PressEvent): void {
    this.getRouter().navTo("fclLaunchpad");
  }
}
