(function (global) {
  "use strict";

  var BABYLON = global.BABYLON;
  var Portals = global.Portals = global.Portals || {};
  if (!BABYLON || !Portals.collectMaterials) throw new Error("PortalTraveller.js requires Babylon.js and PortalRuntime.js.");

  function PortalTraveller(transform, graphicsObject) {
    this.transform = transform;
    this.graphicsObject = graphicsObject || transform;
    this.graphicsClone = null;
    this.previousOffsetFromPortal = BABYLON.Vector3.Zero();
    this.originalMaterials = [];
    this.cloneMaterials = [];
  }

  PortalTraveller.prototype.teleport = function (_fromPortal, _toPortal, position, rotation) {
    this.transform.position.copyFrom(position);
    this.transform.rotationQuaternion = rotation.clone();
  };

  PortalTraveller.prototype.enterPortalThreshold = function (scene) {
    if (!this.graphicsClone) {
      this.graphicsClone = this.cloneGraphics(scene);
      this.originalMaterials = Portals.collectMaterials(this.graphicsObject);
      this.cloneMaterials = Portals.collectMaterials(this.graphicsClone);
    } else {
      this.graphicsClone.setEnabled(true);
    }
  };

  PortalTraveller.prototype.exitPortalThreshold = function () {
    if (this.graphicsClone) this.graphicsClone.setEnabled(false);
    for (var i = 0; i < this.originalMaterials.length; i++) {
      Portals.setMaterialVector(this.originalMaterials[i], "sliceNormal", BABYLON.Vector3.Zero());
    }
  };

  PortalTraveller.prototype.setSliceOffsetDst = function (dst, clone) {
    var materials = clone ? this.cloneMaterials : this.originalMaterials;
    for (var i = 0; i < materials.length; i++) Portals.setMaterialFloat(materials[i], "sliceOffsetDst", dst);
  };

  PortalTraveller.prototype.cloneGraphics = function (scene) {
    var clone = this.graphicsObject.clone(this.graphicsObject.name + "_portalClone", null, true);
    if (!clone) throw new Error("Unable to clone graphics object " + this.graphicsObject.name);
    clone.parent = this.graphicsObject.parent;
    clone.position.copyFrom(this.graphicsObject.position);
    clone.scaling.copyFrom(this.graphicsObject.scaling);
    clone.rotationQuaternion = this.graphicsObject.rotationQuaternion ? this.graphicsObject.rotationQuaternion.clone() : BABYLON.Quaternion.FromEulerVector(this.graphicsObject.rotation);
    clone.getChildMeshes(false).forEach(function (mesh) {
      if (mesh.material) mesh.material = mesh.material.clone(mesh.material.name + "_portalClone");
    });
    if (clone.material) clone.material = clone.material.clone(clone.material.name + "_portalClone");
    clone.setEnabled(true);
    if (scene && scene.addTransformNode && clone.getScene && clone.getScene() !== scene) scene.addTransformNode(clone);
    return clone;
  };

  Portals.PortalTraveller = PortalTraveller;
})(window);
