# BabylonScripts static JavaScript port

This folder contains a static-browser Babylon.js port of every Unity C# script in `Assets/Scripts`. It does not require Node, TypeScript, npm, or a bundler; load the files with plain `<script>` tags.

## Unity source to JavaScript file map

| Unity source file | Static JavaScript replacement |
| --- | --- |
| `Assets/Scripts/Core/CameraUtility.cs` | `BabylonScripts/Core/CameraUtility.js` |
| `Assets/Scripts/Core/MainCamera.cs` | `BabylonScripts/Core/MainCamera.js` |
| `Assets/Scripts/Core/Portal.cs` | `BabylonScripts/Core/Portal.js` |
| `Assets/Scripts/Core/PortalTraveller.cs` | `BabylonScripts/Core/PortalTraveller.js` |
| `Assets/Scripts/Core/Shaders/Portal.shader` | `BabylonScripts/Core/Shaders/Portal.js` |
| `Assets/Scripts/Core/Shaders/Slice.shader` | `BabylonScripts/Core/Shaders/Slice.js` |
| `Assets/Scripts/Demo/Car.cs` | `BabylonScripts/Demo/Car.js` |
| `Assets/Scripts/Demo/CloudBehaviorTest.cs` | `BabylonScripts/Demo/CloudBehaviorTest.js` |
| `Assets/Scripts/Demo/CloudCoreTest.cs` | `BabylonScripts/Demo/CloudCoreTest.js` |
| `Assets/Scripts/Demo/CloudTest.cs` | `BabylonScripts/Demo/CloudTest.js` |
| `Assets/Scripts/Demo/FPSController.cs` | `BabylonScripts/Demo/FPSController.js` |
| `Assets/Scripts/Demo/PortalPhysicsObject.cs` | `BabylonScripts/Demo/PortalPhysicsObject.js` |
| `Assets/Scripts/Demo/Spawner.cs` | `BabylonScripts/Demo/Spawner.js` |
| `Assets/Scripts/Demo/Shaders/CloudTest.shader` | `BabylonScripts/Demo/Shaders/CloudTest.js` |
| `Assets/Scripts/Demo/Shaders/SkyDome.shader` | `BabylonScripts/Demo/Shaders/SkyDome.js` |

`BabylonScripts/Core/PortalRuntime.js` is shared runtime glue for math helpers, material setters, transform conversion, and the Havok bootstrap used by the per-file replacements. The shader replacement files register Babylon `ShaderMaterial` programs and material helper functions for the original Unity shaders.

The previous aggregate `portals.js`, `demo.js`, and `shaders.js` files remain as compatibility bundles, but new code should prefer the per-original-file replacements above.

## Script order

```html
<script src="https://cdn.babylonjs.com/babylon.js"></script>
<!-- Optional, only if using Havok physics: <script src="https://cdn.babylonjs.com/havok/HavokPhysics_umd.js"></script> -->
<script src="BabylonScripts/Core/PortalRuntime.js"></script>
<script src="BabylonScripts/Core/CameraUtility.js"></script>
<script src="BabylonScripts/Core/PortalTraveller.js"></script>
<script src="BabylonScripts/Core/Portal.js"></script>
<script src="BabylonScripts/Core/MainCamera.js"></script>
<script src="BabylonScripts/Core/Shaders/Portal.js"></script>
<script src="BabylonScripts/Core/Shaders/Slice.js"></script>
<script src="BabylonScripts/Demo/Shaders/CloudTest.js"></script>
<script src="BabylonScripts/Demo/Shaders/SkyDome.js"></script>
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

The page creates two linked portal screens, a recursive portal renderer, a simple moving traveller box, and demo geometry using the ported SkyDome and CloudTest shaders.

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

Use `Portals.createPortalMaterial(name, scene)` for portal screens, `Portals.createSliceMaterial(name, scene, options)` for meshes that should be sliced while crossing a portal, `Portals.createCloudTestMaterial(name, scene, options)` for the demo cloud material, and `Portals.createSkyDomeMaterial(name, scene, options)` for the demo sky gradient. If Havok is loaded, `Portals.enableHavokPhysics(scene)` enables Babylon's Havok plugin and `Portals.PortalPhysicsObject` preserves linear and angular velocity through teleportation.
