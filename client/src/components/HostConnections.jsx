
import React, { useEffect } from 'react';
import { socket } from '../socket';

export default function HostConnections({ state }) {
    const groups = state.groups || [];
    const solvedGroups = state.solvedGroups || [];
    const buzzerWinnerName = state.buzzerWinner !== null && state.teams[state.buzzerWinner]
        ? state.teams[state.buzzerWinner].name
        : null;

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in an input (though none exist here yet)
            if (e.target.tagName === 'INPUT') return;

            if (e.code === 'Space') {
                e.preventDefault();
                if (state.status === 'IDLE' || state.status === 'READING' || state.status === 'PAUSED' || state.status === 'BUZZED') {
                    socket.emit('start_timer');
                }
            }
            if (e.code === 'KeyD') {
                socket.emit('next_question');
            }
            if (e.code === 'KeyA') {
                socket.emit('previous_question');
            }
            // Buzzer emulation (Keys 1-5)
            if (e.key >= '1' && e.key <= '5') {
                const teamIndex = parseInt(e.key) - 1;
                socket.emit('host_buzz', teamIndex);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.status, state.buzzerWinner]);

    const revealGroup = (index) => {
        socket.emit('reveal_connection', index);
    };

    return (
        <div className="host-dashboard">
            <h2>Connections Control</h2>

            {/* Buzzer Status */}
            <div className="control-panel">
                <div className="status-display">
                    STATUS: <span className={state.status === 'BUZZED' ? 'status-buzzed' : ''}>{state.status}</span>
                </div>
                {buzzerWinnerName && (
                    <div className="buzzer-winner">
                        BUZZER: {buzzerWinnerName}
                    </div>
                )}

                <div className="controls">
                    <button onClick={() => socket.emit('previous_question')}>&lt; Prev (A)</button>
                    <button onClick={() => socket.emit('start_timer')} disabled={state.status !== 'READING' && state.status !== 'PAUSED' && state.status !== 'IDLE' && state.status !== 'BUZZED'}>Start Timer (Space)</button>
                    <button onClick={() => socket.emit('pause_timer')} disabled={state.status !== 'READING' && state.status !== 'LISTENING'}>Pause Timer</button>
                    {state.topic && (
                        <button
                            onClick={() => socket.emit('reveal_topic')}
                            disabled={state.topicRevealed}
                            style={{ backgroundColor: state.topicRevealed ? '#555' : '#8e44ad', color: 'white' }}
                        >
                            {state.topicRevealed ? `Topic: ${state.topic}` : "Reveal Topic"}
                        </button>
                    )}
                    <button onClick={() => socket.emit('next_question')}>Next &gt; (D)</button>
                </div>
            </div>

            {state.upcomingQuestion && (
                <div style={{ margin: '10px 0', padding: '10px', background: '#333', border: '1px solid #555', borderRadius: '4px' }}>
                    <strong>Next:</strong> {state.upcomingQuestion}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                {groups.map((g, i) => (
                    <button
                        key={i}
                        onClick={() => revealGroup(i)}
                        disabled={solvedGroups.includes(i)}
                        style={{
                            padding: '30px',
                            fontSize: '1.5em',
                            backgroundColor: solvedGroups.includes(i) ? '#888' : '#2196f3',
                            opacity: solvedGroups.includes(i) ? 0.5 : 1
                        }}
                    >
                        {g.name}
                        <div style={{ fontSize: '0.6em', marginTop: '10px' }}>
                            {g.items.join(', ')}
                        </div>
                    </button>
                ))}
            </div>

            <div style={{ marginTop: '20px' }}>
                <button className="nav-btn quit-btn" onClick={() => socket.emit('end_round_early')}>End Round & Summary</button>
                <button className="nav-btn" onClick={() => socket.emit('return_to_dashboard')} style={{ marginLeft: '10px', background: '#555' }}>Dashboard</button>
            </div>
        </div>
    );
}
