(function (global) {
  "use strict";

  var BABYLON = global.BABYLON;
  if (!BABYLON) {
    throw new Error("BabylonScripts/portals.js requires Babylon.js to be loaded first.");
  }

  var Portals = global.Portals = global.Portals || {};
  var Vector3 = BABYLON.Vector3;
  var Matrix = BABYLON.Matrix;
  var Quaternion = BABYLON.Quaternion;
  var Plane = BABYLON.Plane;

  function sign(value) {
    return value > 0 ? 1 : value < 0 ? -1 : 0;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
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

  function componentRef(vectorRef, key) {
    return {
      get value() { return vectorRef.value[key]; },
      set value(v) { vectorRef.value[key] = v; }
    };
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
    var rotation = new Quaternion();
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
    if (material && typeof material.setFloat === "function") {
      material.setFloat(name, value);
    }
  }

  function setMaterialVector(material, name, value) {
    if (material && typeof material.setVector3 === "function") {
      material.setVector3(name, value);
    }
  }

  function MinMax3D(min, max) {
    min = min === undefined ? Number.POSITIVE_INFINITY : min;
    max = max === undefined ? Number.NEGATIVE_INFINITY : max;
    this.xMin = min;
    this.xMax = max;
    this.yMin = min;
    this.yMax = max;
    this.zMin = min;
    this.zMax = max;
  }

  MinMax3D.prototype.addPoint = function (point) {
    this.xMin = Math.min(this.xMin, point.x);
    this.xMax = Math.max(this.xMax, point.x);
    this.yMin = Math.min(this.yMin, point.y);
    this.yMax = Math.max(this.yMax, point.y);
    this.zMin = Math.min(this.zMin, point.z);
    this.zMax = Math.max(this.zMax, point.z);
  };

  var cubeCornerOffsets = [
    new Vector3(1, 1, 1), new Vector3(-1, 1, 1), new Vector3(-1, -1, 1), new Vector3(-1, -1, -1),
    new Vector3(-1, 1, -1), new Vector3(1, -1, -1), new Vector3(1, 1, -1), new Vector3(1, -1, 1)
  ];

  var CameraUtility = {
    visibleFromCamera: function (mesh, camera) {
      return mesh.isInFrustum(BABYLON.Frustum.GetPlanes(camera.getTransformationMatrix()));
    },

    boundsOverlap: function (nearObject, farObject, camera) {
      var near = this.getScreenRectFromBounds(nearObject, camera);
      var far = this.getScreenRectFromBounds(farObject, camera);
      if (far.zMax > near.zMin) {
        if (far.xMax < near.xMin || far.xMin > near.xMax) return false;
        if (far.yMax < near.yMin || far.yMin > near.yMax) return false;
        return true;
      }
      return false;
    },

    getScreenRectFromBounds: function (mesh, camera) {
      var minMax = new MinMax3D();
      var bounds = mesh.getBoundingInfo().boundingBox;
      var center = bounds.centerWorld;
      var extents = bounds.extendSizeWorld;
      var engine = camera.getEngine();
      var viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
      var anyPointInFront = false;

      for (var i = 0; i < cubeCornerOffsets.length; i++) {
        var corner = cubeCornerOffsets[i];
        var worldCorner = new Vector3(center.x + extents.x * corner.x, center.y + extents.y * corner.y, center.z + extents.z * corner.z);
        var projected = Vector3.Project(worldCorner, Matrix.Identity(), camera.getTransformationMatrix(), viewport);
        projected.x /= engine.getRenderWidth();
        projected.y /= engine.getRenderHeight();

        var depth = Vector3.Dot(worldCorner.subtract(camera.globalPosition), camera.getForwardRay().direction);
        projected.z = depth;
        if (depth > 0) {
          anyPointInFront = true;
        } else {
          projected.x = projected.x <= 0.5 ? 1 : 0;
          projected.y = projected.y <= 0.5 ? 1 : 0;
        }
        minMax.addPoint(projected);
      }

      return anyPointInFront ? minMax : new MinMax3D(0, 0);
    }
  };

  function PortalTraveller(transform, graphicsObject) {
    this.transform = transform;
    this.graphicsObject = graphicsObject || transform;
    this.graphicsClone = null;
    this.previousOffsetFromPortal = Vector3.Zero();
    this.originalMaterials = [];
    this.cloneMaterials = [];
  }

  PortalTraveller.prototype.teleport = function (_fromPortal, _toPortal, position, rotation) {
    this.transform.position.copyFrom(position);
    this.transform.rotationQuaternion = rotation.clone();
  };

  PortalTraveller.prototype.enterPortalThreshold = function (scene) {
    if (!this.graphicsClone) {
      this.graphicsClone = this.cloneGraphics(scene || this.transform.getScene());
      this.graphicsClone.parent = this.graphicsObject.parent;
      this.graphicsClone.scaling.copyFrom(this.graphicsObject.scaling);
      this.originalMaterials = collectMaterials(this.graphicsObject);
      this.cloneMaterials = collectMaterials(this.graphicsClone);
    } else {
      this.graphicsClone.setEnabled(true);
    }
  };

  PortalTraveller.prototype.exitPortalThreshold = function () {
    if (this.graphicsClone) this.graphicsClone.setEnabled(false);
    for (var i = 0; i < this.originalMaterials.length; i++) {
      setMaterialVector(this.originalMaterials[i], "sliceNormal", Vector3.Zero());
    }
  };

  PortalTraveller.prototype.setSliceOffsetDst = function (dst, clone) {
    var materials = clone ? this.cloneMaterials : this.originalMaterials;
    for (var i = 0; i < materials.length; i++) {
      setMaterialFloat(materials[i], "sliceOffsetDst", dst);
    }
  };

  PortalTraveller.prototype.cloneGraphics = function (scene) {
    var root = new BABYLON.TransformNode(this.graphicsObject.name + "_portalClone", scene);
    var meshes = this.graphicsObject.getChildMeshes ? this.graphicsObject.getChildMeshes(false).slice() : [];
    if (this.graphicsObject instanceof BABYLON.AbstractMesh) meshes.unshift(this.graphicsObject);

    for (var i = 0; i < meshes.length; i++) {
      var source = meshes[i];
      var clone = source.clone(source.name + "_portalClone", root);
      if (clone) {
        clone.position.copyFrom(source.position);
        clone.rotation.copyFrom(source.rotation);
        clone.rotationQuaternion = source.rotationQuaternion ? source.rotationQuaternion.clone() : null;
        clone.scaling.copyFrom(source.scaling);
      }
    }
    return root;
  };

  function collectMaterials(node) {
    var materials = [];
    var meshes = node.getChildMeshes ? node.getChildMeshes(false).slice() : [];
    if (node instanceof BABYLON.AbstractMesh) meshes.unshift(node);
    for (var i = 0; i < meshes.length; i++) {
      var material = meshes[i].material;
      if (!material) continue;
      materials.push(material);
      if (material.subMaterials) {
        for (var j = 0; j < material.subMaterials.length; j++) {
          if (material.subMaterials[j]) materials.push(material.subMaterials[j]);
        }
      }
    }
    return materials;
  }

  function Portal(scene, transform, screen, playerCamera, options) {
    options = options || {};
    this.scene = scene;
    this.transform = transform;
    this.screen = screen;
    this.playerCamera = playerCamera;
    this.linkedPortal = null;
    this.recursionLimit = options.recursionLimit || 5;
    this.nearClipOffset = options.nearClipOffset === undefined ? 0.05 : options.nearClipOffset;
    this.nearClipLimit = options.nearClipLimit === undefined ? 0.2 : options.nearClipLimit;
    this.trackedTravellers = [];
    this.viewTexture = null;
    this.portalCamera = new BABYLON.FreeCamera(transform.name + "_portalCamera", Vector3.Zero(), scene);
    this.portalCamera.minZ = playerCamera.minZ;
    this.portalCamera.maxZ = playerCamera.maxZ;
    this.portalCamera.fov = playerCamera.fov || Math.PI / 3;
    this.portalCamera.detachControl();
    this.portalCamera.setEnabled(false);
    this.setDisplayMask(1);
  }

  Portal.prototype.link = function (other) {
    this.linkedPortal = other;
    other.linkedPortal = this;
  };

  Portal.prototype.prePortalRender = function () {
    for (var i = 0; i < this.trackedTravellers.length; i++) this.updateSliceParams(this.trackedTravellers[i]);
  };

  Portal.prototype.render = function () {
    var linked = this.linkedPortal;
    if (!linked || !CameraUtility.visibleFromCamera(linked.screen, this.playerCamera)) return;

    this.createViewTexture();
    var renderTransforms = new Array(this.recursionLimit);
    var localToWorld = this.playerCamera.getWorldMatrix().clone();
    var startIndex = 0;

    for (var i = 0; i < this.recursionLimit; i++) {
      if (i > 0 && !CameraUtility.boundsOverlap(this.screen, linked.screen, this.portalCamera)) break;
      localToWorld = localToWorld.multiply(inverseWorldMatrix(linked.transform)).multiply(this.transform.getWorldMatrix());
      var orderIndex = this.recursionLimit - i - 1;
      renderTransforms[orderIndex] = decomposeMatrix(localToWorld);
      this.setPortalCameraPose(renderTransforms[orderIndex].position, renderTransforms[orderIndex].rotation);
      startIndex = orderIndex;
    }

    this.screen.setEnabled(false);
    linked.setDisplayMask(0);
    for (var r = startIndex; r < this.recursionLimit; r++) {
      var pose = renderTransforms[r];
      if (!pose) continue;
      this.setPortalCameraPose(pose.position, pose.rotation);
      this.setNearClipPlane();
      this.handleClipping();
      this.viewTexture.render(false);
      if (r === startIndex) linked.setDisplayMask(1);
    }
    this.screen.setEnabled(true);
  };

  Portal.prototype.postPortalRender = function () {
    for (var i = 0; i < this.trackedTravellers.length; i++) this.updateSliceParams(this.trackedTravellers[i]);
    this.protectScreenFromClipping(this.playerCamera.globalPosition);
  };

  Portal.prototype.lateUpdate = function () {
    this.handleTravellers();
  };

  Portal.prototype.onTravellerEnterPortal = function (traveller) {
    if (this.trackedTravellers.indexOf(traveller) === -1) {
      traveller.enterPortalThreshold(this.scene);
      traveller.previousOffsetFromPortal = traveller.transform.position.subtract(this.transform.position);
      this.trackedTravellers.push(traveller);
    }
  };

  Portal.prototype.onTravellerExitPortal = function (traveller) {
    var index = this.trackedTravellers.indexOf(traveller);
    if (index !== -1) {
      traveller.exitPortalThreshold();
      this.trackedTravellers.splice(index, 1);
    }
  };

  Portal.prototype.sideOfPortal = function (position) {
    return sign(Vector3.Dot(position.subtract(this.transform.position), forwardOf(this.transform)));
  };

  Portal.prototype.sameSideOfPortal = function (positionA, positionB) {
    return this.sideOfPortal(positionA) === this.sideOfPortal(positionB);
  };

  Portal.prototype.handleTravellers = function () {
    var linked = this.linkedPortal;
    if (!linked) return;
    for (var i = 0; i < this.trackedTravellers.length; i++) {
      var traveller = this.trackedTravellers[i];
      var matrix = traveller.transform.getWorldMatrix().multiply(inverseWorldMatrix(this.transform)).multiply(linked.transform.getWorldMatrix());
      var decomposed = decomposeMatrix(matrix);
      var offset = traveller.transform.position.subtract(this.transform.position);
      var portalSide = sign(Vector3.Dot(offset, forwardOf(this.transform)));
      var oldSide = sign(Vector3.Dot(traveller.previousOffsetFromPortal, forwardOf(this.transform)));

      if (portalSide !== oldSide) {
        var oldPosition = traveller.transform.position.clone();
        var oldRotation = traveller.transform.rotationQuaternion ? traveller.transform.rotationQuaternion.clone() : Quaternion.FromEulerVector(traveller.transform.rotation);
        traveller.teleport(this.transform, linked.transform, decomposed.position, decomposed.rotation);
        if (traveller.graphicsClone) {
          traveller.graphicsClone.position.copyFrom(oldPosition);
          traveller.graphicsClone.rotationQuaternion = oldRotation;
        }
        linked.onTravellerEnterPortal(traveller);
        this.trackedTravellers.splice(i, 1);
        i--;
      } else {
        if (traveller.graphicsClone) {
          traveller.graphicsClone.position.copyFrom(decomposed.position);
          traveller.graphicsClone.rotationQuaternion = decomposed.rotation;
        }
        traveller.previousOffsetFromPortal = offset;
      }
    }
  };

  Portal.prototype.createViewTexture = function () {
    var engine = this.scene.getEngine();
    var width = engine.getRenderWidth();
    var height = engine.getRenderHeight();
    if (this.viewTexture && this.viewTexture.getSize().width === width && this.viewTexture.getSize().height === height) return;
    if (this.viewTexture) this.viewTexture.dispose();
    this.viewTexture = new BABYLON.RenderTargetTexture(this.transform.name + "_portalView", { width: width, height: height }, this.scene, false, true);
    this.viewTexture.activeCamera = this.portalCamera;
    this.viewTexture.renderList = this.scene.meshes.slice();
    if (this.linkedPortal) this.linkedPortal.setScreenTexture(this.viewTexture);
  };

  Portal.prototype.handleClipping = function () {
    var linked = this.linkedPortal;
    if (!linked) return;
    var hideDst = -1000;
    var showDst = 1000;
    var screenThickness = linked.protectScreenFromClipping(this.portalCamera.position);

    for (var i = 0; i < this.trackedTravellers.length; i++) {
      var traveller = this.trackedTravellers[i];
      traveller.setSliceOffsetDst(this.sameSideOfPortal(traveller.transform.position, this.portalCamera.position) ? hideDst : showDst, false);
      var cloneSideOfLinkedPortal = -this.sideOfPortal(traveller.transform.position);
      var camSameSideAsClone = linked.sideOfPortal(this.portalCamera.position) === cloneSideOfLinkedPortal;
      traveller.setSliceOffsetDst(camSameSideAsClone ? screenThickness : -screenThickness, true);
    }

    for (var j = 0; j < linked.trackedTravellers.length; j++) {
      var linkedTraveller = linked.trackedTravellers[j];
      var cloneOnSameSideAsCam = linked.sideOfPortal(linkedTraveller.transform.position) !== this.sideOfPortal(this.portalCamera.position);
      linkedTraveller.setSliceOffsetDst(cloneOnSameSideAsCam ? hideDst : showDst, true);
      var camSameSideAsTraveller = linked.sameSideOfPortal(linkedTraveller.transform.position, this.portalCamera.position);
      linkedTraveller.setSliceOffsetDst(camSameSideAsTraveller ? screenThickness : -screenThickness, false);
    }
  };

  Portal.prototype.protectScreenFromClipping = function (viewPoint) {
    var fov = this.playerCamera.fov || Math.PI / 3;
    var engine = this.scene.getEngine();
    var halfHeight = this.playerCamera.minZ * Math.tan(fov * 0.5);
    var halfWidth = halfHeight * (engine.getRenderWidth() / engine.getRenderHeight());
    var screenThickness = new Vector3(halfWidth, halfHeight, this.playerCamera.minZ).length();
    var camFacingSameDirAsPortal = Vector3.Dot(forwardOf(this.transform), this.transform.position.subtract(viewPoint)) > 0;
    this.screen.scaling.z = screenThickness;
    this.screen.position = this.transform.position.add(forwardOf(this.transform).scale(screenThickness * (camFacingSameDirAsPortal ? 0.5 : -0.5)));
    return screenThickness;
  };

  Portal.prototype.updateSliceParams = function (traveller) {
    var linked = this.linkedPortal;
    if (!linked) return;
    var side = this.sideOfPortal(traveller.transform.position);
    var sliceNormal = forwardOf(this.transform).scale(-side);
    var cloneSliceNormal = forwardOf(linked.transform).scale(side);
    var screenThickness = this.screen.scaling.z;
    var sliceOffsetDst = this.sameSideOfPortal(this.playerCamera.globalPosition, traveller.transform.position) ? 0 : -screenThickness;
    var cloneSliceOffsetDst = side !== linked.sideOfPortal(this.playerCamera.globalPosition) ? 0 : -screenThickness;

    for (var i = 0; i < traveller.originalMaterials.length; i++) {
      setMaterialVector(traveller.originalMaterials[i], "sliceCentre", this.transform.position);
      setMaterialVector(traveller.originalMaterials[i], "sliceNormal", sliceNormal);
      setMaterialFloat(traveller.originalMaterials[i], "sliceOffsetDst", sliceOffsetDst);
      setMaterialVector(traveller.cloneMaterials[i], "sliceCentre", linked.transform.position);
      setMaterialVector(traveller.cloneMaterials[i], "sliceNormal", cloneSliceNormal);
      setMaterialFloat(traveller.cloneMaterials[i], "sliceOffsetDst", cloneSliceOffsetDst);
    }
  };

  Portal.prototype.setNearClipPlane = function () {
    var clipForward = forwardOf(this.transform);
    var dot = sign(Vector3.Dot(clipForward, this.transform.position.subtract(this.portalCamera.position)));
    var view = this.portalCamera.getViewMatrix();
    var camSpacePos = Vector3.TransformCoordinates(this.transform.position, view);
    var camSpaceNormal = Vector3.TransformNormal(clipForward, view).scale(dot).normalize();
    var camSpaceDst = -Vector3.Dot(camSpacePos, camSpaceNormal) + this.nearClipOffset;

    if (Math.abs(camSpaceDst) > this.nearClipLimit) {
      setCameraProjectionMatrix(this.portalCamera, makeObliqueProjection(this.playerCamera.getProjectionMatrix(), new Plane(camSpaceNormal.x, camSpaceNormal.y, camSpaceNormal.z, camSpaceDst)));
    } else {
      setCameraProjectionMatrix(this.portalCamera, this.playerCamera.getProjectionMatrix());
    }
  };

  Portal.prototype.setPortalCameraPose = function (position, rotation) {
    this.portalCamera.position.copyFrom(position);
    this.portalCamera.rotationQuaternion = rotation.clone();
  };

  Portal.prototype.setDisplayMask = function (value) {
    setMaterialFloat(this.screen.material, "displayMask", value);
    this.screen.visibility = value === 0 ? 0 : 1;
  };

  Portal.prototype.setScreenTexture = function (texture) {
    var material = this.screen.material;
    if (material instanceof BABYLON.StandardMaterial) {
      material.diffuseTexture = texture;
      material.emissiveTexture = texture;
      material.disableLighting = true;
    } else if (material && typeof material.setTexture === "function") {
      material.setTexture("textureSampler", texture);
      material.setTexture("_MainTex", texture);
    }
  };

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

  function setCameraProjectionMatrix(camera, projection) {
    if (typeof camera.freezeProjectionMatrix === "function") {
      camera.freezeProjectionMatrix(projection);
    } else if (typeof camera.setProjectionMatrix === "function") {
      camera.setProjectionMatrix(projection, true);
    } else {
      camera._projectionMatrix = projection.clone ? projection.clone() : projection;
      camera._isProjectionMatrixDirty = false;
    }
  }

  function MainCameraPortalRenderer(scene, portals) {
    this.scene = scene;
    this.portals = portals;
    this.observer = null;
  }

  MainCameraPortalRenderer.prototype.attach = function () {
    var self = this;
    this.detach();
    this.observer = this.scene.onBeforeRenderObservable.add(function () {
      for (var i = 0; i < self.portals.length; i++) self.portals[i].prePortalRender();
      for (var j = 0; j < self.portals.length; j++) self.portals[j].render();
      for (var k = 0; k < self.portals.length; k++) self.portals[k].postPortalRender();
      for (var l = 0; l < self.portals.length; l++) self.portals[l].lateUpdate();
    });
  };

  MainCameraPortalRenderer.prototype.detach = function () {
    if (this.observer) {
      this.scene.onBeforeRenderObservable.remove(this.observer);
      this.observer = null;
    }
  };

  function enableHavokPhysics(scene, gravity) {
    gravity = gravity || new Vector3(0, -9.81, 0);
    if (!global.HavokPhysics) {
      return Promise.reject(new Error("HavokPhysics is not loaded. Include the Havok script before calling enableHavokPhysics."));
    }
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
  Portals.MinMax3D = MinMax3D;
  Portals.CameraUtility = CameraUtility;
  Portals.PortalTraveller = PortalTraveller;
  Portals.Portal = Portal;
  Portals.MainCameraPortalRenderer = MainCameraPortalRenderer;
  Portals.makeObliqueProjection = makeObliqueProjection;
  Portals.setCameraProjectionMatrix = setCameraProjectionMatrix;
  Portals.enableHavokPhysics = enableHavokPhysics;
})(window);
