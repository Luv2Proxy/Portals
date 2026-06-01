(function (global) {
  "use strict";

  var BABYLON = global.BABYLON;
  var Portals = global.Portals = global.Portals || {};
  if (!BABYLON) {
    throw new Error("BabylonScripts/shaders.js requires Babylon.js to be loaded first.");
  }

  BABYLON.Effect.ShadersStore.portalVertexShader = "\n" +
    "precision highp float;\n" +
    "attribute vec3 position;\n" +
    "attribute vec2 uv;\n" +
    "uniform mat4 worldViewProjection;\n" +
    "varying vec2 vUV;\n" +
    "void main(void) {\n" +
    "  vUV = uv;\n" +
    "  gl_Position = worldViewProjection * vec4(position, 1.0);\n" +
    "}\n";

  BABYLON.Effect.ShadersStore.portalFragmentShader = "\n" +
    "precision highp float;\n" +
    "varying vec2 vUV;\n" +
    "uniform sampler2D textureSampler;\n" +
    "uniform float displayMask;\n" +
    "void main(void) {\n" +
    "  if (displayMask < 0.5) discard;\n" +
    "  gl_FragColor = texture2D(textureSampler, vUV);\n" +
    "}\n";

  BABYLON.Effect.ShadersStore.sliceVertexShader = "\n" +
    "precision highp float;\n" +
    "attribute vec3 position;\n" +
    "attribute vec3 normal;\n" +
    "uniform mat4 world;\n" +
    "uniform mat4 worldViewProjection;\n" +
    "varying vec3 vWorldPosition;\n" +
    "varying vec3 vNormal;\n" +
    "void main(void) {\n" +
    "  vec4 worldPosition = world * vec4(position, 1.0);\n" +
    "  vWorldPosition = worldPosition.xyz;\n" +
    "  vNormal = normalize((world * vec4(normal, 0.0)).xyz);\n" +
    "  gl_Position = worldViewProjection * vec4(position, 1.0);\n" +
    "}\n";

  BABYLON.Effect.ShadersStore.sliceFragmentShader = "\n" +
    "precision highp float;\n" +
    "varying vec3 vWorldPosition;\n" +
    "varying vec3 vNormal;\n" +
    "uniform vec3 color;\n" +
    "uniform vec3 sliceCentre;\n" +
    "uniform vec3 sliceNormal;\n" +
    "uniform float sliceOffsetDst;\n" +
    "void main(void) {\n" +
    "  float side = dot(vWorldPosition - sliceCentre, sliceNormal);\n" +
    "  if (side < sliceOffsetDst) discard;\n" +
    "  float light = max(0.25, dot(normalize(vNormal), normalize(vec3(0.25, 1.0, 0.5))));\n" +
    "  gl_FragColor = vec4(color * light, 1.0);\n" +
    "}\n";

  Portals.createPortalMaterial = function (name, scene) {
    var material = new BABYLON.ShaderMaterial(name, scene, { vertex: "portal", fragment: "portal" }, {
      attributes: ["position", "uv"],
      uniforms: ["worldViewProjection", "displayMask"],
      samplers: ["textureSampler"]
    });
    material.setFloat("displayMask", 1);
    return material;
  };

  Portals.createSliceMaterial = function (name, scene, color) {
    var material = new BABYLON.ShaderMaterial(name, scene, { vertex: "slice", fragment: "slice" }, {
      attributes: ["position", "normal"],
      uniforms: ["world", "worldViewProjection", "color", "sliceCentre", "sliceNormal", "sliceOffsetDst"]
    });
    material.setColor3("color", color || BABYLON.Color3.White());
    material.setVector3("sliceCentre", BABYLON.Vector3.Zero());
    material.setVector3("sliceNormal", BABYLON.Vector3.Zero());
    material.setFloat("sliceOffsetDst", 0);
    return material;
  };
})(window);
