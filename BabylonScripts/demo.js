(function (global) {
  "use strict";

  var BABYLON = global.BABYLON;
  var Portals = global.Portals;
  if (!BABYLON || !Portals) {
    throw new Error("BabylonScripts/demo.js requires Babylon.js and BabylonScripts/portals.js to be loaded first.");
  }

  var Vector3 = BABYLON.Vector3;
  var Quaternion = BABYLON.Quaternion;
  var Matrix = BABYLON.Matrix;

  function matrixFromQuaternion(rotation) {
    var matrix = Matrix.Identity();
    rotation.toRotationMatrix(matrix);
    return matrix;
  }

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
    var input = new Vector3(
      (this.keys.d ? 1 : 0) - (this.keys.a ? 1 : 0),
      0,
      (this.keys.w ? 1 : 0) - (this.keys.s ? 1 : 0)
    );
    if (input.lengthSquared() > 1) input.normalize();

    var rotation = Quaternion.FromEulerAngles(0, this.smoothYaw * Math.PI / 180, 0);
    var worldInput = Vector3.TransformCoordinates(input, matrixFromQuaternion(rotation));
    var speed = this.keys.shift ? this.runSpeed : this.walkSpeed;
    var targetVelocity = worldInput.scale(speed);
    this.velocity = Portals.smoothDampVector(this.velocity, targetVelocity, this.smoothVelocity, this.smoothMoveTime, dt);

    this.verticalVelocity -= this.gravity * dt;
    var grounded = Math.abs(this.camera.position.y - this.transform.position.y) < 0.05;
    if (grounded) {
      this.jumping = false;
      this.lastGroundedTime = performance.now() / 1000;
      this.verticalVelocity = Math.max(0, this.verticalVelocity);
    }
    if (this.keys[" "]) {
      var timeSinceGrounded = performance.now() / 1000 - this.lastGroundedTime;
      if (!this.jumping && timeSinceGrounded < 0.15) {
        this.jumping = true;
        this.verticalVelocity = this.jumpForce;
      }
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

  function PortalPhysicsObject(transform, body, graphicsObject, colors) {
    Portals.PortalTraveller.call(this, transform, graphicsObject || transform);
    this.body = body;
    this.force = 10;
    colors = colors || [];
    if (colors.length) this.applyColor(colors[PortalPhysicsObject.colorIndex++ % colors.length]);
    if (BABYLON.PhysicsMotionType && body.setMotionType) body.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
  }

  PortalPhysicsObject.colorIndex = 0;
  PortalPhysicsObject.prototype = Object.create(Portals.PortalTraveller.prototype);
  PortalPhysicsObject.prototype.constructor = PortalPhysicsObject;

  PortalPhysicsObject.prototype.teleport = function (fromPortal, toPortal, position, rotation) {
    Portals.PortalTraveller.prototype.teleport.call(this, fromPortal, toPortal, position, rotation);
    this.body.transformNode.position.copyFrom(position);
    this.body.transformNode.rotationQuaternion = rotation.clone();
    this.body.setLinearVelocity(Portals.transformDirectionBetweenPortals(fromPortal, toPortal, this.body.getLinearVelocity()));
    this.body.setAngularVelocity(Portals.transformDirectionBetweenPortals(fromPortal, toPortal, this.body.getAngularVelocity()));
  };

  PortalPhysicsObject.prototype.applyColor = function (color) {
    var meshes = this.graphicsObject.getChildMeshes ? this.graphicsObject.getChildMeshes(false).slice() : [];
    if (this.graphicsObject instanceof BABYLON.AbstractMesh) meshes.unshift(this.graphicsObject);
    for (var i = 0; i < meshes.length; i++) {
      if (meshes[i].material instanceof BABYLON.StandardMaterial) meshes[i].material.diffuseColor = color;
    }
  };

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

  function CloudTest(scene, transform, cloudPrefab, cloudCorePrefab, options) {
    options = options || {};
    this.scene = scene;
    this.transform = transform;
    this.cloudPrefab = cloudPrefab;
    this.cloudCorePrefab = cloudCorePrefab;
    this.numViewDirections = options.numViewDirections || 100;
    this.numClouds = options.numClouds || 10;
    this.cloudSpawnSeed = options.cloudSpawnSeed || 1;
    this.randomizeCloudSeed = !!options.randomizeCloudSeed;
    this.spawnRadius = options.spawnRadius || 10;
    this.startHeight = options.startHeight || 0;
  }

  CloudTest.prototype.start = function () {
    var goldenRatio = (1 + Math.sqrt(5)) / 2;
    var angleIncrement = Math.PI * 2 * goldenRatio;
    for (var i = 0; i < this.numViewDirections; i++) {
      this.spawn(this.cloudPrefab, this.direction(i / this.numViewDirections, angleIncrement * i));
    }
    var rng = mulberry32(this.randomizeCloudSeed ? Math.floor(Math.random() * 20000) - 10000 : this.cloudSpawnSeed);
    for (var j = 0; j < this.numClouds; j++) {
      this.spawn(this.cloudCorePrefab, this.direction(rng(), angleIncrement * j));
    }
  };

  CloudTest.prototype.direction = function (t, azimuth) {
    var inclination = Math.acos(1 - (1 - this.startHeight) * t);
    return new Vector3(Math.sin(inclination) * Math.sin(azimuth), Math.cos(inclination), Math.sin(inclination) * Math.cos(azimuth));
  };

  CloudTest.prototype.spawn = function (prefab, direction) {
    var instance = prefab.clone(prefab.name + "_cloud", null);
    if (!instance) throw new Error("Unable to clone " + prefab.name);
    instance.position.copyFrom(this.transform.position.add(direction.scale(this.spawnRadius)));
    instance.parent = this.transform;
    instance.setEnabled(true);
    return instance;
  };

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  Portals.FPSController = FPSController;
  Portals.PortalPhysicsObject = PortalPhysicsObject;
  Portals.Spawner = Spawner;
  Portals.Car = Car;
  Portals.CloudCoreTest = CloudCoreTest;
  Portals.CloudBehaviorTest = CloudBehaviorTest;
  Portals.CloudTest = CloudTest;
})(window);
