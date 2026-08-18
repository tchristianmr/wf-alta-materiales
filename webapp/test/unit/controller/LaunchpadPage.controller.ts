/*global QUnit*/
import Controller from "com/alen/mm/wfaltamat/controller/Launchpad.controller";

QUnit.module("Launchpad Controller");

QUnit.test("I should test the Launchpad controller", function (assert: Assert) {
	const oAppController = new Controller("Launchpad");
	oAppController.onInit();
	assert.ok(oAppController);
});
