
import React, { useRef, useEffect } from 'react';

export default function StandardRound({ state, animClass }) {
    const mediaRef = useRef(null);

    // Sync media playback
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
                <div className={`gs-timer ${state.timeLimit <= 5 ? 'low' : ''}`}>
                    {state.timeLimit}
                </div>
            </header>

            <main className="gs-main">
                {state.status !== 'IDLE' && (state.mediaUrl || state.question) && (
                    <div
                        className={`question-card ${animClass} ${state.status === 'LISTENING' ? 'listening-active' : ''}`}
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
