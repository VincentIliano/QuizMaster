
import React from 'react';
import { socket } from '../socket';

export default function HostConnections({ state }) {
    const groups = state.groups || [];
    const solvedGroups = state.solvedGroups || [];
    const buzzerWinnerName = state.buzzerWinner !== null && state.teams[state.buzzerWinner]
        ? state.teams[state.buzzerWinner].name
        : null;

    const revealGroup = (index) => {
        socket.emit('reveal_connection', index);
        // Also award points if someone has buzzed? 
        // Logic says Host presses button corresponding to named category.
        // If we want to support scoring, we might also need to mark "Correct" on the control panel 
        // separately or integrate it. 
        // For now, let's assume the host handles scoring via the manual "+/-" buttons or the `W` key 
        // if the standard control panel is visible, BUT this view might replace it.
        // Let's add simple "Correct/Wrong" buttons here if a team has buzzed.
    };

    const markCorrect = () => socket.emit('judge_answer', true);
    const markWrong = () => socket.emit('judge_answer', false);
    const clearBuzzer = () => socket.emit('s_next_question'); // Resets buzzer state (hacky reused event?) 
    // actually nextQuestion might effectively reset buzzer. 
    // We might need a dedicated "Clear Buzzer" or just use "Wrong" which usually re-opens format?
    // In standard round, Wrong re-opens buzzer or locks out team. 

    // For Connections, it's usually "Team Guesses -> Wrong -> Next Team can guess".

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
                    <button onClick={() => socket.emit('host_action', 'start_timer')} disabled={state.status !== 'READING' && state.status !== 'PAUSED'}>Start Timer (Space)</button>
                    <button onClick={() => socket.emit('host_action', 'stop_timer')}>Pause Timer</button>
                    <button onClick={markCorrect} disabled={state.buzzerWinner === null} style={{ backgroundColor: '#4caf50' }}>Correct (W)</button>
                    <button onClick={markWrong} disabled={state.buzzerWinner === null} style={{ backgroundColor: '#f44336' }}>Wrong (S)</button>
                    {/* Reuse generic control panel logic if possible, but custom view requested */}
                </div>
            </div>

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
            </div>
        </div>
    );
}
