import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/* ================= SCENE ================= */
const scene = new THREE.Scene();

/* ================= CAMERA ================= */
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 10, 38);

/* ================= RENDERER ================= */
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById("scene").appendChild(renderer.domElement);

/* ================= CONTROLS ================= */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;

/* ================= LIGHT ================= */
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const mainLight = new THREE.PointLight(0xffcc66, 3, 120);
mainLight.position.set(0, 25, 20);
scene.add(mainLight);

/* ================= BLOOM ================= */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(
    new UnrealBloomPass(
        new THREE.Vector2(innerWidth, innerHeight),
        0.7,
        0.25,
        0.85
    )
);

/* ================= TREE ================= */
const tree = new THREE.Group();
tree.position.set(0, -2, 0);
scene.add(tree);

const balls = [];
let exploded = false;
let explodeFrames = 0;
let reviving = false;

for (let y = 0; y < 14; y += 0.45) {
    const radius = (14 - y) * 0.6;
    for (let i = 0; i < 8 + y * 2; i++) {
        const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.9, 0.6),
            emissive: 0xffaa55,
            emissiveIntensity: 1.5
        });

        const ball = new THREE.Mesh(
            new THREE.SphereGeometry(0.23, 16, 16),
            mat
        );

        const a = Math.random() * Math.PI * 2;
        const pos = new THREE.Vector3(
            Math.cos(a) * radius,
            y,
            Math.sin(a) * radius
        );

        ball.position.copy(pos);
        ball.userData = {
            origin: pos.clone(),
            vel: new THREE.Vector3(),
            freeze: false
        };

        balls.push(ball);
        tree.add(ball);
    }
}

/* ================= STAR ================= */
const star = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.7),
    new THREE.MeshStandardMaterial({
        color: 0xffdd88,
        emissive: 0xffaa00,
        emissiveIntensity: 3
    })
);
star.position.y = 15;
tree.add(star);

/* ================= SNOW ================= */
const snowGeo = new THREE.BufferGeometry();
const snowCount = 1500;
const snowPos = new Float32Array(snowCount * 3);
for (let i = 0; i < snowPos.length; i++) {
    snowPos[i] = (Math.random() - 0.5) * 100;
}
snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));

const snow = new THREE.Points(
    snowGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 })
);
scene.add(snow);

/* ================= PHOTOS ================= */
const photoGroup = new THREE.Group();
photoGroup.visible = false;
scene.add(photoGroup);

const photos = [];
let selectedPhoto = null;
let angleOffset = 0;
let photoRevealFrames = 0;

const photoUrls = [
    "images/1.jpg",
    "images/2.jpg",
    "images/3.jpg",
    "images/4.jpg",
    "images/5.jpg",
    "images/6.jpg",
    "images/7.jpg",
    "images/8.jpg",
    "images/9.jpg",
    "images/10.jpg",
    "images/11.jpg",
];

const loader = new THREE.TextureLoader();

photoUrls.forEach((url, idx) => {
    const tex = loader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(3.6, 3.6),
        new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 1,
            depthWrite: false,
            side: THREE.DoubleSide
        })
    );

    mesh.userData.angle = idx * (Math.PI * 2 / photoUrls.length);
    photos.push(mesh);
    photoGroup.add(mesh);
});

/* ================= CLICK ================= */
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener("pointerdown", e => {
    if (!photoGroup.visible) return;

    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects(photos);
    selectedPhoto = hits.length ? hits[0].object : null;
});

/* ================= DOUBLE CLICK ================= */
renderer.domElement.addEventListener("dblclick", () => {
    if (exploded) return;

    exploded = true;
    explodeFrames = 0;
    photoRevealFrames = 0;

    photoGroup.visible = true;
    document.getElementById("resetBtn").style.display = "inline-block";

    photos.forEach(p => {
        p.material.opacity = 1;
        p.scale.set(1.2, 1.2, 1.2);
    });

    balls.forEach(b => {
        const dir = b.position.clone().normalize();
        b.userData.vel.copy(dir.multiplyScalar(3 + Math.random() * 3));
        b.userData.freeze = false;
    });
});

/* ================= RESET ================= */
document.getElementById("resetBtn").addEventListener("click", () => {
    reviving = true;
    exploded = false;
    selectedPhoto = null;
    photoGroup.visible = false;
    document.getElementById("resetBtn").style.display = "none";
});

/* ================= ANIMATE ================= */
function animate() {
    requestAnimationFrame(animate);

    star.rotation.y += 0.05;

    balls.forEach((b, i) => {
        b.material.emissiveIntensity =
            1.5 + Math.sin(Date.now() * 0.006 + i) * 1.2;

        if (exploded && !b.userData.freeze) b.position.add(b.userData.vel);
        if (reviving) b.position.lerp(b.userData.origin, 0.08);
    });

    if (exploded && ++explodeFrames > 35)
        balls.forEach(b => b.userData.freeze = true);

    if (reviving) {
        if (balls.every(b => b.position.distanceTo(b.userData.origin) < 0.05))
            reviving = false;
    }

    /* ===== PHOTOS ===== */
    if (photoGroup.visible) {
        angleOffset += 0.002;
        photoRevealFrames++;

        photos.forEach(p => {
            const r = 9;

            // GIAI ĐOẠN HIỆN RÕ BAN ĐẦU
            if (photoRevealFrames < 40) {
                const x = Math.cos(p.userData.angle) * r;
                const z = Math.sin(p.userData.angle) * r;

                p.position.lerp(new THREE.Vector3(x, 6, z), 0.1);
                p.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.1);
                p.material.opacity = 1;
                p.lookAt(camera.position);
                return;
            }

            // LOGIC CŨ
            if (p === selectedPhoto) {
                p.position.lerp(new THREE.Vector3(0, 7, 8), 0.12);
                p.scale.lerp(new THREE.Vector3(2.8, 2.8, 2.8), 0.12);
                p.material.opacity = 1;
                p.lookAt(camera.position);
            } else {
                p.userData.angle += 0.002;
                const x = Math.cos(p.userData.angle + angleOffset) * r;
                const z = Math.sin(p.userData.angle + angleOffset) * r;

                p.position.lerp(new THREE.Vector3(x, 6, z), 0.08);
                p.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08);
                p.material.opacity = selectedPhoto ? 0.2 : 0.75;
                p.lookAt(camera.position);
            }
        });
    }

    /* ===== SNOW ===== */
    const pos = snow.geometry.attributes.position;
    for (let i = 1; i < pos.array.length; i += 3) {
        pos.array[i] -= 0.12;
        if (pos.array[i] < -50) pos.array[i] = 50;
    }
    pos.needsUpdate = true;

    tree.rotation.y += exploded ? 0.0005 : 0.003;
    photoGroup.rotation.y += 0.0015;

    controls.update();
    composer.render();
}
animate();

/* ================= RESIZE ================= */
addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
});


/* ================= Voice ================= */
// Lấy nút music
const musicBtn = document.getElementById("musicBtn");

// Tạo audio
const audio = new Audio("images/voice/voice.m4a"); // đường dẫn tới file âm thanh

// Khi bấm nút
musicBtn.addEventListener("click", () => {
    audio.currentTime = 0; // phát từ đầu nếu đã chơi trước đó
    audio.play(); // phát nhạc 1 lần
});
