(function (global) {
  "use strict";

  var BABYLON = global.BABYLON;
  if (!BABYLON) throw new Error("PortalRuntime.js requires Babylon.js to be loaded first.");

  var Portals = global.Portals = global.Portals || {};
  var Vector3 = BABYLON.Vector3;
  var Matrix = BABYLON.Matrix;

  function sign(value) { return value > 0 ? 1 : value < 0 ? -1 : 0; }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function componentRef(vectorRef, key) {
    return { get value() { return vectorRef.value[key]; }, set value(v) { vectorRef.value[key] = v; } };
  }
  function smoothDamp(current, target, velocityRef, smoothTime, deltaTime) {
    smoothTime = Math.max(0.0001, smoothTime);
    var omega = 2 / smoothTime;
    var x = omega * deltaTime;
    var exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    var change = current - target;
    var temp = (velocityRef.value + omega * change) * deltaTime;
    velocityRef.value = (velocityRef.value - omega * temp) * exp;
    return target + (change + temp) * exp;
  }
  function smoothDampVector(current, target, velocityRef, smoothTime, deltaTime) {
    return new Vector3(
      smoothDamp(current.x, target.x, componentRef(velocityRef, "x"), smoothTime, deltaTime),
      smoothDamp(current.y, target.y, componentRef(velocityRef, "y"), smoothTime, deltaTime),
      smoothDamp(current.z, target.z, componentRef(velocityRef, "z"), smoothTime, deltaTime)
    );
  }
  function deltaAngle(current, target) {
    var delta = ((target - current + 180) % 360) - 180;
    return delta < -180 ? delta + 360 : delta;
  }
  function smoothDampAngle(current, target, velocityRef, smoothTime, deltaTime) {
    return smoothDamp(current, current + deltaAngle(current, target), velocityRef, smoothTime, deltaTime);
  }
  function decomposeMatrix(matrix) {
    var scaling = new Vector3();
    var rotation = new BABYLON.Quaternion();
    var position = new Vector3();
    matrix.decompose(scaling, rotation, position);
    return { scaling: scaling, rotation: rotation, position: position };
  }
  function inverseWorldMatrix(node) {
    var inverse = node.getWorldMatrix().clone();
    inverse.invert();
    return inverse;
  }
  function forwardOf(node) {
    return Vector3.TransformNormal(Vector3.Forward(), node.getWorldMatrix()).normalize();
  }
  function transformDirectionBetweenPortals(fromPortal, toPortal, direction) {
    var local = Vector3.TransformNormal(direction, inverseWorldMatrix(fromPortal));
    return Vector3.TransformNormal(local, toPortal.getWorldMatrix());
  }
  function setMaterialFloat(material, name, value) {
    if (material && typeof material.setFloat === "function") material.setFloat(name, value);
  }
  function setMaterialVector(material, name, value) {
    if (material && typeof material.setVector3 === "function") material.setVector3(name, value);
  }
  function collectMaterials(node) {
    var materials = [];
    node.getChildMeshes(false).concat(node).forEach(function (mesh) {
      if (mesh.material) materials.push(mesh.material);
    });
    return materials;
  }
  function makeObliqueProjection(projection, clipPlane) {
    var result = projection.clone();
    var m = projection.m;
    var q = new BABYLON.Vector4((Math.sign(clipPlane.normal.x) + m[8]) / m[0], (Math.sign(clipPlane.normal.y) + m[9]) / m[5], -1, (1 + m[10]) / m[14]);
    var plane = new BABYLON.Vector4(clipPlane.normal.x, clipPlane.normal.y, clipPlane.normal.z, clipPlane.d);
    var c = plane.scale(2 / BABYLON.Vector4.Dot(plane, q));
    result.m[2] = c.x;
    result.m[6] = c.y;
    result.m[10] = c.z + 1;
    result.m[14] = c.w;
    return result;
  }
  function enableHavokPhysics(scene, gravity) {
    gravity = gravity || new Vector3(0, -9.81, 0);
    if (!global.HavokPhysics) return Promise.reject(new Error("HavokPhysics is not loaded. Include the Havok script before calling enableHavokPhysics."));
    return global.HavokPhysics().then(function (havok) {
      var plugin = new BABYLON.HavokPlugin(true, havok);
      scene.enablePhysics(gravity, plugin);
      return plugin;
    });
  }

  Portals.sign = sign;
  Portals.clamp = clamp;
  Portals.smoothDamp = smoothDamp;
  Portals.smoothDampVector = smoothDampVector;
  Portals.deltaAngle = deltaAngle;
  Portals.smoothDampAngle = smoothDampAngle;
  Portals.decomposeMatrix = decomposeMatrix;
  Portals.inverseWorldMatrix = inverseWorldMatrix;
  Portals.forwardOf = forwardOf;
  Portals.transformDirectionBetweenPortals = transformDirectionBetweenPortals;
  Portals.setMaterialFloat = setMaterialFloat;
  Portals.setMaterialVector = setMaterialVector;
  Portals.collectMaterials = collectMaterials;
  Portals.makeObliqueProjection = makeObliqueProjection;
  Portals.enableHavokPhysics = enableHavokPhysics;
})(window);
