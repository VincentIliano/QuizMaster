import { useState, useEffect, useRef } from 'react';
import { socket } from './socket';

export default function Contestant() {
    const [state, setState] = useState(null);

    const mediaRef = useRef(null);

    useEffect(() => {
        if (!mediaRef.current || !state) return;

        // Sync playback with timer for Countdown (FreezeOut)
        if (state.mediaPlaying) {
            mediaRef.current.play().catch(e => console.error("Play error:", e));
        } else {
            mediaRef.current.pause();
        }
    });

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
    else if (state.status === 'ALL_LOCKED') containerClass = 'container-wrong'; // Red background for All Locked
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
                        {/* Standard Timer for non-freezeout */}
                        {state.roundType !== 'freezeout' && (
                            <div className={`gs-timer ${state.timeLimit <= 5 ? 'low' : ''}`}>
                                {state.timeLimit}
                            </div>
                        )}
                    </header>

                    <main className="gs-main" style={state.roundType === 'freezeout' ? { flexDirection: 'row', alignItems: 'center', gap: 40, padding: '0 40px' } : {}}>

                        {/* Large Analog Clock for Freezeout - Left Side */}
                        {state.roundType === 'freezeout' && (
                            <div className="analog-clock-large" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                <div style={{ position: 'relative', width: '40vh', height: '40vh' }}>
                                    <svg width="100%" height="100%" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="48" fill="#fff" stroke="#ccc" strokeWidth="2" />
                                        {/* Ticks */}
                                        {[...Array(12)].map((_, i) => (
                                            <line
                                                key={i}
                                                x1="50" y1="6" x2="50" y2="10"
                                                stroke="#333" strokeWidth="2"
                                                transform={`rotate(${i * 30} 50 50)`}
                                            />
                                        ))}
                                        {/* Progress Arc */}
                                        <circle
                                            cx="50" cy="50" r="40"
                                            fill="none"
                                            stroke={state.timeLimit <= 5 ? "#ff3b3b" : "#333"}
                                            strokeWidth="6"
                                            strokeDasharray="251"
                                            strokeDashoffset={251 - (251 * state.timeLimit / (state.maxTime || 30))}
                                            transform="rotate(-90 50 50)"
                                            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                                        />
                                    </svg>
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                                        fontSize: '4em', fontWeight: 'bold', color: '#333'
                                    }}>
                                        {state.timeLimit}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Question Card - Right Side (or Center) */}
                        {state.status !== 'IDLE' && (state.mediaUrl || state.question) && (
                            <div
                                key={state.question}
                                className={`question-card ${animClass} ${state.status === 'LISTENING' ? 'listening-active' : ''}`}
                                style={state.roundType === 'freezeout' ? { flex: 1, maxWidth: 'none', height: 'auto' } : {}}
                            >

                                {state.mediaUrl && (
                                    <div className="media-container" style={{ marginBottom: 20, textAlign: 'center' }}>
                                        {state.mediaType === 'video' ? (
                                            <video
                                                ref={mediaRef}
                                                src={state.mediaUrl}
                                                loop
                                                muted={false}
                                                controls={false}
                                                style={{ maxWidth: '100%', maxHeight: '40vh', borderRadius: 8 }}
                                            />
                                        ) : state.mediaType === 'audio' ? (
                                            <div style={{ padding: 20, background: '#333', borderRadius: 8 }}>
                                                <div style={{ fontSize: '3em' }}>🔊</div>
                                                <audio
                                                    ref={mediaRef}
                                                    src={state.mediaUrl}
                                                    controls
                                                />
                                            </div>
                                        ) : (
                                            <img
                                                src={state.mediaUrl}
                                                alt="Question Media"
                                                style={{ maxWidth: '100%', maxHeight: '40vh', borderRadius: 8 }}
                                            />
                                        )}
                                    </div>
                                )}

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

                                {state.status === 'ANSWER_REVEALED' && state.lastJudgement !== null &&
                                    !(state.roundType === 'freezeout' && state.lockedOutTeams && state.teams && state.lockedOutTeams.length === state.teams.length) && (
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
                {state.teams.map((t, i) => {
                    const isLocked = state.lockedOutTeams && state.lockedOutTeams.includes(i);
                    return (
                        <div
                            key={t.name}
                            className={`score-pod ${t.score === maxScore && t.score > 0 ? 'leader' : ''} ${isLocked ? 'locked-out' : ''}`}
                            style={isLocked ? { filter: 'grayscale(1)', opacity: 0.5, transform: 'scale(0.9)' } : {}}
                        >
                            <div className="team-name">{t.name}</div>
                            {isLocked && <div style={{ color: '#ff4d4d', fontWeight: 'bold', fontSize: '0.8em', marginBottom: 5 }}>FROZEN</div>}
                            <div className="team-score">{t.score}</div>
                        </div>
                    );
                })}
            </footer>
        </div>
    );
}
