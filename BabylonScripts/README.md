# BabylonScripts static JavaScript port

This folder contains a static-browser Babylon.js port of every Unity C# script in `Assets/Scripts`. It does not require Node, TypeScript, npm, or a bundler; load the files with plain `<script>` tags.

## C# to JavaScript file map

| Unity C# file | Static JavaScript replacement |
| --- | --- |
| `Assets/Scripts/Core/CameraUtility.cs` | `BabylonScripts/Core/CameraUtility.js` |
| `Assets/Scripts/Core/MainCamera.cs` | `BabylonScripts/Core/MainCamera.js` |
| `Assets/Scripts/Core/Portal.cs` | `BabylonScripts/Core/Portal.js` |
| `Assets/Scripts/Core/PortalTraveller.cs` | `BabylonScripts/Core/PortalTraveller.js` |
| `Assets/Scripts/Demo/Car.cs` | `BabylonScripts/Demo/Car.js` |
| `Assets/Scripts/Demo/CloudBehaviorTest.cs` | `BabylonScripts/Demo/CloudBehaviorTest.js` |
| `Assets/Scripts/Demo/CloudCoreTest.cs` | `BabylonScripts/Demo/CloudCoreTest.js` |
| `Assets/Scripts/Demo/CloudTest.cs` | `BabylonScripts/Demo/CloudTest.js` |
| `Assets/Scripts/Demo/FPSController.cs` | `BabylonScripts/Demo/FPSController.js` |
| `Assets/Scripts/Demo/PortalPhysicsObject.cs` | `BabylonScripts/Demo/PortalPhysicsObject.js` |
| `Assets/Scripts/Demo/Spawner.cs` | `BabylonScripts/Demo/Spawner.js` |

`BabylonScripts/Core/PortalRuntime.js` is shared runtime glue for math helpers, material setters, transform conversion, and the Havok bootstrap used by the per-file replacements. `BabylonScripts/shaders.js` provides static shader material helpers for portal screens and traveller slicing.

The previous aggregate `portals.js` and `demo.js` files remain as compatibility bundles, but new code should prefer the per-original-file replacements above.

## Script order

```html
<script src="https://cdn.babylonjs.com/babylon.js"></script>
<!-- Optional, only if using Havok physics: <script src="https://cdn.babylonjs.com/havok/HavokPhysics_umd.js"></script> -->
<script src="BabylonScripts/Core/PortalRuntime.js"></script>
<script src="BabylonScripts/Core/CameraUtility.js"></script>
<script src="BabylonScripts/Core/PortalTraveller.js"></script>
<script src="BabylonScripts/Core/Portal.js"></script>
<script src="BabylonScripts/Core/MainCamera.js"></script>
<script src="BabylonScripts/shaders.js"></script>
<script src="BabylonScripts/Demo/PortalPhysicsObject.js"></script>
<script src="BabylonScripts/Demo/FPSController.js"></script>
<script src="BabylonScripts/Demo/Spawner.js"></script>
<script src="BabylonScripts/Demo/Car.js"></script>
<script src="BabylonScripts/Demo/CloudCoreTest.js"></script>
<script src="BabylonScripts/Demo/CloudBehaviorTest.js"></script>
<script src="BabylonScripts/Demo/CloudTest.js"></script>
```

## Smoke test

Open `BabylonScripts/test.html` from a local web server to load Babylon.js from the CDN and exercise the static per-file scripts:

```sh
python3 -m http.server 8000
# then browse to http://localhost:8000/BabylonScripts/test.html
```

The page creates two linked portal screens, a recursive portal renderer, and a simple moving traveller box.

## Minimal usage

```js
var portalA = new Portals.Portal(scene, portalARoot, portalAScreen, camera);
var portalB = new Portals.Portal(scene, portalBRoot, portalBScreen, camera);
portalA.link(portalB);

var traveller = new Portals.PortalTraveller(mesh, mesh);
portalA.onTravellerEnterPortal(traveller);

var renderer = new Portals.MainCameraPortalRenderer(scene, [portalA, portalB]);
renderer.attach();
```

Use `Portals.createPortalMaterial(name, scene)` for portal screens and `Portals.createSliceMaterial(name, scene, color)` for meshes that should be sliced while crossing a portal. If Havok is loaded, `Portals.enableHavokPhysics(scene)` enables Babylon's Havok plugin and `Portals.PortalPhysicsObject` preserves linear and angular velocity through teleportation.
