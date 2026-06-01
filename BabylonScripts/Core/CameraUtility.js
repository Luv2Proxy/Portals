(function (global) {
  "use strict";

  var BABYLON = global.BABYLON;
  var Portals = global.Portals = global.Portals || {};
  if (!BABYLON) throw new Error("CameraUtility.js requires Babylon.js to be loaded first.");

  var Vector3 = BABYLON.Vector3;
  var Matrix = BABYLON.Matrix;

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
        if (depth > 0) anyPointInFront = true;
        else {
          projected.x = projected.x <= 0.5 ? 1 : 0;
          projected.y = projected.y <= 0.5 ? 1 : 0;
        }
        minMax.addPoint(projected);
      }
      return anyPointInFront ? minMax : new MinMax3D(0, 0);
    }
  };

  Portals.MinMax3D = MinMax3D;
  Portals.CameraUtility = CameraUtility;
})(window);
