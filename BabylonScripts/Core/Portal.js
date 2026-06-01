(function (global) {
  "use strict";

  var BABYLON = global.BABYLON;
  var Portals = global.Portals = global.Portals || {};
  if (!BABYLON || !Portals.CameraUtility || !Portals.PortalTraveller) throw new Error("Portal.js requires Babylon.js, PortalRuntime.js, CameraUtility.js, and PortalTraveller.js.");

  var Vector3 = BABYLON.Vector3;
  var Quaternion = BABYLON.Quaternion;
  var Plane = BABYLON.Plane;

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
    if (!linked || !Portals.CameraUtility.visibleFromCamera(linked.screen, this.playerCamera)) return;
    this.createViewTexture();
    var renderTransforms = new Array(this.recursionLimit);
    var localToWorld = this.playerCamera.getWorldMatrix().clone();
    var startIndex = 0;
    for (var i = 0; i < this.recursionLimit; i++) {
      if (i > 0 && !Portals.CameraUtility.boundsOverlap(this.screen, linked.screen, this.portalCamera)) break;
      localToWorld = localToWorld.multiply(Portals.inverseWorldMatrix(linked.transform)).multiply(this.transform.getWorldMatrix());
      var orderIndex = this.recursionLimit - i - 1;
      renderTransforms[orderIndex] = Portals.decomposeMatrix(localToWorld);
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
  Portal.prototype.lateUpdate = function () { this.handleTravellers(); };
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
    return Portals.sign(Vector3.Dot(position.subtract(this.transform.position), Portals.forwardOf(this.transform)));
  };
  Portal.prototype.sameSideOfPortal = function (positionA, positionB) { return this.sideOfPortal(positionA) === this.sideOfPortal(positionB); };
  Portal.prototype.handleTravellers = function () {
    var linked = this.linkedPortal;
    if (!linked) return;
    for (var i = 0; i < this.trackedTravellers.length; i++) {
      var traveller = this.trackedTravellers[i];
      var matrix = traveller.transform.getWorldMatrix().multiply(Portals.inverseWorldMatrix(this.transform)).multiply(linked.transform.getWorldMatrix());
      var decomposed = Portals.decomposeMatrix(matrix);
      var offset = traveller.transform.position.subtract(this.transform.position);
      var portalSide = Portals.sign(Vector3.Dot(offset, Portals.forwardOf(this.transform)));
      var oldSide = Portals.sign(Vector3.Dot(traveller.previousOffsetFromPortal, Portals.forwardOf(this.transform)));
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
    var camFacingSameDirAsPortal = Vector3.Dot(Portals.forwardOf(this.transform), this.transform.position.subtract(viewPoint)) > 0;
    this.screen.scaling.z = screenThickness;
    this.screen.position = this.transform.position.add(Portals.forwardOf(this.transform).scale(screenThickness * (camFacingSameDirAsPortal ? 0.5 : -0.5)));
    return screenThickness;
  };
  Portal.prototype.updateSliceParams = function (traveller) {
    var linked = this.linkedPortal;
    if (!linked) return;
    var side = this.sideOfPortal(traveller.transform.position);
    var sliceNormal = Portals.forwardOf(this.transform).scale(-side);
    var cloneSliceNormal = Portals.forwardOf(linked.transform).scale(side);
    var screenThickness = this.screen.scaling.z;
    var sliceOffsetDst = this.sameSideOfPortal(this.playerCamera.globalPosition, traveller.transform.position) ? 0 : -screenThickness;
    var cloneSliceOffsetDst = side !== linked.sideOfPortal(this.playerCamera.globalPosition) ? 0 : -screenThickness;
    for (var i = 0; i < traveller.originalMaterials.length; i++) {
      Portals.setMaterialVector(traveller.originalMaterials[i], "sliceCentre", this.transform.position);
      Portals.setMaterialVector(traveller.originalMaterials[i], "sliceNormal", sliceNormal);
      Portals.setMaterialFloat(traveller.originalMaterials[i], "sliceOffsetDst", sliceOffsetDst);
      Portals.setMaterialVector(traveller.cloneMaterials[i], "sliceCentre", linked.transform.position);
      Portals.setMaterialVector(traveller.cloneMaterials[i], "sliceNormal", cloneSliceNormal);
      Portals.setMaterialFloat(traveller.cloneMaterials[i], "sliceOffsetDst", cloneSliceOffsetDst);
    }
  };
  Portal.prototype.setNearClipPlane = function () {
    var clipForward = Portals.forwardOf(this.transform);
    var dot = Portals.sign(Vector3.Dot(clipForward, this.transform.position.subtract(this.portalCamera.position)));
    var view = this.portalCamera.getViewMatrix();
    var camSpacePos = Vector3.TransformCoordinates(this.transform.position, view);
    var camSpaceNormal = Vector3.TransformNormal(clipForward, view).scale(dot).normalize();
    var camSpaceDst = -Vector3.Dot(camSpacePos, camSpaceNormal) + this.nearClipOffset;
    if (Math.abs(camSpaceDst) > this.nearClipLimit) this.portalCamera.setProjectionMatrix(Portals.makeObliqueProjection(this.playerCamera.getProjectionMatrix(), new Plane(camSpaceNormal.x, camSpaceNormal.y, camSpaceNormal.z, camSpaceDst)), true);
    else this.portalCamera.setProjectionMatrix(this.playerCamera.getProjectionMatrix(), true);
  };
  Portal.prototype.setPortalCameraPose = function (position, rotation) {
    this.portalCamera.position.copyFrom(position);
    this.portalCamera.rotationQuaternion = rotation.clone();
  };
  Portal.prototype.setDisplayMask = function (value) {
    Portals.setMaterialFloat(this.screen.material, "displayMask", value);
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

  Portals.Portal = Portal;
})(window);
