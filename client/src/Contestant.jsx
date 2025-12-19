import React, { useEffect, useState, useRef } from 'react';
import { socket } from './socket';
import ContestantRoundSummary from './components/ContestantRoundSummary';
import ContestantFinalResults from './components/ContestantFinalResults';
import RoundRenderer from './components/RoundRenderer';

export default function Contestant() {
    const [state, setState] = useState(null);

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

    // Effect to play specific sounds based on exact state changes
    useEffect(() => {
        if (!state) return;

        // Buzzer Sound
        if (state.status === 'BUZZED' && buzzerAudioRef.current) {
            buzzerAudioRef.current.currentTime = 0;
            buzzerAudioRef.current.play().catch(() => { });
        }

        // Answer Revealed Sound (Correct or Wrong)
        if (state.status === 'ANSWER_REVEALED') {
            if (state.lastJudgement === true && correctAudioRef.current) {
                correctAudioRef.current.currentTime = 0;
                correctAudioRef.current.play().catch(() => { });
            } else if (state.lastJudgement === false && wrongAudioRef.current) {
                wrongAudioRef.current.currentTime = 0;
                wrongAudioRef.current.play().catch(() => { });
            }
        }

        // Wrong Answer (but game continues) -> Status is PAUSED, lastJudgement is false
        if (state.status === 'PAUSED' && state.lastJudgement === false && wrongAudioRef.current) {
            wrongAudioRef.current.currentTime = 0;
            wrongAudioRef.current.play().catch(() => { });
        }

        // Solved a Connection Group (Correct Sound)
        if (state.currentQuestionData && state.currentQuestionData.solvedGroups) {
            const currentCount = state.currentQuestionData.solvedGroups.length;
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
        if ((state.status === 'ALL_LOCKED' || state.status === 'TIMEOUT') && wrongAudioRef.current) {
            wrongAudioRef.current.currentTime = 0;
            wrongAudioRef.current.play().catch(() => { });
        }

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

        // Media playback logic moved to RoundRenderer components (StandardRound/FreezeOutRound)
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

    // Flash Red Effect
    return (
        <div className={`game-show-container ${containerClass} ${(state.status === 'PAUSED' && state.lastJudgement === false) ? 'flash-red' : ''}`}>

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
            ) : (
                <div style={{display: 'contents'}}>
                    <RoundRenderer state={state} animClass={animClass} />

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
                                    <div className={`buzzer-overlay state-correct`}>
                                        CORRECT!
                                    </div>
                                )}
                        </>
                    )}
                </div>
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
