(function (global) {
  "use strict";

  var BABYLON = global.BABYLON;
  var Portals = global.Portals = global.Portals || {};
  if (!BABYLON) throw new Error("Core/Shaders/Slice.js requires Babylon.js to be loaded first.");

  BABYLON.Effect.ShadersStore.sliceVertexShader = "\n" +
    "precision highp float;\n" +
    "attribute vec3 position;\n" +
    "attribute vec3 normal;\n" +
    "attribute vec2 uv;\n" +
    "uniform mat4 world;\n" +
    "uniform mat4 worldViewProjection;\n" +
    "varying vec3 vWorldPosition;\n" +
    "varying vec3 vNormal;\n" +
    "varying vec2 vUV;\n" +
    "void main(void) {\n" +
    "  vec4 worldPosition = world * vec4(position, 1.0);\n" +
    "  vWorldPosition = worldPosition.xyz;\n" +
    "  vNormal = normalize((world * vec4(normal, 0.0)).xyz);\n" +
    "  vUV = uv;\n" +
    "  gl_Position = worldViewProjection * vec4(position, 1.0);\n" +
    "}\n";

  BABYLON.Effect.ShadersStore.sliceFragmentShader = "\n" +
    "precision highp float;\n" +
    "varying vec3 vWorldPosition;\n" +
    "varying vec3 vNormal;\n" +
    "varying vec2 vUV;\n" +
    "uniform sampler2D textureSampler;\n" +
    "uniform vec4 color;\n" +
    "uniform vec3 sliceNormal;\n" +
    "uniform vec3 sliceCentre;\n" +
    "uniform float sliceOffsetDst;\n" +
    "uniform float glossiness;\n" +
    "uniform float metallic;\n" +
    "void main(void) {\n" +
    "  vec3 adjustedCentre = sliceCentre + sliceNormal * sliceOffsetDst;\n" +
    "  vec3 offsetToSliceCentre = adjustedCentre - vWorldPosition;\n" +
    "  if (dot(offsetToSliceCentre, sliceNormal) < 0.0) discard;\n" +
    "  vec4 tex = texture2D(textureSampler, vUV);\n" +
    "  float light = max(0.25, dot(normalize(vNormal), normalize(vec3(0.25, 1.0, 0.5))));\n" +
    "  vec3 albedo = tex.rgb * color.rgb;\n" +
    "  vec3 spec = vec3(glossiness * 0.18 + metallic * 0.12);\n" +
    "  gl_FragColor = vec4(albedo * light + spec, tex.a * color.a);\n" +
    "}\n";

  function onePixelTexture(name, scene) {
    var texture = new BABYLON.RawTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, BABYLON.Engine.TEXTUREFORMAT_RGBA, scene, false, false, BABYLON.Texture.NEAREST_SAMPLINGMODE);
    texture.name = name;
    return texture;
  }

  function toColor4(color) {
    if (!color) return new BABYLON.Color4(1, 1, 1, 1);
    return new BABYLON.Color4(color.r, color.g, color.b, color.a === undefined ? 1 : color.a);
  }

  Portals.createSliceMaterial = function (name, scene, options) {
    if (options && (options.r !== undefined || options.g !== undefined || options.b !== undefined)) options = { color: options };
    options = options || {};
    var material = new BABYLON.ShaderMaterial(name, scene, { vertex: "slice", fragment: "slice" }, {
      attributes: ["position", "normal", "uv"],
      uniforms: ["world", "worldViewProjection", "color", "sliceNormal", "sliceCentre", "sliceOffsetDst", "glossiness", "metallic"],
      samplers: ["textureSampler"]
    });
    material.setColor4("color", toColor4(options.color));
    material.setTexture("textureSampler", options.texture || onePixelTexture(name + "WhiteTexture", scene));
    material.setVector3("sliceNormal", BABYLON.Vector3.Zero());
    material.setVector3("sliceCentre", BABYLON.Vector3.Zero());
    material.setFloat("sliceOffsetDst", 0);
    material.setFloat("glossiness", options.glossiness === undefined ? 0.5 : options.glossiness);
    material.setFloat("metallic", options.metallic || 0);
    return material;
  };
})(window);
