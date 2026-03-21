/**
 * cd-scene.js — Three.js 3D CD renderer
 * Creates a spinning disc with album art texture, lighting, and pointer interaction.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.min.js';

export function initCDScene(mount, config) {
  const width = () => mount.clientWidth;
  const height = () => mount.clientHeight;

  /* Renderer */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width(), height());
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  /* Scene */
  const scene = new THREE.Scene();

  /* Camera */
  const camera = new THREE.PerspectiveCamera(45, width() / height(), 0.1, 100);
  camera.position.set(0, 2.5, 5);
  camera.lookAt(0, 0, 0);

  /* Lighting */
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(3, 5, 4);
  scene.add(directional);

  const rim = new THREE.PointLight(0xffffff, 0.3);
  rim.position.set(-3, 2, -2);
  scene.add(rim);

  /* CD Disc */
  const discRadius = 2;
  const discThickness = 0.06;
  const segments = 64;

  const discGeometry = new THREE.CylinderGeometry(
    discRadius, discRadius, discThickness, segments
  );

  /* Materials */
  const loader = new THREE.TextureLoader();
  const topMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.3,
    roughness: 0.4,
  });

  /* Load CD art if available */
  if (config.cdArt) {
    loader.load(config.cdArt, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      topMaterial.map = texture;
      topMaterial.needsUpdate = true;
    });
  }

  /* Iridescent disc surface for bottom/rim */
  const discMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.9,
    roughness: 0.1,
  });

  /* Apply different materials to faces: [rim, top, bottom] */
  const materials = [discMaterial, topMaterial, discMaterial];
  const disc = new THREE.Mesh(discGeometry, materials);

  /* Center hole */
  const holeGeometry = new THREE.CylinderGeometry(0.2, 0.2, discThickness + 0.01, 32);
  const holeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.8 });
  const hole = new THREE.Mesh(holeGeometry, holeMaterial);

  /* Ring around hole */
  const ringGeometry = new THREE.TorusGeometry(0.22, 0.02, 8, 32);
  const ringMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.1 });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;

  /* Group */
  const cdGroup = new THREE.Group();
  cdGroup.add(disc);
  cdGroup.add(hole);
  cdGroup.add(ring);

  /* Initial tilt */
  cdGroup.rotation.x = THREE.MathUtils.degToRad(15);

  scene.add(cdGroup);

  /* State */
  const state = {
    rotationSpeed: 0.008,
    targetSpeed: 0.008,
    tiltX: 0,
    tiltZ: 0,
    pointerDown: false,
    running: true,
    disposed: false,
  };

  /* Animation */
  function animate() {
    if (state.disposed) return;
    if (!state.running) {
      requestAnimationFrame(animate);
      return;
    }

    /* Ease rotation speed */
    state.rotationSpeed += (state.targetSpeed - state.rotationSpeed) * 0.05;

    /* Rotate disc */
    cdGroup.rotation.y += state.rotationSpeed;

    /* Subtle tilt response */
    const baseTilt = THREE.MathUtils.degToRad(15);
    cdGroup.rotation.x += (baseTilt + state.tiltX - cdGroup.rotation.x) * 0.05;
    cdGroup.rotation.z += (state.tiltZ - cdGroup.rotation.z) * 0.05;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();

  /* Resize */
  const resizeObserver = new ResizeObserver(() => {
    camera.aspect = width() / height();
    camera.updateProjectionMatrix();
    renderer.setSize(width(), height());
  });
  resizeObserver.observe(mount);

  /* Visibility */
  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      state.running = entries[0].isIntersecting;
    },
    { threshold: 0.1 }
  );
  intersectionObserver.observe(mount);

  /* Public API */
  return {
    state,

    setPointerPosition(nx, ny) {
      /* nx, ny normalized -1 to 1 */
      state.tiltX = ny * THREE.MathUtils.degToRad(5);
      state.tiltZ = nx * THREE.MathUtils.degToRad(5);
    },

    accelerate() {
      state.targetSpeed = 0.04;
    },

    decelerate() {
      state.targetSpeed = 0.008;
    },

    dispose() {
      state.disposed = true;
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    },
  };
}
