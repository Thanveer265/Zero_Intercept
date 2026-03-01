import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function DNAHelix() {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // --- Scene setup ---
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.set(0, 0, 14);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);

        // --- Helix parameters ---
        const HELIX_RADIUS = 2.2;
        const HELIX_HEIGHT = 18;
        const TURNS = 4;
        const NODES_PER_STRAND = 60;
        const NODE_RADIUS = 0.12;
        const VERTICAL_STEP = HELIX_HEIGHT / NODES_PER_STRAND;

        // --- Materials ---
        const nodeMaterialA = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0x14b8a6), // teal
            transparent: true,
            opacity: 0.85,
        });
        const nodeMaterialB = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0x10b981), // emerald
            transparent: true,
            opacity: 0.85,
        });
        const connectorMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color(0x5eead4), // light teal
            transparent: true,
            opacity: 0.25,
        });
        const strandMaterialA = new THREE.LineBasicMaterial({
            color: new THREE.Color(0x14b8a6),
            transparent: true,
            opacity: 0.35,
        });
        const strandMaterialB = new THREE.LineBasicMaterial({
            color: new THREE.Color(0x10b981),
            transparent: true,
            opacity: 0.35,
        });

        // --- Glow sprite for nodes ---
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = 64;
        glowCanvas.height = 64;
        const glowCtx = glowCanvas.getContext('2d');
        const gradient = glowCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(20, 184, 166, 0.6)');
        gradient.addColorStop(0.4, 'rgba(16, 185, 129, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        glowCtx.fillStyle = gradient;
        glowCtx.fillRect(0, 0, 64, 64);
        const glowTexture = new THREE.CanvasTexture(glowCanvas);
        const glowSpriteMaterial = new THREE.SpriteMaterial({
            map: glowTexture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        // --- Build helix geometry ---
        const helixGroup = new THREE.Group();
        const nodeGeo = new THREE.SphereGeometry(NODE_RADIUS, 12, 8);
        const strandAPoints = [];
        const strandBPoints = [];

        for (let i = 0; i < NODES_PER_STRAND; i++) {
            const t = i / NODES_PER_STRAND;
            const angle = t * Math.PI * 2 * TURNS;
            const y = t * HELIX_HEIGHT - HELIX_HEIGHT / 2;

            // Strand A
            const xA = Math.cos(angle) * HELIX_RADIUS;
            const zA = Math.sin(angle) * HELIX_RADIUS;
            const nodeA = new THREE.Mesh(nodeGeo, nodeMaterialA);
            nodeA.position.set(xA, y, zA);
            helixGroup.add(nodeA);
            strandAPoints.push(new THREE.Vector3(xA, y, zA));

            // Glow for A
            const glowA = new THREE.Sprite(glowSpriteMaterial.clone());
            glowA.position.set(xA, y, zA);
            glowA.scale.set(0.7, 0.7, 0.7);
            helixGroup.add(glowA);

            // Strand B (offset by PI)
            const xB = Math.cos(angle + Math.PI) * HELIX_RADIUS;
            const zB = Math.sin(angle + Math.PI) * HELIX_RADIUS;
            const nodeB = new THREE.Mesh(nodeGeo, nodeMaterialB);
            nodeB.position.set(xB, y, zB);
            helixGroup.add(nodeB);
            strandBPoints.push(new THREE.Vector3(xB, y, zB));

            // Glow for B
            const glowB = new THREE.Sprite(glowSpriteMaterial.clone());
            glowB.position.set(xB, y, zB);
            glowB.scale.set(0.7, 0.7, 0.7);
            helixGroup.add(glowB);

            // Connector line between strands (every 3rd node)
            if (i % 3 === 0) {
                const connGeo = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(xA, y, zA),
                    new THREE.Vector3(xB, y, zB),
                ]);
                const connLine = new THREE.Line(connGeo, connectorMaterial);
                helixGroup.add(connLine);
            }
        }

        // Strand curves
        const curveA = new THREE.BufferGeometry().setFromPoints(strandAPoints);
        const lineA = new THREE.Line(curveA, strandMaterialA);
        helixGroup.add(lineA);

        const curveB = new THREE.BufferGeometry().setFromPoints(strandBPoints);
        const lineB = new THREE.Line(curveB, strandMaterialB);
        helixGroup.add(lineB);

        // Wrap in a pivot group for diagonal tilt
        const pivotGroup = new THREE.Group();
        pivotGroup.rotation.z = Math.PI / 5; // ~36 degrees diagonal tilt
        pivotGroup.add(helixGroup);

        scene.add(pivotGroup);

        // --- Mouse tracking ---
        let mouseX = 0;
        let mouseY = 0;
        const handleMouseMove = (e) => {
            const rect = container.getBoundingClientRect();
            mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
            mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        };
        container.addEventListener('mousemove', handleMouseMove);

        // --- Animation loop ---
        let frame = 0;
        const animate = () => {
            frame = requestAnimationFrame(animate);

            // Slow auto-rotation along helix axis + mouse influence
            const time = Date.now() * 0.0003;
            helixGroup.rotation.y = time + mouseX * 0.6;

            // Mouse Y gently tilts the whole pivot
            pivotGroup.rotation.x = mouseY * 0.15;

            // Slight vertical bob
            pivotGroup.position.y = Math.sin(time * 2) * 0.3;

            renderer.render(scene, camera);
        };
        animate();

        // --- Resize ---
        const handleResize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        // --- Cleanup ---
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', handleResize);
            container.removeEventListener('mousemove', handleMouseMove);
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 z-0"
            style={{ pointerEvents: 'auto' }}
        />
    );
}
