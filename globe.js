// Hero globe, from the presentation's Three.js scene. It renders only while the
// hero is on screen and the tab is visible, so reading the page costs nothing.
(() => {
  'use strict';
  const THREE = window.THREE;
  const canvas = document.getElementById('globe');
  const hero = document.getElementById('accueil');
  if (!THREE || !canvas || !hero) return;

  const GLOBE_POINTS = 2600;
  const GLOBE_RADIUS = 2.4;
  const ARC_COUNT = 12;
  const STAR_COUNT = 500;
  const MAX_PIXEL_RATIO = 1.5;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (error) {
    console.warn('[MAS] WebGL unavailable, static hero kept:', error.message);
    return;
  }
  renderer.setPixelRatio(Math.min(MAX_PIXEL_RATIO, devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0, 0, 10);
  const world = new THREE.Group();
  scene.add(world);

  function dotTexture() {
    const source = document.createElement('canvas');
    source.width = source.height = 64;
    const context = source.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.25, 'rgba(255,255,255,.7)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(source);
  }
  const texture = dotTexture();

  function buildGlobe() {
    const positions = new Float32Array(GLOBE_POINTS * 3);
    const colors = new Float32Array(GLOBE_POINTS * 3);
    const top = new THREE.Color(0xb98ee6), bottom = new THREE.Color(0x6b3490), color = new THREE.Color();
    for (let index = 0; index < GLOBE_POINTS; index++) {
      const y = 1 - 2 * (index + 0.5) / GLOBE_POINTS, radius = Math.sqrt(1 - y * y), angle = index * 2.39996;
      positions.set([Math.cos(angle) * radius * GLOBE_RADIUS, y * GLOBE_RADIUS, Math.sin(angle) * radius * GLOBE_RADIUS], index * 3);
      color.copy(top).lerp(bottom, (y + 1) / 2);
      colors.set([color.r, color.g, color.b], index * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    world.add(new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.095, map: texture, vertexColors: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  }

  function buildCoreAndRings() {
    const core = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.45, 1)),
      new THREE.LineBasicMaterial({ color: 0x6b3490, transparent: true, opacity: 0.35 }));
    world.add(core);
    const rings = [[3.1, 0xb98ee6, 0], [3.5, 0x6b3490, 1.1], [3.9, 0xe9dcf7, 2.1]].map(([radius, hue, tilt]) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.006, 8, 220),
        new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: 0.5 }));
      ring.rotation.set(1.15 + tilt * 0.22, tilt * 0.55, 0);
      world.add(ring);
      return ring;
    });
    return { core, rings };
  }

  function randomSurfacePoint() {
    return new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(GLOBE_RADIUS);
  }

  function buildArcs() {
    const packetMaterial = new THREE.SpriteMaterial({ map: texture, color: 0x2ef2a0, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false });
    return Array.from({ length: ARC_COUNT }, (_, index) => {
      const start = randomSurfacePoint(), end = randomSurfacePoint();
      const middle = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(GLOBE_RADIUS * 1.55);
      const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
      world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)),
        new THREE.LineBasicMaterial({ color: index % 3 ? 0xb98ee6 : 0x2ef2a0, transparent: true, opacity: 0.22 })));
      const packet = new THREE.Sprite(packetMaterial.clone());
      packet.scale.setScalar(0.22);
      world.add(packet);
      return { curve, packet, position: Math.random(), speed: 0.12 + Math.random() * 0.18 };
    });
  }

  function buildStars() {
    const positions = new Float32Array(STAR_COUNT * 3);
    for (let index = 0; index < STAR_COUNT; index++) {
      positions.set([(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 26, -Math.random() * 30 - 5], index * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.12, map: texture, color: 0xc9b3e6,
      transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })));
  }

  buildGlobe();
  const { core, rings } = buildCoreAndRings();
  const arcs = buildArcs();
  buildStars();

  const pointer = { x: 0, y: 0 };
  addEventListener('mousemove', (event) => {
    pointer.x = event.clientX / innerWidth - 0.5;
    pointer.y = event.clientY / innerHeight - 0.5;
  }, { passive: true });

  function resize() {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize, { passive: true });
  resize();

  const clock = new THREE.Clock();
  let heroVisible = true, frameRequest = 0;

  function drawFrame() {
    frameRequest = 0;
    const delta = Math.min(0.05, clock.getDelta());
    world.rotation.y += delta * 0.12;
    world.rotation.x += (pointer.y * 0.3 - world.rotation.x) * 0.04;
    core.rotation.y -= delta * 0.35;
    core.rotation.z += delta * 0.2;
    rings.forEach((ring, index) => { ring.rotation.z += delta * (0.15 + index * 0.08) * (index % 2 ? -1 : 1); });
    arcs.forEach((arc) => {
      arc.position = (arc.position + delta * arc.speed) % 1;
      arc.packet.position.copy(arc.curve.getPoint(arc.position));
      arc.packet.material.opacity = Math.sin(arc.position * Math.PI);
    });
    camera.position.x += (pointer.x * 0.8 - camera.position.x) * 0.04;
    camera.position.y += (-pointer.y * 0.5 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    scheduleFrame();
  }

  function scheduleFrame() {
    if (heroVisible && !document.hidden && !frameRequest) frameRequest = requestAnimationFrame(drawFrame);
  }

  new IntersectionObserver((entries) => {
    heroVisible = entries[0].isIntersecting;
    if (heroVisible) { clock.getDelta(); scheduleFrame(); }
  }).observe(hero);
  document.addEventListener('visibilitychange', () => { clock.getDelta(); scheduleFrame(); });

  drawFrame();
  canvas.classList.add('ready');
})();
