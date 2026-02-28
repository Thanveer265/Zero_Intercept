import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';

const SPEED = 5;
const SPRINT_MULTIPLIER = 1.8;
const JUMP_FORCE = 4;
const CAMERA_HEIGHT = 1.6;

export default function FirstPersonControls({ onNearDepartment, isLocked }) {
    const bodyRef = useRef();
    const { camera, gl } = useThree();

    const keys = useRef({
        w: false, a: false, s: false, d: false,
        shift: false, space: false,
    });

    const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));

    useEffect(() => {
        const onKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if (key === 'w' || key === 'arrowup') keys.current.w = true;
            if (key === 'a' || key === 'arrowleft') keys.current.a = true;
            if (key === 's' || key === 'arrowdown') keys.current.s = true;
            if (key === 'd' || key === 'arrowright') keys.current.d = true;
            if (key === 'shift') keys.current.shift = true;
            if (key === ' ') { keys.current.space = true; e.preventDefault(); }
        };
        const onKeyUp = (e) => {
            const key = e.key.toLowerCase();
            if (key === 'w' || key === 'arrowup') keys.current.w = false;
            if (key === 'a' || key === 'arrowleft') keys.current.a = false;
            if (key === 's' || key === 'arrowdown') keys.current.s = false;
            if (key === 'd' || key === 'arrowright') keys.current.d = false;
            if (key === 'shift') keys.current.shift = false;
            if (key === ' ') keys.current.space = false;
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, []);

    // Mouse look when pointer is locked
    useEffect(() => {
        const onMouseMove = (e) => {
            if (!document.pointerLockElement) return;
            euler.current.setFromQuaternion(camera.quaternion);
            euler.current.y -= e.movementX * 0.002;
            euler.current.x -= e.movementY * 0.002;
            euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));
            camera.quaternion.setFromEuler(euler.current);
        };
        document.addEventListener('mousemove', onMouseMove);
        return () => document.removeEventListener('mousemove', onMouseMove);
    }, [camera]);

    useFrame(() => {
        if (!bodyRef.current || !isLocked) return;

        const body = bodyRef.current;
        const direction = new THREE.Vector3();
        const frontVector = new THREE.Vector3(0, 0, (keys.current.s ? 1 : 0) - (keys.current.w ? 1 : 0));
        const sideVector = new THREE.Vector3((keys.current.a ? 1 : 0) - (keys.current.d ? 1 : 0), 0, 0);

        direction
            .subVectors(frontVector, sideVector)
            .normalize()
            .multiplyScalar(SPEED * (keys.current.shift ? SPRINT_MULTIPLIER : 1))
            .applyEuler(camera.rotation);

        const currentVel = body.linvel();
        body.setLinvel({ x: direction.x, y: currentVel.y, z: direction.z }, true);

        // Jump
        if (keys.current.space) {
            const pos = body.translation();
            if (pos.y < CAMERA_HEIGHT + 0.1) {
                body.setLinvel({ x: currentVel.x, y: JUMP_FORCE, z: currentVel.z }, true);
                keys.current.space = false;
            }
        }

        // Sync camera to body position
        const pos = body.translation();
        camera.position.set(pos.x, pos.y + CAMERA_HEIGHT, pos.z);

        // Check proximity to departments for UI overlay
        if (onNearDepartment) {
            onNearDepartment(pos);
        }
    });

    return (
        <RigidBody
            ref={bodyRef}
            position={[0, 2, 18]}
            enabledRotations={[false, false, false]}
            linearDamping={5}
            mass={1}
            type="dynamic"
            colliders={false}
            lockRotations
        >
            <CapsuleCollider args={[0.5, 0.3]} />
        </RigidBody>
    );
}

