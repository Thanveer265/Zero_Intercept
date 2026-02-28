import { useMemo } from 'react';

const DEPT_POSITIONS = [
    { name: 'Emergency', x: -14, z: -6 },
    { name: 'ICU', x: 0, z: -6 },
    { name: 'Cardiology', x: 14, z: -6 },
    { name: 'Orthopedics', x: -14, z: 6 },
    { name: 'Pediatrics', x: 0, z: 6 },
    { name: 'Neurology', x: 14, z: 6 },
];

export default function DataOverlay({ isLocked, nearDepartment, data, onEnterClick }) {
    const deptData = useMemo(() => {
        if (!nearDepartment || !data?.departments) return null;
        return data.departments.find(d => d.department === nearDepartment);
    }, [nearDepartment, data]);

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 10,
            fontFamily: 'Inter, sans-serif',
        }}>
            {/* Controls help — bottom left */}
            <div style={{
                position: 'absolute',
                bottom: 20,
                left: 20,
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                borderRadius: 12,
                padding: '12px 16px',
                color: 'white',
                fontSize: 11,
                lineHeight: 1.6,
            }}>
                <div style={{ fontWeight: 700, marginBottom: 4, color: '#14b8a6' }}>Controls</div>
                <div><kbd style={kbdStyle}>W</kbd><kbd style={kbdStyle}>A</kbd><kbd style={kbdStyle}>S</kbd><kbd style={kbdStyle}>D</kbd> Move</div>
                <div><kbd style={kbdStyle}>Mouse</kbd> Look around</div>
                <div><kbd style={kbdStyle}>Shift</kbd> Sprint</div>
                <div><kbd style={kbdStyle}>Space</kbd> Jump</div>
                <div><kbd style={kbdStyle}>ESC</kbd> Release cursor</div>
            </div>

            {/* Click to start overlay */}
            {!isLocked && (
                <div onClick={onEnterClick} style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.4)',
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                }}>
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        borderRadius: 20,
                        padding: '32px 48px',
                        color: 'white',
                        textAlign: 'center',
                        border: '2px solid #14b8a6',
                        boxShadow: '0 0 40px rgba(20, 184, 166, 0.3)',
                    }}>
                        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: '#14b8a6' }}>
                            🏥 Hospital Digital Twin
                        </div>
                        <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 16 }}>
                            3D Interactive Walkthrough
                        </div>
                        <div style={{
                            fontSize: 16,
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
                            padding: '12px 32px',
                            borderRadius: 12,
                            display: 'inline-block',
                        }}>
                            Click to Enter
                        </div>
                    </div>
                </div>
            )}

            {/* Minimap — top right */}
            <div style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(8px)',
                borderRadius: 12,
                padding: 12,
                width: 180,
            }}>
                <div style={{ color: '#14b8a6', fontWeight: 700, fontSize: 11, marginBottom: 8, textAlign: 'center' }}>
                    Department Map
                </div>
                <div style={{ position: 'relative', height: 100 }}>
                    {DEPT_POSITIONS.map(dept => {
                        const deptInfo = data?.departments?.find(d => d.department === dept.name);
                        const statusColor = deptInfo?.status === 'Critical' ? '#ef4444'
                            : deptInfo?.status === 'Warning' ? '#f59e0b'
                                : deptInfo?.status === 'Normal' ? '#3b82f6'
                                    : '#22c55e';
                        const isNear = nearDepartment === dept.name;
                        return (
                            <div
                                key={dept.name}
                                style={{
                                    position: 'absolute',
                                    left: `${((dept.x + 20) / 40) * 100}%`,
                                    top: `${((dept.z + 10) / 20) * 100}%`,
                                    transform: 'translate(-50%, -50%)',
                                    background: statusColor,
                                    borderRadius: 4,
                                    padding: '2px 5px',
                                    fontSize: 8,
                                    color: 'white',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    border: isNear ? '2px solid white' : '1px solid rgba(255,255,255,0.3)',
                                    boxShadow: isNear ? '0 0 8px white' : 'none',
                                }}
                            >
                                {dept.name.slice(0, 5)}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Department info panel — when near a department */}
            {deptData && (
                <div style={{
                    position: 'absolute',
                    top: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(15, 23, 42, 0.92)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: 16,
                    padding: '12px 24px',
                    color: 'white',
                    fontSize: 12,
                    display: 'flex',
                    gap: 24,
                    alignItems: 'center',
                    border: `1px solid ${deptData.status === 'Critical' ? '#ef4444' : '#14b8a6'}`,
                }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: '#14b8a6' }}>{deptData.department}</span>
                    <span>Status: <b style={{ color: deptData.status === 'Critical' ? '#ef4444' : '#14b8a6' }}>{deptData.status}</b></span>
                    <span>Load: <b>{deptData.load_pct}%</b></span>
                    <span>Active: <b>{deptData.active_cases}</b></span>
                    <span>Staff: <b>{deptData.staff_count}</b></span>
                </div>
            )}
        </div>
    );
}

const kbdStyle = {
    background: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    padding: '1px 5px',
    marginRight: 3,
    fontSize: 10,
    fontFamily: 'monospace',
    border: '1px solid rgba(255,255,255,0.2)',
};
