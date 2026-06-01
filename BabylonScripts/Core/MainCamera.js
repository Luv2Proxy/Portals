(function (global) {
  "use strict";

  var Portals = global.Portals = global.Portals || {};

  function MainCameraPortalRenderer(scene, portals) {
    this.scene = scene;
    this.portals = portals || [];
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

  Portals.MainCameraPortalRenderer = MainCameraPortalRenderer;
})(window);
