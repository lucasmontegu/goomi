"use client";

import { Environment, Lightformer, PerformanceMonitor, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import * as THREE from "three";

import type { Pose } from "../../i18n/types";
import { getMood } from "../../lib/goomi-mood";

/** Pointer or gyro direction (-1…1 on each axis) and hero scroll progress (0…1), written by the stage. */
export type SceneInput = { x: number; y: number; scroll: number };

const FLOOR = -1.3;
const GOOMI_SIZE = 2.95;
/** The pose renders leave ~7% transparent margin under the cushion. */
const GOOMI_FOOT = 0.07;
const SCENE_POSES: Pose[] = ["wave", "celebrate", "think"];

const LIME = "#D9FF6B";
const LAVENDER = "#C8B6FF";
const MINT = "#B6F3C6";
const CUSHION = "#F2F1EC";

type Spring = { x: number; v: number };
function stepSpring(s: Spring, target: number, stiffness: number, damping: number, dt: number) {
  s.v += (-stiffness * (s.x - target) - damping * s.v) * dt;
  s.x += s.v * dt;
}

type BallDef = { color: string; r: number; home: [number, number, number]; floor?: boolean; bob?: number };
const BALLS: BallDef[] = [
  { color: LAVENDER, r: 0.36, home: [1.08, 0, 0.95], floor: true },
  { color: CUSHION, r: 0.24, home: [-1.38, 0, 0.8], floor: true },
  { color: LIME, r: 0.2, home: [-1.6, 1.15, -0.5], bob: 1.1 },
  { color: MINT, r: 0.28, home: [1.75, 1.35, -0.9], bob: 0.8 },
  { color: LAVENDER, r: 0.13, home: [-0.8, 2.45, 0.35], bob: 1.4 },
  { color: LIME, r: 0.15, home: [1.02, 2.55, -0.2], bob: 1.25 },
  { color: MINT, r: 0.11, home: [-2.05, 0.35, 0.25], bob: 1.6 },
];

type BallState = { p: THREE.Vector3; v: THREE.Vector3; sq: Spring; phase: number };

/** A soft radial blob, reused for every contact shadow. */
function useShadowTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d")!;
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(38,44,20,0.55)");
    gradient.addColorStop(0.45, "rgba(38,44,20,0.22)");
    gradient.addColorStop(1, "rgba(38,44,20,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

function ClayMaterial({ color }: { color: string }) {
  return <meshPhysicalMaterial color={color} roughness={0.58} metalness={0} sheen={0.6} sheenRoughness={0.7} sheenColor="#ffffff" envMapIntensity={0.9} />;
}

type Shared = { poked: number; burst: number };

const POSE_URLS = SCENE_POSES.map((pose) => `/goomi/poses/${pose}.png`);
function prepareTextures(loaded: THREE.Texture | THREE.Texture[]) {
  for (const texture of Array.isArray(loaded) ? loaded : [loaded]) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
  }
}

function Goomi({ shared, shadow }: { shared: RefObject<Shared>; shadow: THREE.Texture }) {
  const textures = useTexture(POSE_URLS, prepareTextures);

  const body = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const motion = useRef({ squash: { x: 1, v: 0 }, hop: { x: 0, v: 0 }, beat: getMood().beat, pending: null as Pose | null, swapAt: 0 });

  const poke = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const m = motion.current;
    m.squash.v -= 7.5;
    m.hop.v += 3.2;
    shared.current.poked += 1;
  };

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const t = clock.elapsedTime;
    const m = motion.current;
    const mood = getMood();
    if (mood.beat !== m.beat) {
      m.beat = mood.beat;
      m.squash.v -= 9;
      m.hop.v += mood.pose === "celebrate" ? 4.6 : 1.6;
      m.pending = mood.pose;
      m.swapAt = t + 0.07;
      if (mood.pose === "celebrate") shared.current.burst += 1;
    }
    if (m.pending && t >= m.swapAt && material.current) {
      const index = SCENE_POSES.indexOf(m.pending);
      if (index >= 0) material.current.map = textures[index]!;
      m.pending = null;
    }

    stepSpring(m.squash, 1 + Math.sin(t * 2.1) * 0.014, 190, 9.5, dt);
    // Hop: an upward impulse against gravity-like pull, clamped by the floor.
    m.hop.v -= 22 * dt;
    m.hop.x += m.hop.v * dt;
    if (m.hop.x < 0) {
      if (m.hop.v < -1.4) m.squash.v += m.hop.v * 1.1;
      m.hop.x = 0;
      m.hop.v = 0;
    }

    const sy = m.squash.x;
    const sx = 1 / Math.sqrt(Math.max(sy, 0.55));
    if (body.current) {
      body.current.scale.set(sx, sy, 1);
      body.current.position.y = FLOOR + m.hop.x;
    }
    if (shadowRef.current) {
      const lift = Math.min(1, m.hop.x / 1.2);
      shadowRef.current.scale.set(2.5 * (1 - lift * 0.35) * sx, 0.62 * (1 - lift * 0.35), 1);
      (shadowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - lift * 0.6);
    }
  });

  return (
    <group>
      <mesh ref={shadowRef} position={[0.05, FLOOR + 0.004, 0.02]} rotation-x={-Math.PI / 2} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={body} position={[0, FLOOR, 0]}>
        <mesh
          position={[0, GOOMI_SIZE / 2 - GOOMI_SIZE * GOOMI_FOOT, 0]}
          onPointerDown={poke}
          onPointerOver={() => (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "")}
        >
          <planeGeometry args={[GOOMI_SIZE, GOOMI_SIZE]} />
          <meshBasicMaterial ref={material} map={textures[0]} transparent toneMapped={false} depthWrite={false} alphaTest={0.02} />
        </mesh>
      </group>
    </group>
  );
}

function Balls({ shared, shadow }: { shared: RefObject<Shared>; shadow: THREE.Texture }) {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const shadows = useRef<(THREE.Mesh | null)[]>([]);
  const states = useRef<BallState[]>(
    BALLS.map((_, i) => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), sq: { x: 1, v: 0 }, phase: i * 1.7 })),
  );
  const seen = useRef(0);

  const flick = (index: number) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const state = states.current[index]!;
    const def = BALLS[index]!;
    if (def.floor) state.v.y += 5.4;
    else state.v.add(new THREE.Vector3((Math.random() - 0.5) * 3, 2.2, (Math.random() - 0.5) * 2));
    state.sq.v -= 6;
  };

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const t = clock.elapsedTime;
    const pokes = shared.current.poked;
    const scatter = pokes !== seen.current;
    seen.current = pokes;

    BALLS.forEach((def, i) => {
      const s = states.current[i]!;
      const mesh = meshes.current[i];
      if (scatter) {
        const away = new THREE.Vector3(def.home[0], 0, def.home[2]).normalize().multiplyScalar(1.6);
        s.v.add(away);
        s.v.y += def.floor ? 4 : 1.4;
      }
      // Horizontal spring home for everyone.
      s.v.x += (-14 * s.p.x - 2.6 * s.v.x) * dt;
      s.v.z += (-14 * s.p.z - 2.6 * s.v.z) * dt;
      if (def.floor) {
        s.v.y -= 16 * dt;
        s.p.y += s.v.y * dt;
        if (s.p.y < 0) {
          s.p.y = 0;
          if (s.v.y < -1) {
            s.sq.v += s.v.y * 0.9;
            s.v.y = -s.v.y * 0.52;
          } else s.v.y = 0;
        }
      } else {
        s.v.y += (-16 * s.p.y - 2.4 * s.v.y) * dt;
        s.p.y += s.v.y * dt;
      }
      s.p.x += s.v.x * dt;
      s.p.z += s.v.z * dt;
      stepSpring(s.sq, 1, 260, 11, dt);

      if (!mesh) return;
      const sy = Math.max(0.6, s.sq.x);
      const sxz = 1 / Math.sqrt(sy);
      const bob = def.floor ? 0 : Math.sin(t * (def.bob ?? 1) + s.phase) * 0.09;
      const baseY = FLOOR + def.r + (def.floor ? 0 : def.home[1]);
      mesh.position.set(def.home[0] + s.p.x, baseY + s.p.y + bob - (1 - sy) * def.r, def.home[2] + s.p.z);
      mesh.scale.set(def.r * sxz, def.r * sy, def.r * sxz);
      mesh.rotation.y = t * 0.15 + s.phase;

      const shadowMesh = shadows.current[i];
      if (shadowMesh) {
        const height = mesh.position.y - FLOOR - def.r;
        const fade = Math.max(0, 1 - height / 3.2);
        shadowMesh.position.set(mesh.position.x, FLOOR + 0.003, mesh.position.z);
        const size = def.r * (2.6 + height * 0.25);
        shadowMesh.scale.set(size, size * 0.8, 1);
        (shadowMesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * fade * fade;
      }
    });
  });

  return (
    <group>
      {BALLS.map((def, i) => (
        <group key={i}>
          <mesh ref={(node) => void (shadows.current[i] = node)} rotation-x={-Math.PI / 2} renderOrder={-1}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={shadow} transparent depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh
            ref={(node) => void (meshes.current[i] = node)}
            onPointerDown={flick(i)}
            onPointerOver={() => (document.body.style.cursor = "pointer")}
            onPointerOut={() => (document.body.style.cursor = "")}
          >
            <sphereGeometry args={[1, 48, 32]} />
            <ClayMaterial color={def.color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const PILLS = Array.from({ length: 7 }, (_, i) => ({
  color: i % 2 ? LAVENDER : LIME,
  angle: (i / 7) * Math.PI * 2 + 0.4,
  y: 1.35 + ((i * 37) % 10) / 10,
  speed: 0.12 + (i % 3) * 0.04,
  spin: 0.6 + (i % 4) * 0.25,
}));

/** Confetti capsules from the celebrate render. They orbit lazily and burst out on a correct answer. */
function Pills({ shared }: { shared: RefObject<Shared> }) {
  const group = useRef<THREE.Group>(null);
  const radius = useRef<Spring>({ x: 2.25, v: 0 });
  const seen = useRef(0);
  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const t = clock.elapsedTime;
    if (shared.current.burst !== seen.current) {
      seen.current = shared.current.burst;
      radius.current.v += 9;
    }
    stepSpring(radius.current, 2.25, 40, 5, dt);
    group.current?.children.forEach((child, i) => {
      const pill = PILLS[i]!;
      const angle = pill.angle + t * pill.speed;
      const r = radius.current.x * (0.9 + (i % 3) * 0.08);
      child.position.set(Math.cos(angle) * r, FLOOR + pill.y + Math.sin(t * 1.3 + i) * 0.12, Math.sin(angle) * r * 0.55 - 0.6);
      child.rotation.set(t * pill.spin + i, t * 0.4, angle * 2);
    });
  });
  return (
    <group ref={group}>
      {PILLS.map((pill, i) => (
        <mesh key={i}>
          <capsuleGeometry args={[0.06, 0.2, 6, 12]} />
          <ClayMaterial color={pill.color} />
        </mesh>
      ))}
    </group>
  );
}

/** Scene root: follows pointer/gyro with a spring, drifts away as the hero scrolls out. */
function Rig({ input, children }: { input: RefObject<SceneInput>; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const yaw = useRef<Spring>({ x: 0, v: 0 });
  const pitch = useRef<Spring>({ x: 0, v: 0 });
  const aspect = useThree((state) => state.size.width / Math.max(1, state.size.height));

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const { x, y, scroll } = input.current;
    stepSpring(yaw.current, x * 0.42, 38, 9, dt);
    stepSpring(pitch.current, y * 0.16, 38, 9, dt);
    const fit = Math.min(1, aspect / 1.2) * 0.96 + 0.04;
    if (group.current) {
      group.current.rotation.y = yaw.current.x;
      group.current.rotation.x = pitch.current.x + scroll * 0.35;
      group.current.position.y = scroll * 1.4;
      group.current.scale.setScalar(fit * (1 - scroll * 0.12));
    }
  });

  return <group ref={group}>{children}</group>;
}

function Stage({ input, onReady }: { input: RefObject<SceneInput>; onReady: () => void }) {
  const shared = useRef<Shared>({ poked: 0, burst: 0 });
  const shadow = useShadowTexture();
  return (
    <Rig input={input}>
      <FacingGoomi input={input} shared={shared} shadow={shadow} />
      <Balls shared={shared} shadow={shadow} />
      <Pills shared={shared} />
      <Ready onReady={onReady} />
    </Rig>
  );
}

/** Goomi is a flat render, so it counter-rotates against the rig and never shows its edge. */
function FacingGoomi({ input, shared, shadow }: { input: RefObject<SceneInput>; shared: RefObject<Shared>; shadow: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  const yaw = useRef<Spring>({ x: 0, v: 0 });
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    stepSpring(yaw.current, input.current.x * 0.42, 38, 9, dt);
    if (group.current) group.current.rotation.y = -yaw.current.x * 0.62;
  });
  return (
    <group ref={group}>
      <Goomi shared={shared} shadow={shadow} />
    </group>
  );
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(onReady));
    return () => cancelAnimationFrame(frame);
  }, [onReady]);
  return null;
}

export default function GoomiScene({
  input,
  active,
  onReady,
}: {
  input: RefObject<SceneInput>;
  active: boolean;
  onReady: () => void;
}) {
  const [dpr, setDpr] = useState(1.75);
  return (
    <Canvas
      flat
      dpr={[1, dpr]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0.55, 7.2], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ camera }) => camera.lookAt(0, 0.15, 0)}
      style={{ touchAction: "pan-y" }}
      aria-hidden
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.75)} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#FFFFFF", "#DDE6B8", 0.55]} />
      <directionalLight position={[2.5, 4.5, 3.5]} intensity={1.35} color="#FFFDF4" />
      <directionalLight position={[-3, 1.5, 2]} intensity={0.35} color={LAVENDER} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.5} position={[0, 4, 3]} scale={[8, 3, 1]} />
        <Lightformer form="circle" intensity={0.8} color="#EFFFC2" position={[-4, 1, 2]} scale={3} />
        <Lightformer form="circle" intensity={0.7} color="#E4DAFF" position={[4, 0, 1]} scale={3} />
      </Environment>
      <Suspense fallback={null}>
        <Stage input={input} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
