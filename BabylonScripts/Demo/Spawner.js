(function (global) {
  "use strict";
  var BABYLON = global.BABYLON;
  var Portals = global.Portals = global.Portals || {};
  if (!BABYLON) throw new Error("Spawner.js requires Babylon.js.");
  function Spawner(scene, transform, prefab, spawnAtStart) {
    this.scene = scene;
    this.transform = transform;
    this.prefab = prefab;
    var self = this;
    if (spawnAtStart) this.spawn();
    scene.onKeyboardObservable.add(function (event) {
      if (event.type === BABYLON.KeyboardEventTypes.KEYDOWN && event.event.code === "Space") self.spawn();
    });
  }
  Spawner.prototype.spawn = function () {
    var instance = this.prefab.clone(this.prefab.name + "_spawned", null);
    if (!instance) throw new Error("Unable to clone prefab " + this.prefab.name);
    instance.position.copyFrom(this.transform.position);
    instance.rotationQuaternion = this.transform.rotationQuaternion ? this.transform.rotationQuaternion.clone() : null;
    instance.rotation.copyFrom(this.transform.rotation);
    instance.setEnabled(true);
    return instance;
  };
  Portals.Spawner = Spawner;
})(window);
