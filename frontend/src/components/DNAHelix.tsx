import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ParticleDNA = () => {
  const parentRef = useRef<THREE.Group>(null);
  const flowRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const numParticles = 15000;
    const positions = new Float32Array(numParticles * 3);
    const colors = new Float32Array(numParticles * 3);

    const turns = 10;
    const height = 40;
    const radius = 2.5;
    const rungsPerTurn = 10;
    const totalRungs = turns * rungsPerTurn;

    const color1 = new THREE.Color('#00ffff'); // Cyan
    const color2 = new THREE.Color('#0055ff'); // Blue
    const color3 = new THREE.Color('#ffffff'); // White for highlights

    for (let i = 0; i < numParticles; i++) {
      let x = 0, y = 0, z = 0;
      let color = color1;

      const type = Math.random();
      
      if (type < 0.6) {
        // Strands (60% of particles)
        const t = Math.random();
        const angle = t * Math.PI * 2 * turns;
        y = (t - 0.5) * height;
        
        const isStrand1 = Math.random() > 0.5;
        const baseAngle = isStrand1 ? angle : angle + Math.PI;
        
        // Add noise to make it look like a particle cloud
        const noise = 0.4;
        x = Math.cos(baseAngle) * radius + (Math.random() - 0.5) * noise;
        z = Math.sin(baseAngle) * radius + (Math.random() - 0.5) * noise;
        
        color = isStrand1 ? color1 : color2;
        if (Math.random() < 0.05) color = color3; // occasional bright particle
      } else if (type < 0.9) {
        // Rungs/Bridges (30% of particles)
        const rungIndex = Math.floor(Math.random() * totalRungs);
        const t = rungIndex / totalRungs;
        const angle = t * Math.PI * 2 * turns;
        const rungY = (t - 0.5) * height;
        
        const bridgeT = Math.random(); // position along the rung
        
        const x1 = Math.cos(angle) * radius;
        const z1 = Math.sin(angle) * radius;
        const x2 = Math.cos(angle + Math.PI) * radius;
        const z2 = Math.sin(angle + Math.PI) * radius;
        
        const noise = 0.25;
        x = x1 + (x2 - x1) * bridgeT + (Math.random() - 0.5) * noise;
        y = rungY + (Math.random() - 0.5) * noise;
        z = z1 + (z2 - z1) * bridgeT + (Math.random() - 0.5) * noise;
        
        color = new THREE.Color().lerpColors(color1, color2, bridgeT);
      } else {
        // Ambient floating particles near DNA (10%)
        x = (Math.random() - 0.5) * radius * 5;
        y = (Math.random() - 0.5) * height;
        z = (Math.random() - 0.5) * radius * 5;
        color = color2;
        color.multiplyScalar(0.6); // dimmer
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return { positions, colors };
  }, []);

  useFrame((state, delta) => {
    if (flowRef.current) {
      // Base rotation
      flowRef.current.rotation.y -= delta * 0.1;
      
      // Seamless vertical loop along its local Y axis
      const pitch = 4; // height / turns = 40 / 10 = 4
      const speed = 0.5;
      flowRef.current.position.y = (state.clock.elapsedTime * speed) % pitch;
    }

    if (parentRef.current) {
      // Mouse interaction - tilt the DNA slightly based on mouse
      // Base diagonal tilt
      const baseZ = -Math.PI / 4; // 45 degrees diagonal
      const targetX = state.pointer.y * 0.25;
      const targetZ = baseZ + -state.pointer.x * 0.25;
      
      parentRef.current.rotation.x = THREE.MathUtils.lerp(parentRef.current.rotation.x, targetX, 0.05);
      parentRef.current.rotation.z = THREE.MathUtils.lerp(parentRef.current.rotation.z, targetZ, 0.05);
    }
  });

  return (
    <group ref={parentRef}>
      <group ref={flowRef}>
        <points ref={pointsRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[positions, 3]}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[colors, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.06}
            vertexColors
            transparent
            opacity={0.8}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      </group>
    </group>
  );
};

const AmbientDust = () => {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const numParticles = 3000;
    const positions = new Float32Array(numParticles * 3);
    const colors = new Float32Array(numParticles * 3);

    const color = new THREE.Color('#00aaff');

    for (let i = 0; i < numParticles; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 5;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return { positions, colors };
  }, []);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y -= delta * 0.02;
      pointsRef.current.rotation.x += delta * 0.01;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.3}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

const CameraController = () => {
  useFrame((state) => {
    // Parallax effect based on mouse pointer
    const targetX = state.pointer.x * 5;
    const targetY = state.pointer.y * 5;
    
    // Smoothly interpolate camera position towards target
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.03);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.03);
    
    // Always look at the center
    state.camera.lookAt(0, 0, 0);
  });
  return null;
};

export default function DNAHelixBackground() {
  return (
    <div className="absolute inset-0 z-0 bg-[#020813]">
      <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
        <fog attach="fog" args={['#edf0f4', 5, 25]} />
        <ParticleDNA />
        <AmbientDust />
        <CameraController />
      </Canvas>
    </div>
  );
}
