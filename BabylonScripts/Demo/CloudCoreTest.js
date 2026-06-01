(function (global) {
  "use strict";
  var BABYLON = global.BABYLON;
  var Portals = global.Portals = global.Portals || {};
  if (!BABYLON) throw new Error("CloudCoreTest.js requires Babylon.js.");
  var Vector3 = BABYLON.Vector3;
  var Quaternion = BABYLON.Quaternion;
  function CloudCoreTest(transform, scene, orbitCentre) {
    this.transform = transform;
    this.scene = scene;
    this.falloffDstHorizontal = 3;
    this.falloffVertical = 1.5;
    this.maxScale = 1;
    this.rotSpeedMin = 10;
    this.rotSpeedMax = 20;
    this.rotSpeed = this.rotSpeedMin + Math.random() * (this.rotSpeedMax - this.rotSpeedMin);
    this.orbitCentre = orbitCentre || (transform.parent && transform.parent.position) || Vector3.Zero();
    var self = this;
    scene.onBeforeRenderObservable.add(function () { self.update(); });
  }
  CloudCoreTest.prototype.update = function () {
    var radians = this.rotSpeed * Math.PI / 180 * this.scene.getEngine().getDeltaTime() / 1000;
    this.transform.position.rotateByQuaternionAroundPointToRef(Quaternion.RotationAxis(Vector3.Up(), radians), this.orbitCentre, this.transform.position);
  };
  Portals.CloudCoreTest = CloudCoreTest;
})(window);
