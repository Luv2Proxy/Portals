(function (global) {
  "use strict";
  var BABYLON = global.BABYLON;
  var Portals = global.Portals = global.Portals || {};
  if (!BABYLON) throw new Error("CloudTest.js requires Babylon.js.");
  var Vector3 = BABYLON.Vector3;
  function CloudTest(scene, transform, cloudPrefab, cloudCorePrefab, options) {
    options = options || {};
    this.scene = scene;
    this.transform = transform;
    this.cloudPrefab = cloudPrefab;
    this.cloudCorePrefab = cloudCorePrefab;
    this.numViewDirections = options.numViewDirections || 100;
    this.numClouds = options.numClouds || 10;
    this.cloudSpawnSeed = options.cloudSpawnSeed || 1;
    this.randomizeCloudSeed = !!options.randomizeCloudSeed;
    this.spawnRadius = options.spawnRadius || 10;
    this.startHeight = options.startHeight || 0;
  }
  CloudTest.prototype.start = function () {
    var goldenRatio = (1 + Math.sqrt(5)) / 2;
    var angleIncrement = Math.PI * 2 * goldenRatio;
    for (var i = 0; i < this.numViewDirections; i++) this.spawn(this.cloudPrefab, this.direction(i / this.numViewDirections, angleIncrement * i));
    var rng = mulberry32(this.randomizeCloudSeed ? Math.floor(Math.random() * 20000) - 10000 : this.cloudSpawnSeed);
    for (var j = 0; j < this.numClouds; j++) this.spawn(this.cloudCorePrefab, this.direction(rng(), angleIncrement * j));
  };
  CloudTest.prototype.direction = function (t, azimuth) {
    var inclination = Math.acos(1 - (1 - this.startHeight) * t);
    return new Vector3(Math.sin(inclination) * Math.sin(azimuth), Math.cos(inclination), Math.sin(inclination) * Math.cos(azimuth));
  };
  CloudTest.prototype.spawn = function (prefab, direction) {
    var instance = prefab.clone(prefab.name + "_cloud", null);
    if (!instance) throw new Error("Unable to clone " + prefab.name);
    instance.position.copyFrom(this.transform.position.add(direction.scale(this.spawnRadius)));
    instance.parent = this.transform;
    instance.setEnabled(true);
    return instance;
  };
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  Portals.CloudTest = CloudTest;
})(window);
