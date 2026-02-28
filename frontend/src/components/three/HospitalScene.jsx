import { useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';
import { Text } from '@react-three/drei';
import DepartmentRoom from './DepartmentRoom';

const DEPT_POSITIONS = [
    // Row 1 (north side) — x, y, z
    { name: 'Emergency', pos: [-14, 0, -6] },
    { name: 'ICU', pos: [0, 0, -6] },
    { name: 'Cardiology', pos: [14, 0, -6] },
    // Row 2 (south side) — rotated 180° so doors face corridor
    { name: 'Orthopedics', pos: [-14, 0, 6], rot: [0, Math.PI, 0] },
    { name: 'Pediatrics', pos: [0, 0, 6], rot: [0, Math.PI, 0] },
    { name: 'Neurology', pos: [14, 0, 6], rot: [0, Math.PI, 0] },
];

// Dependencies rendered as glowing lines between departments
function DependencyLines({ dependencies }) {
    const posMap = {};
    DEPT_POSITIONS.forEach(d => {
        posMap[d.name] = d.pos;
    });

    return dependencies.map((dep, i) => {
        const from = posMap[dep.from];
        const to = posMap[dep.to];
        if (!from || !to) return null;

        const color = dep.type === 'escalation' ? '#ef4444'
            : dep.type === 'referral' ? '#f59e0b'
                : '#3b82f6';

        const points = [
            [from[0], 0.3, from[2] > 0 ? from[2] - 3 : from[2] + 3],
            [from[0], 0.3, 0],
            [to[0], 0.3, 0],
            [to[0], 0.3, to[2] > 0 ? to[2] - 3 : to[2] + 3],
        ];

        return (
            <group key={i}>
                <line>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={points.length}
                            array={new Float32Array(points.flat())}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial
                        color={color}
                        transparent
                        opacity={dep.strength * 0.8}
                        linewidth={2}
                    />
                </line>
                {/* Label at midpoint */}
                <Text
                    position={[(from[0] + to[0]) / 2, 0.6, 0]}
                    fontSize={0.2}
                    color={color}
                    anchorX="center"
                    anchorY="middle"
                >
                    {dep.type}
                </Text>
            </group>
        );
    });
}

export default function HospitalScene({ data }) {
    const deptMap = useMemo(() => {
        const map = {};
        if (data?.departments) {
            data.departments.forEach(d => { map[d.department] = d; });
        }
        return map;
    }, [data]);

    return (
        <group>
            {/* Ground / floor */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                    <planeGeometry args={[60, 40]} />
                    <meshStandardMaterial color="#cbd5e1" roughness={0.95} />
                </mesh>
            </RigidBody>

            {/* Central corridor floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
                <planeGeometry args={[42, 7]} />
                <meshStandardMaterial color="#93c5fd" roughness={0.8} transparent opacity={0.3} />
            </mesh>

            {/* Corridor walls (outer boundary) */}
            <RigidBody type="fixed" position={[-22, 1.5, 0]} colliders="cuboid">
                <mesh>
                    <boxGeometry args={[0.3, 3, 7]} />
                    <meshStandardMaterial color="#94a3b8" roughness={0.6} />
                </mesh>
            </RigidBody>
            <RigidBody type="fixed" position={[22, 1.5, 0]} colliders="cuboid">
                <mesh>
                    <boxGeometry args={[0.3, 3, 7]} />
                    <meshStandardMaterial color="#94a3b8" roughness={0.6} />
                </mesh>
            </RigidBody>

            {/* Corridor lights */}
            {[-14, -7, 0, 7, 14].map((x, i) => (
                <group key={`clight-${i}`}>
                    <pointLight position={[x, 2.8, 0]} color="#fef9c3" intensity={1.0} distance={12} />
                    {/* Light fixture */}
                    <mesh position={[x, 2.95, 0]}>
                        <cylinderGeometry args={[0.15, 0.2, 0.05]} />
                        <meshStandardMaterial color="#fef9c3" emissive="#fef9c3" emissiveIntensity={0.5} />
                    </mesh>
                </group>
            ))}

            {/* Hospital name on corridor */}
            <Text
                position={[0, 2.5, -3.4]}
                fontSize={0.5}
                color="#0f766e"
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
            >
                HOSPITAL DIGITAL TWIN
            </Text>

            {/* Department rooms */}
            {DEPT_POSITIONS.map(({ name, pos, rot }) => {
                const deptData = deptMap[name];
                if (!deptData) return null;
                return (
                    <DepartmentRoom
                        key={name}
                        department={deptData}
                        position={pos}
                        rotation={rot || [0, 0, 0]}
                    />
                );
            })}

            {/* Dependency flow lines */}
            {data?.dependencies && (
                <DependencyLines dependencies={data.dependencies} />
            )}

            {/* Outer boundary walls */}
            <RigidBody type="fixed" position={[0, 1.5, -12]} colliders="cuboid">
                <mesh visible={false}><boxGeometry args={[60, 3, 0.3]} /></mesh>
            </RigidBody>
            <RigidBody type="fixed" position={[0, 1.5, 12]} colliders="cuboid">
                <mesh visible={false}><boxGeometry args={[60, 3, 0.3]} /></mesh>
            </RigidBody>
            <RigidBody type="fixed" position={[-25, 1.5, 0]} colliders="cuboid">
                <mesh visible={false}><boxGeometry args={[0.3, 3, 24]} /></mesh>
            </RigidBody>
            <RigidBody type="fixed" position={[25, 1.5, 0]} colliders="cuboid">
                <mesh visible={false}><boxGeometry args={[0.3, 3, 24]} /></mesh>
            </RigidBody>
        </group>
    );
}
