import { useMemo } from 'react';
import { Html, Text } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

const STATUS_COLORS = {
    Critical: '#ef4444',
    Warning: '#f59e0b',
    Normal: '#3b82f6',
    Low: '#22c55e',
};

const WALL_HEIGHT = 3;
const WALL_THICKNESS = 0.2;
const DOOR_WIDTH = 2;

function Wall({ position, size, color }) {
    return (
        <RigidBody type="fixed" position={position} colliders="cuboid">
            <mesh castShadow receiveShadow>
                <boxGeometry args={size} />
                <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
            </mesh>
        </RigidBody>
    );
}

function Bed({ position }) {
    return (
        <group position={position}>
            {/* Frame */}
            <mesh position={[0, 0.3, 0]} castShadow>
                <boxGeometry args={[0.9, 0.15, 1.8]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
            </mesh>
            {/* Mattress */}
            <mesh position={[0, 0.45, 0]} castShadow>
                <boxGeometry args={[0.8, 0.15, 1.7]} />
                <meshStandardMaterial color="#bfdbfe" roughness={0.8} />
            </mesh>
            {/* Pillow */}
            <mesh position={[0, 0.55, -0.65]} castShadow>
                <boxGeometry args={[0.5, 0.1, 0.3]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.9} />
            </mesh>
            {/* Legs */}
            {[[-0.35, 0, -0.75], [0.35, 0, -0.75], [-0.35, 0, 0.75], [0.35, 0, 0.75]].map((p, i) => (
                <mesh key={i} position={[p[0], 0.15, p[2]]}>
                    <cylinderGeometry args={[0.03, 0.03, 0.3]} />
                    <meshStandardMaterial color="#94a3b8" metalness={0.5} />
                </mesh>
            ))}
        </group>
    );
}

function StaffDesk({ position }) {
    return (
        <group position={position}>
            {/* Desk top */}
            <mesh position={[0, 0.7, 0]} castShadow>
                <boxGeometry args={[0.8, 0.05, 0.5]} />
                <meshStandardMaterial color="#d4a574" roughness={0.6} />
            </mesh>
            {/* Legs */}
            {[[-0.35, 0, -0.2], [0.35, 0, -0.2], [-0.35, 0, 0.2], [0.35, 0, 0.2]].map((p, i) => (
                <mesh key={i} position={[p[0], 0.35, p[2]]}>
                    <cylinderGeometry args={[0.025, 0.025, 0.7]} />
                    <meshStandardMaterial color="#78716c" metalness={0.3} />
                </mesh>
            ))}
            {/* Monitor */}
            <mesh position={[0, 1.0, -0.15]} castShadow>
                <boxGeometry args={[0.4, 0.3, 0.02]} />
                <meshStandardMaterial color="#1e293b" roughness={0.3} />
            </mesh>
            {/* Chair */}
            <mesh position={[0, 0.4, 0.5]}>
                <cylinderGeometry args={[0.2, 0.2, 0.05]} />
                <meshStandardMaterial color="#475569" />
            </mesh>
        </group>
    );
}

function QueueIndicator({ position, count, color }) {
    const bars = Math.min(count, 10);
    return (
        <group position={position}>
            {Array.from({ length: bars }).map((_, i) => (
                <mesh key={i} position={[i * 0.2 - (bars * 0.1), 0.5, 0]}>
                    <boxGeometry args={[0.12, Math.min(count / 5, 2), 0.12]} />
                    <meshStandardMaterial
                        color={color}
                        transparent
                        opacity={0.7}
                        emissive={color}
                        emissiveIntensity={0.3}
                    />
                </mesh>
            ))}
        </group>
    );
}

export default function DepartmentRoom({ department, position, rotation = [0, 0, 0] }) {
    const {
        department: name,
        status,
        load_pct,
        active_cases,
        resolved_cases,
        staff_count,
        avg_overtime,
        queue_length,
    } = department;

    const color = STATUS_COLORS[status] || STATUS_COLORS.Normal;
    const roomWidth = 8;
    const roomDepth = 6;

    const floorMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color,
        roughness: 0.9,
        metalness: 0.05,
        transparent: true,
        opacity: 0.4,
    }), [color]);

    const bedCount = Math.min(Math.ceil(active_cases / 30), 6);
    const deskCount = Math.min(staff_count, 4);

    const beds = useMemo(() => {
        const items = [];
        for (let i = 0; i < bedCount; i++) {
            const row = Math.floor(i / 3);
            const col = i % 3;
            items.push({
                pos: [
                    -roomWidth / 2 + 1.5 + col * 2.2,
                    0,
                    -roomDepth / 2 + 1.5 + row * 2.5,
                ],
            });
        }
        return items;
    }, [bedCount, roomWidth, roomDepth]);

    const desks = useMemo(() => {
        const items = [];
        for (let i = 0; i < deskCount; i++) {
            items.push({
                pos: [
                    roomWidth / 2 - 1.2,
                    0,
                    -roomDepth / 2 + 1.0 + i * 1.3,
                ],
            });
        }
        return items;
    }, [deskCount, roomWidth, roomDepth]);

    return (
        <group position={position} rotation={rotation}>
            {/* Floor */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[roomWidth, roomDepth]} />
                <primitive object={floorMaterial} />
            </mesh>

            {/* Glow on floor for critical */}
            {status === 'Critical' && (
                <pointLight position={[0, 0.5, 0]} color={color} intensity={2} distance={8} />
            )}

            {/* Back wall */}
            <Wall
                position={[0, WALL_HEIGHT / 2, -roomDepth / 2]}
                size={[roomWidth, WALL_HEIGHT, WALL_THICKNESS]}
                color="#e2e8f0"
            />

            {/* Left wall */}
            <Wall
                position={[-roomWidth / 2, WALL_HEIGHT / 2, 0]}
                size={[WALL_THICKNESS, WALL_HEIGHT, roomDepth]}
                color="#f1f5f9"
            />

            {/* Right wall */}
            <Wall
                position={[roomWidth / 2, WALL_HEIGHT / 2, 0]}
                size={[WALL_THICKNESS, WALL_HEIGHT, roomDepth]}
                color="#f1f5f9"
            />

            {/* Front wall with door opening (two wall segments) */}
            <Wall
                position={[-(roomWidth / 4 + DOOR_WIDTH / 4), WALL_HEIGHT / 2, roomDepth / 2]}
                size={[roomWidth / 2 - DOOR_WIDTH / 2, WALL_HEIGHT, WALL_THICKNESS]}
                color="#e2e8f0"
            />
            <Wall
                position={[(roomWidth / 4 + DOOR_WIDTH / 4), WALL_HEIGHT / 2, roomDepth / 2]}
                size={[roomWidth / 2 - DOOR_WIDTH / 2, WALL_HEIGHT, WALL_THICKNESS]}
                color="#e2e8f0"
            />

            {/* Door frame top */}
            <mesh position={[0, WALL_HEIGHT - 0.15, roomDepth / 2]}>
                <boxGeometry args={[DOOR_WIDTH + 0.2, 0.3, WALL_THICKNESS + 0.1]} />
                <meshStandardMaterial color="#64748b" metalness={0.3} />
            </mesh>

            {/* Department name sign above door */}
            <Text
                position={[0, WALL_HEIGHT + 0.3, roomDepth / 2 + 0.2]}
                fontSize={0.35}
                color={color}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000000"
            >
                {name}
            </Text>

            {/* Status indicator light */}
            <mesh position={[0, WALL_HEIGHT + 0.8, roomDepth / 2 + 0.1]}>
                <sphereGeometry args={[0.12]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={status === 'Critical' ? 2 : 0.8}
                />
            </mesh>

            {/* Room light */}
            <pointLight
                position={[0, WALL_HEIGHT - 0.5, 0]}
                color="#fef9c3"
                intensity={1.5}
                distance={10}
                castShadow
            />

            {/* Beds */}
            {beds.map((bed, i) => (
                <Bed key={`bed-${i}`} position={bed.pos} />
            ))}

            {/* Staff desks */}
            {desks.map((desk, i) => (
                <StaffDesk key={`desk-${i}`} position={desk.pos} />
            ))}

            {/* Queue indicator */}
            <QueueIndicator
                position={[-roomWidth / 2 + 0.8, 0, roomDepth / 2 - 0.8]}
                count={queue_length}
                color={color}
            />

            {/* Floating data label */}
            <Html
                position={[0, WALL_HEIGHT + 1.5, 0]}
                center
                distanceFactor={12}
                occlude={false}
                style={{ pointerEvents: 'none' }}
            >
                <div style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    color: 'white',
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    border: `2px solid ${color}`,
                    boxShadow: `0 0 20px ${color}40`,
                    fontFamily: 'Inter, sans-serif',
                }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color, marginBottom: 6 }}>{name}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                        <span style={{ opacity: 0.7 }}>Status</span>
                        <span style={{ fontWeight: 600, color }}>{status}</span>
                        <span style={{ opacity: 0.7 }}>Load</span>
                        <span style={{ fontWeight: 600 }}>{load_pct}%</span>
                        <span style={{ opacity: 0.7 }}>Active</span>
                        <span style={{ fontWeight: 600 }}>{active_cases}</span>
                        <span style={{ opacity: 0.7 }}>Resolved</span>
                        <span style={{ fontWeight: 600 }}>{resolved_cases}</span>
                        <span style={{ opacity: 0.7 }}>Staff</span>
                        <span style={{ fontWeight: 600 }}>{staff_count}</span>
                        <span style={{ opacity: 0.7 }}>Overtime</span>
                        <span style={{ fontWeight: 600 }}>{avg_overtime}h</span>
                    </div>
                </div>
            </Html>
        </group>
    );
}
