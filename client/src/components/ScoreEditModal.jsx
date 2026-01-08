import React, { useState, useEffect } from 'react';

export default function ScoreEditModal({ team, isOpen, onClose, onSave }) {
    const [score, setScore] = useState(0);

    useEffect(() => {
        if (team) {
            setScore(team.score || 0);
        }
    }, [team]);

    if (!isOpen || !team) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: '#222',
                padding: '20px',
                borderRadius: '8px',
                width: '400px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }}>
                <h3>Adjust Score: {team.name}</h3>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <input
                        type="number"
                        value={score}
                        onChange={(e) => setScore(parseInt(e.target.value) || 0)}
                        style={{ fontSize: '1.5em', width: '100px', textAlign: 'center', padding: '5px' }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[1, 5, 10, -1, -5, -10].map(val => (
                        <button
                            key={val}
                            className="btn-sm"
                            onClick={() => setScore(prev => (parseInt(prev) || 0) + val)}
                            style={{
                                padding: '15px',
                                background: val > 0 ? '#4caf50' : '#f44336',
                                fontSize: '1.2em',
                                fontWeight: 'bold'
                            }}
                        >
                            {val > 0 ? '+' : ''}{val}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button
                        className="btn"
                        style={{ background: '#666' }}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => onSave(team.index, score)}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
