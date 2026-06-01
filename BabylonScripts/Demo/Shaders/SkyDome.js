(function (global) {
  "use strict";

  var BABYLON = global.BABYLON;
  var Portals = global.Portals = global.Portals || {};
  if (!BABYLON) throw new Error("Demo/Shaders/SkyDome.js requires Babylon.js to be loaded first.");

  BABYLON.Effect.ShadersStore.skyDomeVertexShader = "\n" +
    "precision highp float;\n" +
    "attribute vec3 position;\n" +
    "attribute vec2 uv;\n" +
    "uniform mat4 worldViewProjection;\n" +
    "varying vec2 vUV;\n" +
    "void main(void) {\n" +
    "  vUV = uv;\n" +
    "  gl_Position = worldViewProjection * vec4(position, 1.0);\n" +
    "}\n";

  BABYLON.Effect.ShadersStore.skyDomeFragmentShader = "\n" +
    "precision highp float;\n" +
    "varying vec2 vUV;\n" +
    "uniform vec4 colorA;\n" +
    "uniform vec4 colorB;\n" +
    "uniform vec4 colorC;\n" +
    "void main(void) {\n" +
    "  float t = 1.0 - vUV.y;\n" +
    "  if (t < 0.5) {\n" +
    "    gl_FragColor = mix(colorA, colorB, t * 2.0);\n" +
    "  } else {\n" +
    "    gl_FragColor = mix(colorB, colorC, (t - 0.5) * 2.0);\n" +
    "  }\n" +
    "}\n";

  function toColor4(color, fallback) {
    if (!color) return fallback;
    return new BABYLON.Color4(color.r, color.g, color.b, color.a === undefined ? 1 : color.a);
  }

  Portals.createSkyDomeMaterial = function (name, scene, options) {
    options = options || {};
    var material = new BABYLON.ShaderMaterial(name, scene, { vertex: "skyDome", fragment: "skyDome" }, {
      attributes: ["position", "uv"],
      uniforms: ["worldViewProjection", "colorA", "colorB", "colorC"]
    });
    material.backFaceCulling = false;
    material.disableDepthWrite = true;
    material.setColor4("colorA", toColor4(options.colorA, new BABYLON.Color4(0.42, 0.7, 1.0, 1)));
    material.setColor4("colorB", toColor4(options.colorB, new BABYLON.Color4(0.9, 0.75, 0.5, 1)));
    material.setColor4("colorC", toColor4(options.colorC, new BABYLON.Color4(0.08, 0.1, 0.18, 1)));
    return material;
  };
})(window);
