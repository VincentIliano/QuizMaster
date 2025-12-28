import React, { useEffect, useState, useRef, useMemo, useLayoutEffect } from 'react';
import { socket } from './socket';
import ContestantRoundSummary from './components/ContestantRoundSummary';
import ContestantConnections from './components/ContestantConnections';
import ContestantFinalResults from './components/ContestantFinalResults';

export default function Contestant() {
    const [state, setState] = useState(null);


    const mediaRef = useRef(null);
    const tickAudioRef = useRef(null);
    const buzzerAudioRef = useRef(null);
    const correctAudioRef = useRef(null);
    const wrongAudioRef = useRef(null);

    useEffect(() => {
        // Initialize Audio objects once
        tickAudioRef.current = new Audio('/assets/clock_ticking_60s.mp3');
        buzzerAudioRef.current = new Audio('/assets/Buzzer.mp3');
        correctAudioRef.current = new Audio('/assets/Correct.mp3');
        wrongAudioRef.current = new Audio('/assets/Wrong.mp3');

        // Configure tick audio
        tickAudioRef.current.loop = true;
        tickAudioRef.current.volume = 0.5; // Adjust volume as needed
    }, []);

    // Track solved groups count to trigger sound
    const prevSolvedCount = useRef(0);

    // Track previous state to prevent re-triggering sounds
    const prevStatus = useRef(null);

    // Effect to play specific sounds based on exact state changes
    useEffect(() => {
        if (!state) return;

        // Buzzer Sound (only on transition)
        if (state.status === 'BUZZED' && prevStatus.current !== 'BUZZED' && buzzerAudioRef.current) {
            buzzerAudioRef.current.currentTime = 0;
            buzzerAudioRef.current.play().catch(() => { });
        }

        // Answer Revealed Sound (Correct or Wrong) - only on transition or judgement change
        if (state.status === 'ANSWER_REVEALED' && (prevStatus.current !== 'ANSWER_REVEALED' || state.lastJudgement !== prevStatus.currentJudgement)) {
            if (state.lastJudgement === true && correctAudioRef.current) {
                correctAudioRef.current.currentTime = 0;
                correctAudioRef.current.play().catch(() => { });
            } else if (state.lastJudgement === false && wrongAudioRef.current) {
                wrongAudioRef.current.currentTime = 0;
                wrongAudioRef.current.play().catch(() => { });
            }
        }

        // Wrong Answer (but game continues) -> Status is PAUSED, lastJudgement is false
        if (state.status === 'PAUSED' && state.lastJudgement === false && prevStatus.current !== 'PAUSED' && wrongAudioRef.current) {
            wrongAudioRef.current.currentTime = 0;
            wrongAudioRef.current.play().catch(() => { });
        }

        // Solved a Connection Group (Correct Sound)
        if (state.solvedGroups) {
            const currentCount = state.solvedGroups.length;
            // If count increased, play correct sound
            if (currentCount > prevSolvedCount.current && correctAudioRef.current) {
                correctAudioRef.current.currentTime = 0;
                correctAudioRef.current.play().catch(() => { });
            }
            prevSolvedCount.current = currentCount;
        } else {
            prevSolvedCount.current = 0;
        }

        // All Locked OR Timeout -> Wrong Sound
        if ((state.status === 'ALL_LOCKED' || state.status === 'TIMEOUT') && state.status !== prevStatus.current && wrongAudioRef.current) {
            wrongAudioRef.current.currentTime = 0;
            wrongAudioRef.current.play().catch(() => { });
        }

        prevStatus.current = state.status;
        prevStatus.currentJudgement = state.lastJudgement; // Track judgement too if needed

    }, [state?.status, state?.lastJudgement, state?.lockedOutTeams?.length, state?.solvedGroups?.length]); // Dependencies to re-run

    useEffect(() => {
        if (!state) return;

        // Play ticking sound when status is LISTENING (timer running)
        if (state.status === 'LISTENING' && tickAudioRef.current) {
            tickAudioRef.current.play().catch(e => console.log('Tick play failed (interaction needed?):', e));
        } else if (tickAudioRef.current) {
            tickAudioRef.current.pause();
            tickAudioRef.current.currentTime = 0;
        }

        if (!mediaRef.current) return;

        // Sync question media playback with timer/status
        // Using mediaPlaying flag from server
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

    // --- FLIP Animation Logic for Order Round ---
    const choiceRefs = useRef({});
    const prevRects = useRef({});

    const displayChoices = useMemo(() => {
        if (!state || !state.choices) return [];
        let choices = [...state.choices];

        if (state.roundType === 'order' && (state.status === 'ANSWER_REVEALED' || state.status === 'GAME_OVER')) {
            // Sort choices based on the answer key sequence (e.g. "B, A, C")
            if (state.answer) {
                const order = state.answer.split(',').map(s => s.trim().toUpperCase());
                choices.sort((a, b) => {
                    const keyA = Object.keys(a)[0].toUpperCase();
                    const keyB = Object.keys(b)[0].toUpperCase();
                    return order.indexOf(keyA) - order.indexOf(keyB);
                });
            }
        }
        return choices;
    }, [state?.choices, state?.roundType, state?.status, state?.answer]);

    const prevOrder = useRef("");

    useLayoutEffect(() => {
        // FLIP: Invert and Play
        if (!state || state.roundType !== 'order') return;

        // Check if order changed
        const currentOrderKeys = displayChoices.map(c => Object.keys(c)[0]).join(',');
        const orderChanged = prevOrder.current !== currentOrderKeys;

        const currentRects = {};
        // 1. Measure New Positions (Last)
        displayChoices.forEach(c => {
            const key = Object.keys(c)[0];
            const el = choiceRefs.current[key];
            if (el) {
                currentRects[key] = el.getBoundingClientRect();
            }
        });

        // 2. Calculate Delta and Invert (Only if order changed)
        if (orderChanged) {
            displayChoices.forEach(c => {
                const key = Object.keys(c)[0];
                const el = choiceRefs.current[key];
                const prev = prevRects.current[key];
                const current = currentRects[key];

                if (el && prev && current) {
                    const dy = prev.top - current.top;
                    const dx = prev.left - current.left;

                    if (dx !== 0 || dy !== 0) {
                        // Invert: translate back to old position
                        el.style.transform = `translate(${dx}px, ${dy}px)`;
                        el.style.transition = 'none';

                        // Force Reflow
                        void el.offsetWidth;

                        // Play: Remove transform to animate to new position
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                el.style.transition = 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)';
                                el.style.transform = '';
                            });
                        });
                    }
                }
            });
        }

        // Save current as previous for next render
        prevRects.current = currentRects;
        prevOrder.current = currentOrderKeys;


    }, [displayChoices, state?.roundType]);

    useEffect(() => {
        const onState = (s) => setState(s);
        const onTimer = (val) => setState(prev => ({ ...prev, timeLimit: val }));

        socket.on('state_update', onState);
        socket.on('timer_tick', onTimer);

        socket.on('play_sfx', (type) => {
            if (type === 'correct' && correctAudioRef.current) {
                correctAudioRef.current.currentTime = 0;
                correctAudioRef.current.play().catch(e => console.log('SFX play failed', e));
            } else if (type === 'wrong' && wrongAudioRef.current) {
                wrongAudioRef.current.currentTime = 0;
                wrongAudioRef.current.play().catch(e => console.log('SFX play failed', e));
            }
        });

        socket.emit('get_state');

        const handleKeyDown = (e) => {
            // Support for physical buzzers mapped to number keys 1-5
            if (e.key >= '1' && e.key <= '5') {
                const teamIndex = parseInt(e.key) - 1;
                socket.emit('host_buzz', teamIndex);
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            socket.off('state_update', onState);
            socket.off('timer_tick', onTimer);
            window.removeEventListener('keydown', handleKeyDown);
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
            setAnimClass('pop-in');
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

    // Flash Red Effect
    return (
        <div className={`game-show-container ${containerClass} ${(state.status === 'PAUSED' && state.lastJudgement === false) ? 'flash-red' : ''}`}>
            {/* ... rest of the code ... */}
            <div className="stage-lights-container">
                <div className="light-beam beam-1"></div>
                <div className="light-beam beam-2"></div>
                <div className="light-beam beam-3"></div>
            </div>

            {state.status === 'ROUND_SUMMARY' ? (
                <ContestantRoundSummary state={state} />
            ) : state.status === 'FINAL_RESULTS' ? (
                <ContestantFinalResults state={state} />
            ) : state.status === 'DASHBOARD' ? (
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
            ) : state.roundType === 'connections' ? (
                <ContestantConnections state={state} />
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
                                // Removed key={state.question} to prevent remounting on unrelated updates. 
                                // Relies on animClass triggering for visual entrance.
                                className={`question-card ${animClass} ${state.status === 'LISTENING' ? 'listening-active' : ''}`}
                                style={{
                                    ...(state.roundType === 'freezeout' ? { flex: 1, maxWidth: 'none', height: 'auto' } : {}),
                                    ...(state.roundType === 'list' ? { maxWidth: '95%', width: '100%' } : {}),
                                }}
                                onAnimationEnd={() => {
                                    if (animClass === 'pop-in' || animClass === 'slide-right' || animClass === 'slide-left') {
                                        setAnimClass('');
                                    }
                                }}
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

                                {state.choices && (
                                    <div className="choices-grid" style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr',
                                        gap: '20px',
                                        marginTop: '40px',
                                        textAlign: 'left',
                                        width: '100%'
                                    }}>
                                        {displayChoices.map((choice, i) => {
                                            const key = Object.keys(choice)[0];
                                            const val = choice[key];
                                            const isRevealed = state.status === 'ANSWER_REVEALED' || state.status === 'GAME_OVER';
                                            const isCorrect = state.currentAnswer === key;

                                            let style = {
                                                background: 'rgba(255,255,255,0.1)',
                                                padding: '20px 30px',
                                                borderRadius: '15px',
                                                fontSize: '1.5em',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center',
                                                border: '2px solid rgba(255,255,255,0.2)',
                                                transition: 'all 0.5s ease', // Fallback transition
                                                position: 'relative' // Needed for z-index
                                            };

                                            // Highlight logic for non-Order rounds or general revealed state
                                            if (isRevealed) {
                                                // For Order rounds, we highlight everything as correct once they are ordered?
                                                // Or maybe we don't need special color highlighting if the order proves it?
                                                // Let's keep the green glow for visual confirm.
                                                if (state.roundType === 'order') {
                                                    style.background = 'rgba(40, 167, 69, 0.3)';
                                                    style.borderColor = '#28a745';
                                                    style.boxShadow = '0 0 30px rgba(40, 167, 69, 0.5)';
                                                } else {
                                                    if (isCorrect) {
                                                        style.background = 'rgba(40, 167, 69, 0.3)';
                                                        style.borderColor = '#28a745';
                                                        style.boxShadow = '0 0 30px rgba(40, 167, 69, 0.5)';
                                                        style.transform = 'scale(1.05)';
                                                    } else {
                                                        style.opacity = 0.3;
                                                        style.filter = 'grayscale(1)';
                                                    }
                                                }
                                            }

                                            return (
                                                <div
                                                    key={`${state.questionIndex}-${key}`} // Unique key per question to reset state/styles
                                                    ref={el => choiceRefs.current[key] = el}
                                                    className="choice-item"
                                                    style={style}
                                                >
                                                    <span style={{
                                                        color: isRevealed && (isCorrect || state.roundType === 'order') ? '#fff' : '#ffd700',
                                                        marginRight: '20px',
                                                        fontSize: '1.2em',
                                                        textTransform: 'uppercase'
                                                    }}>{key}.</span>
                                                    <span>{val}{state.roundType === 'order' && isRevealed && choice.index ? ` (${choice.index})` : ''}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {state.roundType === 'list' && state.answers && (
                                    <div className="list-answers-grid">
                                        {state.answers.map((ans, idx) => {
                                            const isRevealed = (state.revealedAnswers && state.revealedAnswers.includes(ans)) || state.status === 'ANSWER_REVEALED';
                                            return (
                                                <div key={idx} className={`list-answer-item ${isRevealed ? 'revealed' : ''} pop-in`}>
                                                    {isRevealed ? ans : <span className="hidden-placeholder">?</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {state.currentAnswer && !state.choices && (
                                    <div className="gs-answer pop-in">
                                        {state.currentAnswer}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Overlays for buzz, timeout, and judgement */}
                        {(state.status === 'BUZZED' || state.status === 'TIMEOUT' || state.status === 'ANSWER_REVEALED') && (
                            <>
                                {state.status === 'TIMEOUT' && (
                                    <div className="buzzer-overlay state-timeout">
                                        TIME'S UP!
                                    </div>
                                )}

                                {state.status === 'ANSWER_REVEALED' && state.lastJudgement === true &&
                                    !(state.roundType === 'freezeout' && state.lockedOutTeams && state.teams && state.lockedOutTeams.length === state.teams.length) && (
                                        // User requested to remove the "CORRECT!" overlay tile.
                                        // Leaving empty fragment or null to keep logic structure if needed later, or cleaner just null.
                                        null
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
                    const isBuzzed = state.status === 'BUZZED' && state.buzzerWinner === i;
                    return (
                        <div
                            key={t.name}
                            className={`score-pod ${t.score === maxScore && t.score > 0 ? 'leader' : ''} ${isLocked ? 'locked-out' : ''} ${isBuzzed ? 'active-buzzer' : ''}`}
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
