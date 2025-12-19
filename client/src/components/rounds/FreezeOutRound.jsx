
import React, { useRef, useEffect } from 'react';

export default function FreezeOutRound({ state, animClass }) {
    const mediaRef = useRef(null);

    useEffect(() => {
        if (!mediaRef.current) return;
        if (state.mediaPlaying) {
            mediaRef.current.play().catch(e => console.error("Play error:", e));
        } else {
            mediaRef.current.pause();
        }
    });

    return (
        <>
            <header className="gs-header">
                <div className="gs-round-name">{state.roundName}</div>
                {/* Timer is hidden in header for FreezeOut, shown in analog clock */}
            </header>

            <main className="gs-main" style={{ flexDirection: 'row', alignItems: 'center', gap: 40, padding: '0 40px' }}>

                {/* Large Analog Clock for Freezeout - Left Side */}
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

                {/* Question Card - Right Side */}
                {state.status !== 'IDLE' && (state.mediaUrl || state.question) && (
                    <div
                        className={`question-card ${animClass} ${state.status === 'LISTENING' ? 'listening-active' : ''}`}
                        style={{ flex: 1, maxWidth: 'none', height: 'auto' }}
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
            </main>
        </>
    );
}
