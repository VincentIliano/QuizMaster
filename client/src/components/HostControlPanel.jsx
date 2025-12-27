
import { useEffect, useRef } from 'react';
import { socket } from '../socket';

export default function HostControlPanel({ state }) {
    const nextQuestion = () => socket.emit('next_question');
    const startTimer = () => socket.emit('start_timer');
    const judge = (correct) => socket.emit('judge_answer', correct);
    const reveal = () => socket.emit('reveal_answer');
    const returnDashboard = () => socket.emit('return_to_dashboard');
    const updateScore = (index, val) => socket.emit('update_score', index, parseInt(val) || 0);

    const stateRef = useRef(state);
    useEffect(() => { stateRef.current = state; }, [state]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // Use ref to get latest state inside listener
            const currentState = stateRef.current;
            if (!currentState) return;

            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    if (currentState.status === 'ALL_LOCKED') {
                        socket.emit('toggle_media');
                    } else if (currentState.status === 'LISTENING') {
                        socket.emit('pause_timer');
                    } else {
                        socket.emit('start_timer');
                    }
                    break;
                case 'w':
                    socket.emit('judge_answer', true);
                    break;
                case 's':
                    socket.emit('judge_answer', false);
                    break;
                case 'd':
                    socket.emit('next_question');
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
    }, []);

    return (
        <div className="panel">
            <div className="game-header">
                <div>Round: {state.roundName} ({state.roundPoints} pts)</div>
                <div>Timer: {state.timeLimit}</div>
            </div>

            <div className="status-bar">Status: {state.status}</div>

            {state.upcomingQuestion && (
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

            {state.choices && (
                <div style={{ margin: '10px 0', padding: '10px', background: '#333', borderRadius: 4 }}>
                    <div style={{ fontSize: '0.9em', color: '#aaa', marginBottom: 5 }}>Choices:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                        {state.choices.map((c, i) => {
                            const k = Object.keys(c)[0];
                            const v = c[k];
                            return (
                                <div key={i} style={{ background: '#444', padding: '5px 10px', borderRadius: 4, border: state.answer === k ? '1px solid #28a745' : '1px solid #555' }}>
                                    <span style={{ fontWeight: 'bold', color: '#ffd700', marginRight: 5 }}>{k.toUpperCase()}.</span>
                                    <span>{v}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {state.mediaUrl && (
                <div style={{ margin: '10px 0', padding: 10, background: '#222', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontWeight: 'bold', color: '#aaa' }}>MEDIA:</div>
                    {state.mediaType === 'image' && <img src={state.mediaUrl} alt="media" style={{ height: 40, borderRadius: 2 }} />}
                    <div style={{ fontSize: '0.8em', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{state.mediaUrl}</div>
                </div>
            )}

            <div style={{ marginBottom: 20, color: '#64d2ff' }}>
                {state.roundType === 'order' ? (
                    <strong>Correct Order: {state.answer}</strong>
                ) : (
                    <>Answer: {state.answer}</>
                )}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                    onClick={nextQuestion}
                    disabled={state.status === 'READING' || state.status === 'LISTENING'}
                >Next Question</button>

                <button
                    onClick={startTimer}
                    disabled={state.status !== 'READING' && state.status !== 'PAUSED'}
                >Start Timer</button>

                {state.mediaUrl && (state.mediaType === 'video' || state.mediaType === 'audio') && (
                    <button
                        onClick={() => socket.emit('toggle_media')}
                        style={{ backgroundColor: state.mediaPlaying ? '#ffc107' : '#17a2b8', color: '#000' }}
                    >
                        {state.mediaPlaying ? "Pause Media" : "Play Media"}
                    </button>
                )}

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
                >
                    {state.roundDescription && state.roundDescription.includes("Push your luck") ? "Freeze & Resume" : "Wrong"}
                </button>

                <button
                    onClick={reveal}
                    disabled={state.status !== 'TIMEOUT' && state.status !== 'ALL_LOCKED' && state.status !== 'PAUSED' && state.status !== 'LISTENING'}
                >Reveal</button>

                {state.topic && (
                    <button
                        onClick={() => socket.emit('reveal_topic')}
                        disabled={state.topicRevealed}
                        style={{ backgroundColor: state.topicRevealed ? '#555' : '#8e44ad', color: 'white' }}
                    >
                        {state.topicRevealed ? `Topic: ${state.topic}` : "Reveal Topic"}
                    </button>
                )}
            </div>

            <hr style={{ margin: '20px 0', borderColor: '#444' }} />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                    onClick={returnDashboard}
                    style={{ backgroundColor: '#555' }}
                >Back to Dashboard</button>

                <button
                    onClick={() => socket.emit('end_round_early')}
                    style={{ backgroundColor: '#e65100', color: 'white' }}
                >Stop Round & Go to Summary</button>
            </div>

            <div style={{ marginTop: 20 }}>
                <h3>Scores</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: '500px' }}>
                    {state.teams.map((t, i) => {
                        const isLocked = state.lockedOutTeams && state.lockedOutTeams.includes(i);
                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isLocked ? '#2a1a1a' : '#333', padding: '10px 15px', borderRadius: 6, border: isLocked ? '1px solid #d00' : 'none' }}>
                                <span style={{ fontSize: '1.1em', fontWeight: '500', color: isLocked ? '#aaa' : '#eee' }}>
                                    {t.name} {isLocked && <span style={{ color: '#ff4d4d', fontSize: '0.8em' }}>(FROZEN)</span>}
                                </span>
                                <input
                                    type="number"
                                    value={t.score}
                                    onChange={e => updateScore(i, e.target.value)}
                                    style={{
                                        width: '100px',
                                        padding: '8px',
                                        background: '#222',
                                        color: 'white',
                                        border: '1px solid #555',
                                        borderRadius: '4px',
                                        fontSize: '1.2em',
                                        fontWeight: 'bold',
                                        textAlign: 'right'
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}
