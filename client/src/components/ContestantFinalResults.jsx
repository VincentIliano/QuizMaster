import React, { useEffect } from 'react';

export default function ContestantFinalResults({ state }) {
    const standings = state.finalStandings || [];
    const revealCount = state.finalistRevealCount || 0;

    // We only show the first `revealCount` teams from the sorted list
    // The list is sorted by score ASC (Lowest to Highest)
    // So revealCount=1 shows the loser (or last place).
    // revealCount=N shows the winner (last).
    const visibleTeams = standings.slice(0, revealCount);

    return (
        <div className="game-show-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <h1 className="slide-up" style={{ fontSize: '4em', marginBottom: '40px', textShadow: '0 0 20px rgba(255,215,0,0.8)', color: '#ffd700' }}>
                FINAL RESULTS
            </h1>

            <div className="final-standings-list" style={{ display: 'flex', flexDirection: 'column-reverse', gap: '20px', width: '80%', maxWidth: '800px' }}>
                {visibleTeams.map((team, index) => {
                    // Calculate rank (1st is the LAST item in the full standings array)
                    // But actually, standing array is Lowest -> Highest.
                    // So index 0 is Last Place.
                    // index = standings.length - 1 is First Place.
                    const place = standings.length - index;

                    // Special styling for Top 3
                    let placeColor = '#eee';
                    let scale = 1;
                    if (place === 1) { placeColor = '#ffd700'; scale = 1.2; } // Gold
                    else if (place === 2) { placeColor = '#c0c0c0'; scale = 1.1; } // Silver
                    else if (place === 3) { placeColor = '#cd7f32'; scale = 1.05; } // Bronze

                    return (
                        <div
                            key={team.name}
                            className={place === 1 ? 'winner-reveal' : 'dramatic-reveal'}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: `linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(50,50,50,0.8) 100%)`,
                                padding: '20px',
                                borderRadius: '10px',
                                border: `2px solid ${placeColor}`,
                                transform: `scale(${scale})`,
                                boxShadow: `0 0 15px ${placeColor === '#eee' ? 'rgba(0,0,0,0.5)' : placeColor}`,
                                transition: 'all 0.5s ease-out'
                            }}
                        >
                            <div style={{
                                fontSize: '2.5em',
                                fontWeight: 'bold',
                                color: placeColor,
                                width: '60px',
                                textAlign: 'center',
                                marginRight: '20px'
                            }}>
                                {place}
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#fff' }}>{team.name}</div>
                            </div>
                            <div style={{
                                fontSize: '3em',
                                fontWeight: 'bold',
                                color: placeColor,
                                textShadow: '0 0 10px rgba(0,0,0,0.5)'
                            }}>
                                {team.score}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
