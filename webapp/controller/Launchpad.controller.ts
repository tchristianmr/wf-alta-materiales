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

  /** A diferencia de Prototipo 1/2, el 3 no tiene sub-launchpad propio: el SegmentedButton
   * de Creación/Extensión ya vive dentro de la Dynamic Page (propuesta-3-dynamic-page.md). */
  public onAbrirPrototipo3(_oEvent: GenericTile$PressEvent | Button$PressEvent): void {
    this.getRouter().navTo("dynamicPage");
  }
}
