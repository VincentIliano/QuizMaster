import { useState, useEffect, useRef } from 'react';
import { socket } from './socket';

export default function Contestant() {
    const [state, setState] = useState(null);

    // Track previous question index to determine direction
    // Initialize with -1, will update when state is available
    const prevQIndex = useRef(-1);
    const prevRoundIndex = useRef(-1);
    const [animClass, setAnimClass] = useState('');

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

    useEffect(() => {
        if (!state) return;

        // Reset if round changes
        if (state.roundIndex !== prevRoundIndex.current) {
            setAnimClass('pop-in'); // Default for new round
            prevRoundIndex.current = state.roundIndex;
            prevQIndex.current = state.questionIndex;
            return;
        }

        if (state.questionIndex !== prevQIndex.current) {
            if (state.questionIndex > prevQIndex.current) {
                setAnimClass('slide-right');
            } else {
                setAnimClass('slide-left');
            }
            prevQIndex.current = state.questionIndex;
        }
    }, [state?.questionIndex, state?.roundIndex]); // Trigger on index changes

    if (!state) return <div>Waiting for server...</div>;

    // Determine High Score
    const maxScore = state.teams && state.teams.length ? Math.max(...state.teams.map(t => t.score)) : 0;

    // Dynamic Container Classes for Atmosphere
    let containerClass = '';
    if (state.status === 'LISTENING') containerClass = 'container-listening';
    else if (state.status === 'BUZZED') containerClass = 'container-buzzed';
    else if (state.status === 'TIMEOUT') containerClass = 'container-timeout';
    else if (state.status === 'ANSWER_REVEALED') {
        if (state.lastJudgement === true) containerClass = 'container-correct';
        else if (state.lastJudgement === false) containerClass = 'container-wrong';
    }

    return (
        <div className={`game-show-container ${containerClass}`}>
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
                        {/* Show Question only if not IDLE */}
                        {state.status !== 'IDLE' && state.question && (
                            <div key={state.question} className={`question-card ${animClass} ${state.status === 'LISTENING' ? 'listening-active' : ''}`}>
                                <div className="question-text">
                                    {state.question}
                                </div>

                                {state.currentAnswer && (
                                    <div className="gs-answer pop-in">
                                        {state.currentAnswer}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Overlays for buzz, timeout, and judgement */}
                        {(state.status === 'BUZZED' || state.status === 'TIMEOUT' || state.status === 'ANSWER_REVEALED') && (
                            <>
                                {state.status === 'BUZZED' && state.buzzerWinner !== null && (
                                    <div className="buzzer-overlay state-buzzed">
                                        {state.teams[state.buzzerWinner].name}
                                    </div>
                                )}

                                {state.status === 'TIMEOUT' && (
                                    <div className="buzzer-overlay state-timeout">
                                        TIME'S UP!
                                    </div>
                                )}

                                {state.status === 'ANSWER_REVEALED' && state.lastJudgement !== null && (
                                    <div className={`buzzer-overlay ${state.lastJudgement ? 'state-correct' : 'state-wrong'}`}>
                                        {state.lastJudgement ? 'CORRECT!' : 'WRONG!'}
                                    </div>
                                )}
                            </>
                        )}
                    </main>

                </>
            )}

            <div style={{ flex: 1 }}></div>

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
        </div>
    );
}
