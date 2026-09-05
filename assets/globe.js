/*
  Globe — vanilla-JS port of the OriginKit React component.
  Boots one three.js instance per [data-globe] container, lazy-initialized
  via IntersectionObserver. Config read from a sibling
  <script type="application/json" data-globe-config>.
  Disposes cleanly on shopify:section:unload for theme-editor live preview.
*/

import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  MeshBasicMaterial,
  Color,
  Mesh,
  Group,
  InstancedMesh,
  Matrix4,
  Raycaster,
  Vector2,
  TubeGeometry,
  CatmullRomCurve3,
  Vector3,
  CanvasTexture,
} from 'three';
import { geoEquirectangular, geoPath } from 'd3-geo';

function parseColorToRgba(input) {
  if (!input || String(input).trim() === '') return { r: 0, g: 0, b: 0, a: 0 };
  const str = String(input).trim();
  const rgbaMatch = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i);
  if (rgbaMatch) {
    return {
      r: Math.max(0, Math.min(255, parseFloat(rgbaMatch[1]))) / 255,
      g: Math.max(0, Math.min(255, parseFloat(rgbaMatch[2]))) / 255,
      b: Math.max(0, Math.min(255, parseFloat(rgbaMatch[3]))) / 255,
      a: rgbaMatch[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4]))) : 1,
    };
  }
  const hex = str.replace(/^#/, '');
  if (hex.length === 8) return { r: parseInt(hex.slice(0, 2), 16) / 255, g: parseInt(hex.slice(2, 4), 16) / 255, b: parseInt(hex.slice(4, 6), 16) / 255, a: parseInt(hex.slice(6, 8), 16) / 255 };
  if (hex.length === 6) return { r: parseInt(hex.slice(0, 2), 16) / 255, g: parseInt(hex.slice(2, 4), 16) / 255, b: parseInt(hex.slice(4, 6), 16) / 255, a: 1 };
  if (hex.length === 4) return { r: parseInt(hex[0] + hex[0], 16) / 255, g: parseInt(hex[1] + hex[1], 16) / 255, b: parseInt(hex[2] + hex[2], 16) / 255, a: parseInt(hex[3] + hex[3], 16) / 255 };
  if (hex.length === 3) return { r: parseInt(hex[0] + hex[0], 16) / 255, g: parseInt(hex[1] + hex[1], 16) / 255, b: parseInt(hex[2] + hex[2], 16) / 255, a: 1 };
  return { r: 0, g: 0, b: 0, a: 1 };
}

function mapLinear(v, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return outMin;
  return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
}

const mapSpeedUiToInternal = (ui) => (ui === 0 ? 0 : mapLinear(Math.max(0, Math.min(10, ui)), 0, 10, 0, 0.9));
const mapDensityUiToSpacing = (ui) => mapLinear(Math.max(1, Math.min(10, ui)), 1, 10, 24, 8);
const mapScaleUiToMultiplier = (ui) => mapLinear(Math.max(1, Math.min(20, ui)), 1, 20, 0.2, 2);
const mapDotSizeUiToMultiplier = (ui) => mapLinear(Math.max(1, Math.min(10, ui)), 1, 10, 0.1, 0.5);
const mapMarkerDotSizeUiToMultiplier = (ui) => mapLinear(Math.max(0, Math.min(100, ui)), 0, 100, 0.1, 2.5);
const normalizeSmoothing = (ui) => Math.max(0, Math.min(1, ui / 10));
const mapDragSpeedUiToSensitivity = (ui) => mapLinear(Math.max(0, Math.min(10, ui)), 0, 10, 0.001, 0.02);
const mapDetailToStepSize = (ui) => mapLinear(Math.max(1, Math.min(10, ui)), 1, 10, 10, 1);

function simplifyRing(ring, detail) {
  if (ring.length < 2) return ring;
  if (detail >= 10) return ring;
  const stepSize = Math.max(1, Math.floor(mapDetailToStepSize(detail)));
  const simplified = [ring[0]];
  for (let i = stepSize; i < ring.length - 1; i += stepSize) {
    simplified.push(ring[Math.min(i, ring.length - 1)]);
  }
  const last = ring[ring.length - 1];
  const first = ring[0];
  if (Math.abs(last[0] - first[0]) > 1e-4 || Math.abs(last[1] - first[1]) > 1e-4) {
    simplified.push(last);
  }
  return simplified.length >= 2 ? simplified : ring;
}

function latLngToPosition(lat, lng) {
  const latRad = lat * (Math.PI / 180);
  const lngRad = lng * (Math.PI / 180);
  return {
    x: Math.cos(latRad) * Math.sin(lngRad),
    y: Math.sin(latRad),
    z: Math.cos(latRad) * Math.cos(lngRad),
  };
}

const DEFAULTS = {
  speed: 2,
  smoothing: 8,
  dots: { color: '#ffffff', size: 5, density: 8, allDots: false },
  fill: 'dots',
  fillColor: '#ffffff',
  scale: 8,
  stopOnHover: true,
  markerConfig: { markers: [], color: '#00f7ff', size: 40 },
  direction: 'left',
  initialLatitude: 23,
  initialLongitude: -23,
  oceanColor: '#000000',
  outlineColor: '#ffffff',
  showOutline: true,
  graticuleColor: '#D4D4D4',
  showGrid: true,
  outlineWidth: 1,
  dragSpeed: 5,
  detail: 5,
};

function boot(container, rawConfig, landUrl) {
  const config = { ...DEFAULTS, ...rawConfig };
  config.dots = { ...DEFAULTS.dots, ...(rawConfig.dots || {}) };
  config.markerConfig = { ...DEFAULTS.markerConfig, ...(rawConfig.markerConfig || {}) };

  const dotColor = config.dots.color;
  const dotSize = config.dots.size;
  const density = config.dots.density;
  const allDots = config.dots.allDots;
  const smoothingN = normalizeSmoothing(config.smoothing);
  const baseRotationSpeed = mapSpeedUiToInternal(config.speed);
  const rotationSpeed = config.direction === 'left' ? -baseRotationSpeed : baseRotationSpeed;
  const dotSpacing = mapDensityUiToSpacing(density);
  const dotSizeMultiplier = mapDotSizeUiToMultiplier(dotSize);
  const markerRadiusMultiplier = mapMarkerDotSizeUiToMultiplier(config.markerConfig.size);
  const scaleMultiplier = mapScaleUiToMultiplier(config.scale);
  const gridWidth = 1;

  const containerWidth = container.clientWidth || container.offsetWidth || 800;
  const containerHeight = container.clientHeight || container.offsetHeight || 600;

  const scene = new Scene();
  const camera = new PerspectiveCamera(50, containerWidth / containerHeight, 0.1, 1e3);
  const baseRadius = 1;
  const globeRadius = baseRadius * scaleMultiplier;
  camera.position.set(0, 0, 2.5 / scaleMultiplier);
  camera.lookAt(0, 0, 0);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(containerWidth, containerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  try { renderer.outputColorSpace = 'srgb'; } catch (_) {}
  const canvas = renderer.domElement;
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.opacity = '0';
  canvas.style.visibility = 'hidden';
  container.appendChild(canvas);

  const oceanRgba = parseColorToRgba(config.oceanColor);
  const outlineRgba = parseColorToRgba(config.outlineColor);
  const dotRgba = parseColorToRgba(dotColor);
  const graticuleRgba = parseColorToRgba(config.graticuleColor);
  const fillRgba = parseColorToRgba(config.fillColor);

  const disposables = [];
  const track = (obj) => { disposables.push(obj); return obj; };

  const oceanGeometry = track(new SphereGeometry(globeRadius, 64, 64));
  const oceanMaterial = track(new MeshBasicMaterial({
    color: config.oceanColor ? new Color(config.oceanColor) : new Color(0, 0, 0),
    transparent: oceanRgba.a < 1 || oceanRgba.a === 0,
    opacity: oceanRgba.a,
  }));
  const oceanMesh = new Mesh(oceanGeometry, oceanMaterial);

  const continentOutlineGroup = new Group();
  const graticuleGroup = new Group();

  if (config.showGrid && config.graticuleColor && graticuleRgba.a > 0) {
    const graticuleMaterial = track(new MeshBasicMaterial({
      color: new Color(config.graticuleColor),
      transparent: graticuleRgba.a < 1 || graticuleRgba.a === 0,
      opacity: graticuleRgba.a,
    }));
    const gridSpacing = 15;
    const buildTube = (points) => {
      const curve = new CatmullRomCurve3(points);
      const radius = (gridWidth / 10) * 0.01;
      const geo = track(new TubeGeometry(curve, points.length * 2, radius, 8, false));
      const m = new Mesh(geo, graticuleMaterial);
      m.renderOrder = 0;
      graticuleGroup.add(m);
    };
    for (let lat = -90; lat <= 90; lat += gridSpacing) {
      const points = [];
      const segments = 64;
      for (let i = 0; i <= segments; i++) {
        const lng = (i / segments) * 360 - 180;
        const p = latLngToPosition(lat, lng);
        points.push(new Vector3(p.x * globeRadius, p.y * globeRadius, p.z * globeRadius));
      }
      if (points.length >= 2) buildTube(points);
    }
    for (let lng = -180; lng < 180; lng += gridSpacing) {
      const points = [];
      const segments = 64;
      for (let i = 0; i <= segments; i++) {
        const lat = (i / segments) * 180 - 90;
        const p = latLngToPosition(lat, lng);
        points.push(new Vector3(p.x * globeRadius, p.y * globeRadius, p.z * globeRadius));
      }
      if (points.length >= 2) buildTube(points);
    }
  }

  let dotInstances = null;
  let markerMeshes = [];

  const initialLongitudeRad = (config.initialLongitude * Math.PI) / 180;
  const initialLatitudeRad = (config.initialLatitude * Math.PI) / 180;
  const rotation = { x: initialLongitudeRad, y: initialLatitudeRad };
  const targetRotation = { x: initialLongitudeRad, y: initialLatitudeRad };
  const velocity = { x: 0, y: 0 };
  let isDragging = false;
  let isHovering = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let animationFrameId = null;
  const lerpFactor = smoothingN === 0 ? 1 : mapLinear(smoothingN, 0, 1, 0.4, 0.03);
  const velocityDecay = mapLinear(smoothingN, 0, 1, 0.7, 0.96);

  const globeGroup = new Group();
  globeGroup.rotation.y = initialLongitudeRad;
  globeGroup.rotation.x = initialLatitudeRad;
  scene.add(globeGroup);
  globeGroup.add(oceanMesh);
  if (config.showGrid && config.graticuleColor && graticuleRgba.a > 0) {
    globeGroup.add(graticuleGroup);
  }
  globeGroup.add(continentOutlineGroup);

  const updateMarkers = () => {
    markerMeshes.forEach((m) => globeGroup.remove(m));
    markerMeshes = [];
    if (!config.markerConfig.markers || config.markerConfig.markers.length === 0) return;
    const markerSize = 0.01 * markerRadiusMultiplier;
    const markerGeometry = track(new SphereGeometry(markerSize, 16, 16));
    const markerColorObj = config.markerConfig.color ? new Color(config.markerConfig.color) : new Color(1, 1, 1);
    config.markerConfig.markers.forEach((marker) => {
      if (!marker || typeof marker.lat !== 'number' || typeof marker.lng !== 'number') return;
      const color = marker.color ? new Color(marker.color) : markerColorObj;
      const size = typeof marker.size === 'number'
        ? 0.01 * mapMarkerDotSizeUiToMultiplier(marker.size)
        : markerSize;
      const geom = size !== markerSize ? track(new SphereGeometry(size, 16, 16)) : markerGeometry;
      const mat = track(new MeshBasicMaterial({ color }));
      const mesh = new Mesh(geom, mat);
      const pos = latLngToPosition(marker.lat, marker.lng);
      mesh.position.set(pos.x * globeRadius, pos.y * globeRadius, pos.z * globeRadius);
      globeGroup.add(mesh);
      markerMeshes.push(mesh);
    });
  };

  let disposed = false;

  const loadWorldData = async () => {
    try {
      const response = await fetch(landUrl);
      if (!response.ok) throw new Error('Failed to load land data');
      const landFeatures = await response.json();
      if (disposed) return;

      if (config.showOutline && config.outlineColor && outlineRgba.a > 0) {
        const outlineMaterial = track(new MeshBasicMaterial({
          color: new Color(config.outlineColor),
          transparent: outlineRgba.a < 1,
          opacity: outlineRgba.a,
          depthTest: true,
          depthWrite: true,
        }));
        landFeatures.features.forEach((feature) => {
          const featureType = (feature.properties && (feature.properties.featurecla || feature.properties.type)) || '';
          const featureName = (feature.properties && feature.properties.name) || '';
          const lowerType = String(featureType).toLowerCase();
          const lowerName = String(featureName).toLowerCase();
          if (lowerType.includes('graticule') || lowerType.includes('grid') || lowerType.includes('line')
              || lowerName.includes('graticule') || lowerName.includes('grid') || lowerName.includes('line')) {
            return;
          }
          const geometry = feature.geometry;
          if (!geometry || !geometry.coordinates) return;

          const processRing = (ring) => {
            if (ring.length < 2) return;
            const simplified = simplifyRing(ring, config.detail);
            const points = [];
            simplified.forEach((coord) => {
              const [lng, lat] = coord;
              const p = latLngToPosition(lat, lng);
              points.push(new Vector3(p.x * globeRadius, p.y * globeRadius, p.z * globeRadius));
            });
            if (points.length > 0 && points[0].distanceTo(points[points.length - 1]) > 0.001) {
              points.push(points[0].clone());
            }
            if (points.length < 2) return;
            const curve = new CatmullRomCurve3(points);
            const radius = (config.outlineWidth / 10) * 0.01;
            const tubeGeometry = track(new TubeGeometry(curve, points.length * 2, radius, 8, false));
            const tubeMesh = new Mesh(tubeGeometry, outlineMaterial);
            tubeMesh.renderOrder = 0;
            continentOutlineGroup.add(tubeMesh);
          };
          if (geometry.type === 'Polygon' && geometry.coordinates.length > 0) {
            processRing(geometry.coordinates[0]);
          } else if (geometry.type === 'MultiPolygon') {
            geometry.coordinates.forEach((polygon) => {
              if (polygon.length > 0) processRing(polygon[0]);
            });
          }
        });
      }

      const bitmapWidth = 2048;
      const bitmapHeight = 1024;
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = bitmapWidth;
      offscreenCanvas.height = bitmapHeight;
      const ctx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas not supported');
      const projection = geoEquirectangular().fitSize([bitmapWidth, bitmapHeight], { type: 'Sphere' });
      const pathGenerator = geoPath().projection(projection).context(ctx);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, bitmapWidth, bitmapHeight);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      landFeatures.features.forEach((feature) => { pathGenerator(feature); });
      ctx.fill();
      const imageData = ctx.getImageData(0, 0, bitmapWidth, bitmapHeight);
      const pixels = imageData.data;
      const isOnLand = (lng, lat) => {
        const x = Math.round(((lng + 180) / 360) * bitmapWidth) % bitmapWidth;
        const y = Math.round(((90 - lat) / 180) * bitmapHeight);
        const clampedY = Math.max(0, Math.min(bitmapHeight - 1, y));
        const idx = (clampedY * bitmapWidth + x) * 4;
        return pixels[idx] > 128;
      };

      if (config.fill === 'solid') {
        const texW = 1024;
        const texH = 512;
        const fillCanvas = document.createElement('canvas');
        fillCanvas.width = texW;
        fillCanvas.height = texH;
        const fctx = fillCanvas.getContext('2d');
        const img = fctx.createImageData(texW, texH);
        const data = img.data;
        const fr = Math.round(fillRgba.r * 255);
        const fg = Math.round(fillRgba.g * 255);
        const fb = Math.round(fillRgba.b * 255);
        const fa = Math.round((fillRgba.a || 1) * 255);
        for (let ty = 0; ty < texH; ty++) {
          for (let tx = 0; tx < texW; tx++) {
            const u = tx / texW;
            const v = ty / texH;
            let lng = (u - 0.25) * 360;
            lng = ((((lng + 180) % 360) + 360) % 360) - 180;
            const lat = (v - 0.5) * 180;
            const onLand = allDots || isOnLand(lng, lat);
            const idx = (ty * texW + tx) * 4;
            if (onLand) {
              data[idx] = fr; data[idx + 1] = fg; data[idx + 2] = fb; data[idx + 3] = fa;
            } else {
              data[idx + 3] = 0;
            }
          }
        }
        fctx.putImageData(img, 0, 0);
        const fillTexture = track(new CanvasTexture(fillCanvas));
        fillTexture.flipY = false;
        fillTexture.needsUpdate = true;
        const fillGeometry = track(new SphereGeometry(globeRadius * 1.002, 64, 64));
        const fillMaterial = track(new MeshBasicMaterial({ map: fillTexture, transparent: true }));
        dotInstances = new Mesh(fillGeometry, fillMaterial);
        globeGroup.add(dotInstances);
      } else {
        const dotCoordinates = [];
        const baseStep = dotSpacing * 0.08;
        for (let lat = -90; lat <= 90; lat += baseStep) {
          const latRad = (Math.abs(lat) * Math.PI) / 180;
          const cosLat = Math.cos(latRad);
          const lngStep = cosLat > 0.01 ? baseStep / Math.max(0.3, cosLat) : 360;
          for (let lng = -180; lng < 180; lng += lngStep) {
            if (allDots || isOnLand(lng, lat)) dotCoordinates.push([lng, lat]);
          }
        }
        if (dotCoordinates.length > 0) {
          const dotGeometry = track(new SphereGeometry(0.01 * dotSizeMultiplier, 4, 4));
          const dotMaterial = track(new MeshBasicMaterial({
            color: dotColor ? new Color(dotColor) : new Color(0.6, 0.6, 0.6),
            transparent: dotRgba.a < 1 || dotRgba.a === 0,
            opacity: dotRgba.a,
          }));
          const instanced = new InstancedMesh(dotGeometry, dotMaterial, dotCoordinates.length);
          const matrix = new Matrix4();
          for (let i = 0; i < dotCoordinates.length; i++) {
            const [lng, lat] = dotCoordinates[i];
            const pos = latLngToPosition(lat, lng);
            matrix.makeScale(1, 1, 1);
            matrix.setPosition(pos.x * globeRadius, pos.y * globeRadius, pos.z * globeRadius);
            instanced.setMatrixAt(i, matrix);
          }
          instanced.instanceMatrix.needsUpdate = true;
          dotInstances = instanced;
          globeGroup.add(dotInstances);
        }
      }

      updateMarkers();
      if (!disposed) {
        renderer.render(scene, camera);
        canvas.style.opacity = '1';
        canvas.style.visibility = 'visible';
      }
    } catch (err) {
      console.error('[Globe] Failed to load land map:', err);
      container.setAttribute('data-globe-error', '1');
    }
  };

  const animate = () => {
    let needsRender = false;
    const threshold = 0.01;
    if (!isDragging && rotationSpeed !== 0 && (!config.stopOnHover || !isHovering)) {
      targetRotation.x += rotationSpeed * 0.01;
    }
    if (!isDragging && smoothingN > 0) {
      if (Math.abs(velocity.x) > threshold || Math.abs(velocity.y) > threshold) {
        targetRotation.x += velocity.x;
        targetRotation.y += velocity.y;
        targetRotation.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotation.y));
        velocity.x *= velocityDecay;
        velocity.y *= velocityDecay;
      } else {
        velocity.x = 0;
        velocity.y = 0;
      }
    }
    const dx = targetRotation.x - rotation.x;
    const dy = targetRotation.y - rotation.y;
    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold || rotationSpeed !== 0 || isDragging) {
      rotation.x += dx * lerpFactor;
      rotation.y += dy * lerpFactor;
      rotation.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.y));
      needsRender = true;
    }
    if (needsRender || rotationSpeed !== 0 || isDragging) {
      globeGroup.rotation.y = rotation.x;
      globeGroup.rotation.x = rotation.y;
      renderer.render(scene, camera);
    }
    const hasVelocity = Math.abs(velocity.x) > threshold || Math.abs(velocity.y) > threshold;
    const hasLerpDelta = Math.abs(dx) > threshold || Math.abs(dy) > threshold;
    const needsContinue = isDragging || rotationSpeed !== 0 || hasVelocity || hasLerpDelta;
    if (needsContinue && !disposed) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      animationFrameId = null;
    }
  };
  const startAnimation = () => {
    if (animationFrameId === null && !disposed) animationFrameId = requestAnimationFrame(animate);
  };
  if (rotationSpeed !== 0) startAnimation();

  let onWindowMouseMove = null;
  let onWindowMouseUp = null;

  const handlePointerDown = (event) => {
    isDragging = true;
    velocity.x = 0;
    velocity.y = 0;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    startAnimation();
    onWindowMouseMove = (moveEvent) => {
      const sensitivity = mapDragSpeedUiToSensitivity(config.dragSpeed);
      const dx = moveEvent.clientX - lastMouseX;
      const dy = moveEvent.clientY - lastMouseY;
      targetRotation.x += dx * sensitivity;
      targetRotation.y += dy * sensitivity;
      targetRotation.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotation.y));
      velocity.x = dx * sensitivity * 0.3;
      velocity.y = dy * sensitivity * 0.3;
      lastMouseX = moveEvent.clientX;
      lastMouseY = moveEvent.clientY;
    };
    onWindowMouseUp = () => {
      document.removeEventListener('pointermove', onWindowMouseMove);
      document.removeEventListener('pointerup', onWindowMouseUp);
      onWindowMouseMove = null;
      onWindowMouseUp = null;
      isDragging = false;
    };
    document.addEventListener('pointermove', onWindowMouseMove);
    document.addEventListener('pointerup', onWindowMouseUp);
  };
  canvas.addEventListener('pointerdown', handlePointerDown);

  const raycaster = new Raycaster();
  const mouse = new Vector2();
  const handleMouseMove = (event) => {
    if (!config.stopOnHover) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(oceanMesh);
    isHovering = intersects.length > 0;
  };
  canvas.addEventListener('mousemove', handleMouseMove);

  const resizeObserver = new ResizeObserver(() => {
    const newWidth = container.clientWidth || container.offsetWidth || 800;
    const newHeight = container.clientHeight || container.offsetHeight || 600;
    if (newWidth === 0 || newHeight === 0) return;
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
    camera.position.set(0, 0, 2.5 / scaleMultiplier);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  });
  resizeObserver.observe(container);

  loadWorldData();

  return function dispose() {
    disposed = true;
    if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    if (onWindowMouseMove) document.removeEventListener('pointermove', onWindowMouseMove);
    if (onWindowMouseUp) document.removeEventListener('pointerup', onWindowMouseUp);
    resizeObserver.disconnect();
    disposables.forEach((d) => { try { d.dispose && d.dispose(); } catch (_) {} });
    try { renderer.dispose(); } catch (_) {}
    if (canvas.parentNode === container) container.removeChild(canvas);
  };
}

const instances = new WeakMap();

function initContainer(container) {
  if (instances.has(container)) return;
  const configEl = container.querySelector('script[data-globe-config]');
  if (!configEl) return;
  let config = {};
  try {
    config = JSON.parse(configEl.textContent || '{}');
  } catch (err) {
    console.error('[Globe] Invalid config JSON:', err);
    return;
  }
  const landUrl = container.getAttribute('data-globe-land-url');
  if (!landUrl) {
    console.error('[Globe] Missing data-globe-land-url on container');
    return;
  }

  let disposeGlobe = null;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        observer.disconnect();
        disposeGlobe = boot(container, config, landUrl);
        instances.set(container, () => {
          if (disposeGlobe) disposeGlobe();
        });
        return;
      }
    }
  }, { rootMargin: '200px' });
  observer.observe(container);
  instances.set(container, () => {
    observer.disconnect();
    if (disposeGlobe) disposeGlobe();
  });
}

function disposeContainer(container) {
  const dispose = instances.get(container);
  if (dispose) dispose();
  instances.delete(container);
}

function scan(root) {
  const scope = root && root.querySelectorAll ? root : document;
  scope.querySelectorAll('[data-globe]').forEach(initContainer);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => scan());
} else {
  scan();
}

document.addEventListener('shopify:section:load', (e) => {
  if (e.target) scan(e.target);
});
document.addEventListener('shopify:section:unload', (e) => {
  if (!e.target || !e.target.querySelectorAll) return;
  e.target.querySelectorAll('[data-globe]').forEach(disposeContainer);
});
