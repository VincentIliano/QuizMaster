import React from 'react';

export default function ScoreHistoryModal({ team, isOpen, onClose }) {
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
                width: '500px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <h2>History: {team.name}</h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5em', cursor: 'pointer' }}
                    >
                        &times;
                    </button>
                </div>

                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {(team.history || [])
                        .slice() // copy
                        .sort((a, b) => b.timestamp - a.timestamp) // Sort newest first
                        .map((h, i) => (
                            <div key={i} style={{
                                padding: '10px',
                                borderBottom: '1px solid #444',
                                background: i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', fontSize: '0.9em' }}>
                                    <span>{new Date(h.timestamp).toLocaleTimeString()}</span>
                                    <span>{h.round}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                                    <span style={{ fontWeight: 'bold', color: h.amount >= 0 ? '#4caf50' : '#f44336' }}>
                                        {h.amount > 0 ? '+' : ''}{h.amount}
                                    </span>
                                    <span>{h.reason}</span>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '0.8em', color: '#666', marginTop: '2px' }}>
                                    Result: {h.newScore}
                                </div>
                            </div>
                        ))
                    }
                    {(!team.history || team.history.length === 0) && (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                            No history recorded.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
