(function (global) {
  "use strict";

  var BABYLON = global.BABYLON;
  var Portals = global.Portals;
  if (!BABYLON || !Portals || !Portals.PortalTraveller) throw new Error("FPSController.js requires Babylon.js and the core portal scripts.");
  var Vector3 = BABYLON.Vector3;
  var Quaternion = BABYLON.Quaternion;
  var Matrix = BABYLON.Matrix;

  function matrixFromQuaternion(rotation) { var matrix = Matrix.Identity(); rotation.toRotationMatrix(matrix); return matrix; }
  function FPSController(transform, camera, scene, graphicsObject) {
    Portals.PortalTraveller.call(this, transform, graphicsObject || transform);
    this.camera = camera;
    this.scene = scene;
    this.walkSpeed = 3;
    this.runSpeed = 6;
    this.smoothMoveTime = 0.1;
    this.jumpForce = 8;
    this.gravity = 18;
    this.mouseSensitivity = 0.1;
    this.pitchMin = -40;
    this.pitchMax = 85;
    this.rotationSmoothTime = 0.1;
    this.yaw = transform.rotation.y * 180 / Math.PI;
    this.pitch = camera.rotation.x * 180 / Math.PI;
    this.smoothYaw = this.yaw;
    this.smoothPitch = this.pitch;
    this.yawVelocity = { value: 0 };
    this.pitchVelocity = { value: 0 };
    this.verticalVelocity = 0;
    this.velocity = Vector3.Zero();
    this.smoothVelocity = { value: Vector3.Zero() };
    this.jumping = false;
    this.lastGroundedTime = 0;
    this.disabled = false;
    this.keys = {};
    var self = this;
    camera.attachControl(true);
    camera.checkCollisions = true;
    camera.applyGravity = false;
    scene.onKeyboardObservable.add(function (event) {
      var key = event.event.key.toLowerCase();
      if (event.type === BABYLON.KeyboardEventTypes.KEYDOWN) self.keys[key] = true;
      if (event.type === BABYLON.KeyboardEventTypes.KEYUP) self.keys[key] = false;
      if (event.type === BABYLON.KeyboardEventTypes.KEYDOWN && key === "o") self.disabled = !self.disabled;
    });
    scene.onPointerObservable.add(function (event) {
      if (self.disabled || event.type !== BABYLON.PointerEventTypes.POINTERMOVE) return;
      self.yaw += event.event.movementX * self.mouseSensitivity;
      self.pitch = Portals.clamp(self.pitch - event.event.movementY * self.mouseSensitivity, self.pitchMin, self.pitchMax);
    });
    scene.onBeforeRenderObservable.add(function () { self.update(); });
  }
  FPSController.prototype = Object.create(Portals.PortalTraveller.prototype);
  FPSController.prototype.constructor = FPSController;
  FPSController.prototype.update = function () {
    if (this.disabled) return;
    var dt = this.scene.getEngine().getDeltaTime() / 1000;
    var input = new Vector3((this.keys.d ? 1 : 0) - (this.keys.a ? 1 : 0), 0, (this.keys.w ? 1 : 0) - (this.keys.s ? 1 : 0));
    if (input.lengthSquared() > 1) input.normalize();
    var rotation = Quaternion.FromEulerAngles(0, this.smoothYaw * Math.PI / 180, 0);
    var worldInput = Vector3.TransformCoordinates(input, matrixFromQuaternion(rotation));
    var speed = this.keys.shift ? this.runSpeed : this.walkSpeed;
    this.velocity = Portals.smoothDampVector(this.velocity, worldInput.scale(speed), this.smoothVelocity, this.smoothMoveTime, dt);
    this.verticalVelocity -= this.gravity * dt;
    var grounded = Math.abs(this.camera.position.y - this.transform.position.y) < 0.05;
    if (grounded) { this.jumping = false; this.lastGroundedTime = performance.now() / 1000; this.verticalVelocity = Math.max(0, this.verticalVelocity); }
    if (this.keys[" "]) {
      var timeSinceGrounded = performance.now() / 1000 - this.lastGroundedTime;
      if (!this.jumping && timeSinceGrounded < 0.15) { this.jumping = true; this.verticalVelocity = this.jumpForce; }
    }
    this.transform.position.addInPlace(new Vector3(this.velocity.x, this.verticalVelocity, this.velocity.z).scale(dt));
    this.camera.position.copyFrom(this.transform.position);
    this.smoothPitch = Portals.smoothDampAngle(this.smoothPitch, this.pitch, this.pitchVelocity, this.rotationSmoothTime, dt);
    this.smoothYaw = Portals.smoothDampAngle(this.smoothYaw, this.yaw, this.yawVelocity, this.rotationSmoothTime, dt);
    this.transform.rotationQuaternion = Quaternion.FromEulerAngles(0, this.smoothYaw * Math.PI / 180, 0);
    this.camera.rotation.x = this.smoothPitch * Math.PI / 180;
    this.camera.rotation.y = this.smoothYaw * Math.PI / 180;
  };
  FPSController.prototype.teleport = function (fromPortal, toPortal, position, rotation) {
    Portals.PortalTraveller.prototype.teleport.call(this, fromPortal, toPortal, position, rotation);
    var targetYaw = rotation.toEulerAngles().y * 180 / Math.PI;
    var delta = Portals.deltaAngle(this.smoothYaw, targetYaw);
    this.yaw += delta;
    this.smoothYaw += delta;
    this.transform.rotationQuaternion = Quaternion.FromEulerAngles(0, this.smoothYaw * Math.PI / 180, 0);
    this.velocity = Portals.transformDirectionBetweenPortals(fromPortal, toPortal, this.velocity);
    this.camera.position.copyFrom(this.transform.position);
  };
  Portals.FPSController = FPSController;
})(window);
