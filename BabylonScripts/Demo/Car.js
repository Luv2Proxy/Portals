(function (global) {
  "use strict";
  var BABYLON = global.BABYLON;
  var Portals = global.Portals;
  if (!BABYLON || !Portals || !Portals.PortalTraveller) throw new Error("Car.js requires Babylon.js and the core portal scripts.");
  function Car(transform, scene, graphicsObject) {
    Portals.PortalTraveller.call(this, transform, graphicsObject || transform);
    this.scene = scene;
    this.maxSpeed = 1;
    this.speed = 0;
    this.targetSpeed = this.maxSpeed;
    this.smoothVelocity = { value: 0 };
    var self = this;
    scene.onKeyboardObservable.add(function (event) {
      if (event.type === BABYLON.KeyboardEventTypes.KEYDOWN && event.event.key.toLowerCase() === "c") self.targetSpeed = self.targetSpeed === 0 ? self.maxSpeed : 0;
    });
    scene.onBeforeRenderObservable.add(function () { self.update(); });
  }
  Car.prototype = Object.create(Portals.PortalTraveller.prototype);
  Car.prototype.constructor = Car;
  Car.prototype.update = function () {
    var dt = this.scene.getEngine().getDeltaTime() / 1000;
    this.transform.position.addInPlace(Portals.forwardOf(this.transform).scale(dt * this.speed));
    this.speed = Portals.smoothDamp(this.speed, this.targetSpeed, this.smoothVelocity, 0.5, dt);
  };
  Portals.Car = Car;
})(window);
