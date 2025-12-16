import { useState, useEffect, useRef } from 'react';
import { socket } from './socket';

export default function Host() {
    const [state, setState] = useState(null);
    const [teamInputs, setTeamInputs] = useState(['', '', '', '', '']);

    const [autoStart, setAutoStart] = useState(true);

    useEffect(() => {
        const onState = (s) => setState(s);
        const onTimer = (val) => setState(prev => ({ ...prev, timeLimit: val }));

        socket.on('state_update', onState);
        socket.on('timer_tick', onTimer);

        // Request initial state on mount
        socket.emit('get_state');

        return () => {
            socket.off('state_update', onState);
            socket.off('timer_tick', onTimer);
        };
    }, []);

    const previousQuestion = () => socket.emit('previous_question');

    // Keyboard Shortcuts
    // We use a ref for autoStart to avoid stale closures in the event listener
    const autoStartRef = useRef(autoStart);
    useEffect(() => { autoStartRef.current = autoStart; }, [autoStart]);

    // Re-bind listener with ref access
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    socket.emit('start_timer');
                    break;
                case 'w':
                    socket.emit('judge_answer', true);
                    break;
                case 's':
                    socket.emit('judge_answer', false);
                    break;
                case 'd':
                    socket.emit('next_question', autoStartRef.current);
                    break;
                case 'a':
                    socket.emit('previous_question');
                    break;
            }
            if (e.key >= '1' && e.key <= '5') {
                const teamIndex = parseInt(e.key) - 1;
                socket.emit('host_buzz', teamIndex);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []); // Empty dependency, using ref for fresh state


    // Sync inputs with current state teams
    useEffect(() => {
        if (state && state.teams) {
            const newInputs = Array(5).fill('');
            state.teams.forEach((t, i) => {
                if (i < 5) newInputs[i] = t.name;
            });
            // Only update if different to avoid cursor jumps if possible, 
            // though with React state replacement it might be okay for this use case.
            // A simple comparison to avoid unnecessary renders/state updates:
            if (JSON.stringify(newInputs) !== JSON.stringify(teamInputs)) {
                setTeamInputs(newInputs);
            }
        }
    }, [state]);

    const updateTeams = () => {
        const validTeams = teamInputs.filter(t => t.trim());
        if (validTeams.length > 0) socket.emit('set_teams', validTeams);
    };

    const startRound = (index) => socket.emit('set_round', index);
    const nextQuestion = () => socket.emit('next_question', autoStart);
    const startTimer = () => socket.emit('start_timer');
    const judge = (correct) => socket.emit('judge_answer', correct);
    const reveal = () => socket.emit('reveal_answer');
    const returnDashboard = () => {
        // No confirm needed per quick iteration, or add back if risky?
        // Let's keep it quick.
        socket.emit('return_to_dashboard');
    };
    const updateScore = (index, val) => {
        socket.emit('update_score', index, parseInt(val) || 0);
    };

    if (!state) return <div>Connecting to Host Console...</div>;

    // --- Dashboard View ---
    if (state.status === 'DASHBOARD') {
        const roundData = state.roundsSummary || [];

        return (
            <div className="panel dashboard-grid">
                <div className="card">
                    <h2>Teams</h2>
                    <div className="team-inputs">
                        {teamInputs.map((name, i) => (
                            <input
                                key={i}
                                type="text"
                                placeholder={`Team ${i + 1}`}
                                value={name}
                                onChange={e => {
                                    const newInputs = [...teamInputs];
                                    newInputs[i] = e.target.value;
                                    setTeamInputs(newInputs);
                                }}
                            />
                        ))}
                    </div>
                    <button onClick={updateTeams} className="btn-primary" style={{ marginTop: 10 }}>Update Teams</button>

                    <h3 style={{ marginTop: 20 }}>Score Adjustments</h3>
                    <div className="team-inputs">
                        {state.teams.map((t, i) => (
                            <div key={i} style={{ marginBottom: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ marginRight: 10 }}>{t.name || `Team ${i + 1}`}</span>
                                <input
                                    type="number"
                                    value={t.score}
                                    onChange={e => updateScore(i, e.target.value)}
                                    style={{ width: 80, padding: 5 }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h2>Rounds</h2>
                    <div className="round-tiles-container">
                        {state.roundsSummary && state.roundsSummary.map(r => (
                            <div
                                key={r.index}
                                className={`round-tile ${r.questionsAnswered >= r.totalQuestions ? 'completed' : ''}`}
                                onClick={() => startRound(r.index)}
                            >
                                <h3>{r.name}</h3>
                                <div>{r.questionsAnswered} / {r.totalQuestions}</div>
                                {r.scores && (
                                    <div className="tile-scores">
                                        {Object.entries(r.scores).map(([k, v]) => (
                                            <div key={k}>{k}: {v}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- Control Panel View ---

    if (state.status === 'ROUND_READY') {
        return (
            <div className="panel">
                <h1>Round: {state.roundName}</h1>
                <p>{state.roundDescription}</p>
                <div style={{ marginTop: 40, textAlign: 'center' }}>
                    {state.upcomingQuestion && (
                        <div style={{ marginBottom: 20, padding: 15, background: '#444', borderRadius: 8 }}>
                            <strong>Next Up:</strong><br />
                            {state.upcomingQuestion}<br />
                            <em style={{ color: '#aaa' }}>({state.upcomingAnswer})</em>
                        </div>
                    )}
                    <label style={{ display: 'block', marginBottom: 20 }}>
                        <input
                            type="checkbox"
                            checked={autoStart}
                            onChange={e => setAutoStart(e.target.checked)}
                        /> Auto-Start Timer
                    </label>
                    <button
                        onClick={nextQuestion}
                        style={{ fontSize: '2em', padding: '20px 40px', backgroundColor: '#28a745', color: 'white' }}
                    >
                        START ROUND
                    </button>
                    <br /><br />
                    <button onClick={returnDashboard} style={{ backgroundColor: '#555' }}>Cancel</button>
                </div>
            </div>
        );
    }

    return (
        <div className="panel">
            <div className="game-header">
                <div>Round: {state.roundName} ({state.roundPoints} pts)</div>
                <div>Timer: {state.timeLimit}</div>
            </div>

            <div className="status-bar">Status: {state.status}</div>

            {state.status === 'IDLE' && state.upcomingQuestion && (
                <div style={{ margin: '10px 0', padding: 10, border: '1px dashed #666', background: 'rgba(0,0,0,0.2)' }}>
                    <strong>Next Question:</strong> {state.upcomingQuestion}
                    <div style={{ color: '#aaa', fontSize: '0.9em' }}>Answer: {state.upcomingAnswer}</div>
                </div>
            )}

            <div className="buzzer-status">
                {state.status === 'BUZZED' ? `${state.teams[state.buzzerWinner].name} BUZZED!` :
                    state.status === 'TIMEOUT' ? "TIME UP!" : ""}
            </div>



            <div className="question-text">
                Q: {state.question}
            </div>

            <div style={{ marginBottom: 20, color: '#64d2ff' }}>
                Answer: {state.answer}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ marginRight: 10 }}>
                    <input
                        type="checkbox"
                        checked={autoStart}
                        onChange={e => setAutoStart(e.target.checked)}
                    /> Auto-Start
                </label>

                <button
                    onClick={nextQuestion}
                    disabled={state.status === 'READING' || state.status === 'LISTENING'}
                >Next Question</button>

                <button
                    onClick={startTimer}
                    disabled={state.status !== 'READING'}
                >Start Timer</button>

                <button
                    id="btn-correct"
                    onClick={() => judge(true)}
                    disabled={state.status !== 'BUZZED'}
                    style={{ backgroundColor: '#28a745', color: 'white' }}
                >Correct</button>

                <button
                    id="btn-wrong"
                    onClick={() => judge(false)}
                    disabled={state.status !== 'BUZZED'}
                    style={{ backgroundColor: '#dc3545', color: 'white' }}
                >Wrong</button>

                <button
                    onClick={reveal}
                    disabled={state.status !== 'TIMEOUT'}
                >Reveal</button>
            </div>

            <hr style={{ margin: '20px 0', borderColor: '#444' }} />

            <button
                onClick={returnDashboard}
                style={{ backgroundColor: '#555' }}
            >Back to Dashboard</button>

            <div style={{ marginTop: 20 }}>
                <h3>Scores</h3>
                <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap' }}>
                    {state.teams.map((t, i) => (
                        <div key={i} style={{ background: '#333', padding: 8, borderRadius: 4, minWidth: 100 }}>
                            <div style={{ fontSize: '0.9em', color: '#aaa', marginBottom: 5 }}>{t.name}</div>
                            <input
                                type="number"
                                value={t.score}
                                onChange={e => updateScore(i, e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '5px',
                                    background: '#222',
                                    color: 'white',
                                    border: '1px solid #555',
                                    fontSize: '1.2em',
                                    fontWeight: 'bold'
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
