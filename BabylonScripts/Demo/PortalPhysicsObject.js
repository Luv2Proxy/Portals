(function (global) {
  "use strict";
  var BABYLON = global.BABYLON;
  var Portals = global.Portals;
  if (!BABYLON || !Portals || !Portals.PortalTraveller) throw new Error("PortalPhysicsObject.js requires Babylon.js and the core portal scripts.");
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
    for (var i = 0; i < meshes.length; i++) if (meshes[i].material instanceof BABYLON.StandardMaterial) meshes[i].material.diffuseColor = color;
  };
  Portals.PortalPhysicsObject = PortalPhysicsObject;
})(window);
