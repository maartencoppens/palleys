"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

type ModelViewerProps = {
  src: string;
  alt: string;
};

type LoadStatus = "loading" | "ready" | "error";

export function ModelViewer({ src, alt }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.01,
      1000,
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // --- Licht ---
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    // --- Draaien met de muis ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;

    // --- Model laden ---
    let disposed = false;
    new GLTFLoader().load(
      src,
      (gltf) => {
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }
        const model = gltf.scene;
        const size = frameModel(model, camera, controls);
        scene.add(model);
        scene.add(createPrintBed(size));
        setStatus("ready");
      },
      undefined,
      () => {
        if (!disposed) setStatus("error");
      },
    );

    // --- Render-loop ---
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    // --- Meeschalen met de container ---
    const resizeObserver = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = container;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    });
    resizeObserver.observe(container);

    // --- Opruimen ---
    return () => {
      disposed = true;
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [src]);

  return (
    <div className="relative h-[360px] overflow-hidden rounded-lg border border-line bg-surface sm:h-[480px]">
      <div
        ref={containerRef}
        role="img"
        aria-label={alt}
        className="h-full w-full cursor-grab active:cursor-grabbing"
      />
      {status !== "ready" && (
        <p
          role={status === "error" ? "alert" : undefined}
          className={`absolute inset-0 flex items-center justify-center text-sm ${status === "error" ? "text-danger" : "text-muted"}`}
        >
          {status === "loading"
            ? "3D-model laden…"
            : "Het 3D-model kon niet geladen worden."}
        </p>
      )}
      {status === "ready" && (
        <p className="pointer-events-none absolute bottom-3 left-4 text-xs text-muted">
          Slepen om te draaien, scrollen om te zoomen
        </p>
      )}
    </div>
  );
}

// Zet het model in het midden en plaats de camera op een afstand
// die past bij de grootte van het model.
function frameModel(
  model: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  model.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  camera.position.set(maxDim * 0.8, maxDim * 0.6, maxDim * 1.2);
  camera.near = maxDim / 100;
  camera.far = maxDim * 100;
  camera.updateProjectionMatrix();

  controls.target.set(0, 0, 0);
  controls.update();
  return size;
}

// Een raster onder het model, zoals een printbed: zo zie je meteen
// of het dier plat ligt en hoe het zich tot de ondergrond verhoudt.
function createPrintBed(modelSize: THREE.Vector3) {
  const maxDim = Math.max(modelSize.x, modelSize.y, modelSize.z);
  const grid = new THREE.GridHelper(maxDim * 3, 24, 0xb9c0ba, 0xdde2dd);
  grid.position.y = -modelSize.y / 2;
  return grid;
}

// Geeft het GPU-geheugen van alle meshes en lijnen (het raster),
// materialen en texturen vrij.
function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) {
      return;
    }
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}
