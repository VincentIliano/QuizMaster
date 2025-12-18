
import { useEffect, useState } from 'react';

export default function ContestantRoundSummary({ state }) {
    const [animatedScores, setAnimatedScores] = useState([]);
    const [revealed, setRevealed] = useState(false);

    // Calculate start and end scores
    useEffect(() => {
        if (!state || !state.teams) return;

        let currentRound = null;
        if (state.roundIndex >= 0 && state.roundsSummary) {
            currentRound = state.roundsSummary[state.roundIndex];
        } else {
            currentRound = state.roundsSummary.find(r => r.name === state.roundName);
        }

        const roundScores = currentRound ? (currentRound.scores || {}) : {};

        const initialScores = state.teams.map((t, i) => {
            const currentScore = t.score;
            let startScore = currentScore; // Default if no snapshot

            if (state.roundStartScores && state.roundStartScores[i] !== undefined) {
                startScore = state.roundStartScores[i];
            } else {
                // Fallback to legacy tracking if snapshot missing
                const earned = roundScores[i] !== undefined ? roundScores[i] : (roundScores[t.name] || 0);
                startScore = currentScore - earned;
            }

            return {
                name: t.name,
                end: currentScore,
                start: startScore,
                earned: currentScore - startScore
            };
        });

        setAnimatedScores(initialScores);
    }, [state]);

    // Trigger animation after mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setRevealed(true);
        }, 1500); // Wait for pop-in to finish (approx 1.4s for last item) -> 1.5s
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="game-show-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <h1 className="slide-up" style={{ fontSize: '4em', marginBottom: '50px', textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>
                ROUND SUMMARY
            </h1>

            <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', minHeight: '50vh' }}>
                {(() => {
                    // Calculate max absolute score to determine scale
                    const allValues = animatedScores.flatMap(s => [s.start, s.end]);
                    const maxAbsScore = Math.max(50, ...allValues.map(v => Math.abs(v)));

                    return animatedScores.map((t, i) => {
                        const currentVal = revealed ? t.end : t.start;
                        const absVal = Math.abs(currentVal);
                        const percentage = Math.max(0, (absVal / maxAbsScore) * 100);

                        return (
                            <div
                                key={i}
                                className="score-bar-container pop-in-stagger"
                                style={{
                                    animationDelay: `${i * 0.2}s`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    width: '120px'
                                }}
                            >
                                {/* Score Number */}
                                <div style={{ fontSize: '2.5em', fontWeight: 'bold', marginBottom: '10px' }}>
                                    <CountUp start={t.start} end={t.end} duration={2} delay={1.5} />
                                </div>

                                {/* Points Earned Indicator (Reserved space) */}
                                <div
                                    className="earned-badge slide-up"
                                    style={{
                                        animationDelay: `${1.5 + i * 0.2}s`,
                                        color: t.earned > 0 ? '#4caf50' : '#f44336',
                                        fontWeight: 'bold',
                                        marginBottom: '10px',
                                        visibility: t.earned !== 0 ? 'visible' : 'hidden',
                                        minHeight: '1.5em' // Ensure fixed height reservation
                                    }}
                                >
                                    {t.earned !== 0 ? (t.earned > 0 ? `+${t.earned}` : t.earned) : '0'}
                                </div>

                                {/* Positive Bar Section (Fixed Height baseline) */}
                                <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', borderBottom: '2px solid rgba(255,255,255,0.3)' }}>
                                    {currentVal >= 0 && (
                                        <div
                                            className="score-bar"
                                            style={{
                                                width: '100%',
                                                background: 'linear-gradient(to top, #4facfe 0%, #00f2fe 100%)',
                                                borderRadius: '10px 10px 0 0',
                                                transition: 'height 2s ease-out',
                                                height: `${percentage}%`,
                                                minHeight: currentVal > 0 ? '5px' : '0'
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Negative Bar Section (Grows Down) */}
                                <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', position: 'relative' }}>
                                    {/* Name Overlay (Always visible at zero line) */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        width: '100%',
                                        textAlign: 'center',
                                        zIndex: 10,
                                        fontSize: '1.2em',
                                        fontWeight: 'bold',
                                        textShadow: '0 0 4px rgba(0,0,0,0.8)'
                                    }}>
                                        {t.name}
                                    </div>

                                    {currentVal < 0 && (
                                        <div
                                            className="score-bar"
                                            style={{
                                                width: '100%',
                                                background: 'linear-gradient(to bottom, #ff9966 0%, #ff5e62 100%)',
                                                borderRadius: '0 0 10px 10px',
                                                transition: 'height 2s ease-out',
                                                height: `${(percentage / 100) * 300}px`, // Map percentage back to pixel height relative to the 300px base
                                                minHeight: '5px'
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    });
                })()}
            </div>
        </div>
    );
}

// Helper for counting animation
function CountUp({ start, end, duration, delay }) {
    const [count, setCount] = useState(start);

    useEffect(() => {
        let startTime;
        let animationFrame;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = (timestamp - startTime) / (duration * 1000);

            if (progress < 1) {
                setCount(Math.floor(start + (end - start) * progress));
                animationFrame = requestAnimationFrame(animate);
            } else {
                setCount(end);
            }
        };

        const timeout = setTimeout(() => {
            animationFrame = requestAnimationFrame(animate);
        }, delay * 1000);

        return () => {
            clearTimeout(timeout);
            cancelAnimationFrame(animationFrame);
        };
    }, [start, end, duration, delay]);

    return <span>{count}</span>;
}
