import { useState, useEffect } from 'react';
import { socket } from './socket';

export default function Contestant() {
    const [state, setState] = useState(null);

    useEffect(() => {
        const onState = (s) => setState(s);
        const onTimer = (val) => setState(prev => ({ ...prev, timeLimit: val }));

        socket.on('state_update', onState);
        socket.on('timer_tick', onTimer);
        socket.emit('get_state');

        return () => {
            socket.off('state_update', onState);
            socket.off('timer_tick', onTimer);
        };
    }, []);

    if (!state) return <div>Waiting for server...</div>;

    // Determine high score for "Leader" highlight
    const maxScore = state.teams && state.teams.length ? Math.max(...state.teams.map(t => t.score)) : 0;

    return (
        <div className="game-show-container">
            <div className="stage-lights-container">
                <div className="light-beam beam-1"></div>
                <div className="light-beam beam-2"></div>
                <div className="light-beam beam-3"></div>
            </div>

            {state.status === 'DASHBOARD' ? (
                <div className="screensaver-overlay" style={{ background: 'transparent', backdropFilter: 'none' }}>
                    <div className="screensaver-content">
                        <h1>QUIZ MASTER</h1>
                        <p>Get Ready!</p>
                    </div>
                </div>
            ) : state.status === 'ROUND_READY' ? (
                <div className="screensaver-overlay" style={{ background: 'transparent', backdropFilter: 'none' }}>
                    <div className="screensaver-content">
                        <h1>{state.roundName}</h1>
                        <p style={{ fontSize: '1.5em', marginTop: '20px', color: '#64d2ff' }}>{state.roundDescription}</p>
                        <p style={{ marginTop: '40px', fontWeight: 'bold' }}>GET READY!</p>
                    </div>
                </div>
            ) : (
                <>
                    <header className="gs-header">
                        <div className="gs-round-name">{state.roundName}</div>
                        <div className={`gs-timer ${state.timeLimit <= 5 ? 'low' : ''}`}>
                            {state.timeLimit}
                        </div>
                    </header>

                    <main className="gs-main">
                        {state.question && (
                            <div className="question-card">
                                <div className="question-text">
                                    {state.question}
                                </div>

                                {state.currentAnswer && (
                                    <div className="gs-answer">
                                        {state.currentAnswer}
                                    </div>
                                )}
                            </div>
                        )}

                        {(state.status === 'BUZZED' || state.status === 'TIMEOUT') && (
                            <div className="buzzer-overlay">
                                {state.status === 'BUZZED' && state.buzzerWinner !== null
                                    ? state.teams[state.buzzerWinner].name
                                    : "TIME'S UP!"}
                            </div>
                        )}
                    </main>

                    <footer className="gs-footer">
                        {state.teams.map(t => (
                            <div
                                key={t.name}
                                className={`score-pod ${t.score === maxScore && t.score > 0 ? 'leader' : ''}`}
                            >
                                <div className="team-name">{t.name}</div>
                                <div className="team-score">{t.score}</div>
                            </div>
                        ))}
                    </footer>
                </>
            )}
        </div>
    );
}
