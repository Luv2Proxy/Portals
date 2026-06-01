(function (global) {
  "use strict";
  var BABYLON = global.BABYLON;
  var Portals = global.Portals = global.Portals || {};
  if (!BABYLON) throw new Error("CloudBehaviorTest.js requires Babylon.js.");
  var Vector3 = BABYLON.Vector3;
  var Quaternion = BABYLON.Quaternion;
  function CloudBehaviorTest(transform, scene, cloudCentres, orbitCentre) {
    this.transform = transform;
    this.scene = scene;
    this.cloudCentres = cloudCentres || [];
    this.rotSpeedMin = 10;
    this.rotSpeedMax = 20;
    this.rotSpeed = this.rotSpeedMin + Math.random() * (this.rotSpeedMax - this.rotSpeedMin);
    this.orbitCentre = orbitCentre || (transform.parent && transform.parent.position) || Vector3.Zero();
    var self = this;
    scene.onBeforeRenderObservable.add(function () { self.update(); });
  }
  CloudBehaviorTest.prototype.update = function () {
    var radians = this.rotSpeed * Math.PI / 180 * this.scene.getEngine().getDeltaTime() / 1000;
    this.transform.position.rotateByQuaternionAroundPointToRef(Quaternion.RotationAxis(Vector3.Up(), radians), this.orbitCentre, this.transform.position);
    var maxScale = 0;
    for (var i = 0; i < this.cloudCentres.length; i++) {
      var cloudCentre = this.cloudCentres[i];
      var offset = this.transform.position.subtract(cloudCentre.transform.position);
      var sqrDstHorizontal = offset.x * offset.x + offset.z * offset.z;
      var sqrDstVertical = offset.y * offset.y;
      var tH = 1 - Math.min(1, sqrDstHorizontal / (cloudCentre.falloffDstHorizontal * cloudCentre.falloffDstHorizontal));
      var tV = 1 - Math.min(1, sqrDstVertical / (cloudCentre.falloffVertical * cloudCentre.falloffVertical));
      maxScale = Math.max(maxScale, tV * tH * cloudCentre.maxScale);
    }
    this.transform.scaling.setAll(maxScale);
  };
  Portals.CloudBehaviorTest = CloudBehaviorTest;
})(window);
