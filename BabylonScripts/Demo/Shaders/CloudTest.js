(function (global) {
  "use strict";

  var BABYLON = global.BABYLON;
  var Portals = global.Portals = global.Portals || {};
  if (!BABYLON) throw new Error("Demo/Shaders/CloudTest.js requires Babylon.js to be loaded first.");

  BABYLON.Effect.ShadersStore.cloudTestVertexShader = "\n" +
    "precision highp float;\n" +
    "attribute vec3 position;\n" +
    "attribute vec3 normal;\n" +
    "attribute vec2 uv;\n" +
    "uniform mat4 world;\n" +
    "uniform mat4 worldViewProjection;\n" +
    "varying vec2 vUV;\n" +
    "varying vec3 vNormal;\n" +
    "void main(void) {\n" +
    "  vUV = uv;\n" +
    "  vNormal = normalize((world * vec4(normal, 0.0)).xyz);\n" +
    "  gl_Position = worldViewProjection * vec4(position, 1.0);\n" +
    "}\n";

  BABYLON.Effect.ShadersStore.cloudTestFragmentShader = "\n" +
    "precision highp float;\n" +
    "varying vec2 vUV;\n" +
    "varying vec3 vNormal;\n" +
    "uniform sampler2D textureSampler;\n" +
    "uniform vec4 color;\n" +
    "uniform vec4 emission;\n" +
    "uniform float glossiness;\n" +
    "uniform float metallic;\n" +
    "void main(void) {\n" +
    "  vec4 tex = texture2D(textureSampler, vUV);\n" +
    "  vec3 albedo = tex.rgb * color.rgb;\n" +
    "  float light = max(0.35, dot(normalize(vNormal), normalize(vec3(0.2, 1.0, 0.4))));\n" +
    "  vec3 spec = vec3(glossiness * 0.12 + metallic * 0.08);\n" +
    "  gl_FragColor = vec4(albedo * light + emission.rgb + spec, tex.a * color.a);\n" +
    "}\n";

  function onePixelTexture(name, scene) {
    var texture = new BABYLON.RawTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, BABYLON.Engine.TEXTUREFORMAT_RGBA, scene, false, false, BABYLON.Texture.NEAREST_SAMPLINGMODE);
    texture.name = name;
    return texture;
  }

  function toColor4(color, fallback) {
    if (!color) return fallback;
    return new BABYLON.Color4(color.r, color.g, color.b, color.a === undefined ? 1 : color.a);
  }

  Portals.createCloudTestMaterial = function (name, scene, options) {
    options = options || {};
    var material = new BABYLON.ShaderMaterial(name, scene, { vertex: "cloudTest", fragment: "cloudTest" }, {
      attributes: ["position", "normal", "uv"],
      uniforms: ["world", "worldViewProjection", "color", "emission", "glossiness", "metallic"],
      samplers: ["textureSampler"]
    });
    material.setColor4("color", toColor4(options.color, new BABYLON.Color4(1, 1, 1, 1)));
    material.setColor4("emission", toColor4(options.emission, new BABYLON.Color4(0, 0, 0, 1)));
    material.setTexture("textureSampler", options.texture || onePixelTexture(name + "WhiteTexture", scene));
    material.setFloat("glossiness", options.glossiness === undefined ? 0.5 : options.glossiness);
    material.setFloat("metallic", options.metallic || 0);
    return material;
  };
})(window);
