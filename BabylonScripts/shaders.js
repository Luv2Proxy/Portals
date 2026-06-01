(function (global) {
  "use strict";

  var BABYLON = global.BABYLON;
  var Portals = global.Portals = global.Portals || {};
  if (!BABYLON) throw new Error("BabylonScripts/shaders.js requires Babylon.js to be loaded first.");

  function toColor4(color, fallback) {
    if (!color) return fallback || new BABYLON.Color4(1, 1, 1, 1);
    return new BABYLON.Color4(color.r, color.g, color.b, color.a === undefined ? 1 : color.a);
  }

  function onePixelTexture(name, scene) {
    var texture = new BABYLON.RawTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, BABYLON.Engine.TEXTUREFORMAT_RGBA, scene, false, false, BABYLON.Texture.NEAREST_SAMPLINGMODE);
    texture.name = name;
    return texture;
  }

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
    "  if (t < 0.5) gl_FragColor = mix(colorA, colorB, t * 2.0);\n" +
    "  else gl_FragColor = mix(colorB, colorC, (t - 0.5) * 2.0);\n" +
    "}\n";

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

  Portals.createSliceMaterial = function (name, scene, options) {
    if (options && (options.r !== undefined || options.g !== undefined || options.b !== undefined)) options = { color: options };
    options = options || {};
    var material = new BABYLON.ShaderMaterial(name, scene, { vertex: "slice", fragment: "slice" }, {
      attributes: ["position", "normal", "uv"],
      uniforms: ["world", "worldViewProjection", "color", "sliceNormal", "sliceCentre", "sliceOffsetDst", "glossiness", "metallic"],
      samplers: ["textureSampler"]
    });
    material.setColor4("color", toColor4(options.color, new BABYLON.Color4(1, 1, 1, 1)));
    material.setTexture("textureSampler", options.texture || onePixelTexture(name + "WhiteTexture", scene));
    material.setVector3("sliceNormal", BABYLON.Vector3.Zero());
    material.setVector3("sliceCentre", BABYLON.Vector3.Zero());
    material.setFloat("sliceOffsetDst", 0);
    material.setFloat("glossiness", options.glossiness === undefined ? 0.5 : options.glossiness);
    material.setFloat("metallic", options.metallic || 0);
    return material;
  };

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
