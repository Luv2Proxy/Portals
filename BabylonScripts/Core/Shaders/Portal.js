(function (global) {
  "use strict";

  var BABYLON = global.BABYLON;
  var Portals = global.Portals = global.Portals || {};
  if (!BABYLON) throw new Error("Core/Shaders/Portal.js requires Babylon.js to be loaded first.");

  BABYLON.Effect.ShadersStore.portalVertexShader = "\n" +
    "precision highp float;\n" +
    "attribute vec3 position;\n" +
    "uniform mat4 worldViewProjection;\n" +
    "varying vec4 vScreenPosition;\n" +
    "void main(void) {\n" +
    "  vScreenPosition = worldViewProjection * vec4(position, 1.0);\n" +
    "  gl_Position = vScreenPosition;\n" +
    "}\n";

  BABYLON.Effect.ShadersStore.portalFragmentShader = "\n" +
    "precision highp float;\n" +
    "varying vec4 vScreenPosition;\n" +
    "uniform sampler2D textureSampler;\n" +
    "uniform vec4 inactiveColour;\n" +
    "uniform float displayMask;\n" +
    "void main(void) {\n" +
    "  vec2 uv = (vScreenPosition.xy / vScreenPosition.w) * 0.5 + 0.5;\n" +
    "  vec4 portalCol = texture2D(textureSampler, uv);\n" +
    "  gl_FragColor = mix(inactiveColour, portalCol, clamp(displayMask, 0.0, 1.0));\n" +
    "}\n";

  function toColor4(color, fallback) {
    if (!color) return fallback;
    return new BABYLON.Color4(color.r, color.g, color.b, color.a === undefined ? 1 : color.a);
  }

  function onePixelTexture(name, scene) {
    var texture = new BABYLON.RawTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, BABYLON.Engine.TEXTUREFORMAT_RGBA, scene, false, false, BABYLON.Texture.NEAREST_SAMPLINGMODE);
    texture.name = name;
    return texture;
  }

  Portals.createPortalMaterial = function (name, scene, options) {
    options = options || {};
    var material = new BABYLON.ShaderMaterial(name, scene, { vertex: "portal", fragment: "portal" }, {
      attributes: ["position"],
      uniforms: ["worldViewProjection", "inactiveColour", "displayMask"],
      samplers: ["textureSampler"]
    });
    material.backFaceCulling = false;
    material.setFloat("displayMask", options.displayMask === undefined ? 1 : options.displayMask);
    material.setColor4("inactiveColour", toColor4(options.inactiveColour, new BABYLON.Color4(1, 1, 1, 1)));
    material.setTexture("textureSampler", options.texture || onePixelTexture(name + "InactiveTexture", scene));
    return material;
  };
})(window);
