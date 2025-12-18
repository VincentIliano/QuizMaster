
import { useState, useEffect } from 'react';
import { socket } from '../socket';

export default function HostDashboard({ state }) {
    const [teamInputs, setTeamInputs] = useState(['', '', '', '', '']);

    // Sync inputs with current state teams
    useEffect(() => {
        if (state && state.teams) {
            const newInputs = Array(5).fill('');
            state.teams.forEach((t, i) => {
                if (i < 5) newInputs[i] = t.name;
            });
            if (JSON.stringify(newInputs) !== JSON.stringify(teamInputs)) {
                setTeamInputs(newInputs);
            }
        }
    }, [state]);

    const updateTeams = () => {
        const validTeams = teamInputs.filter(t => t.trim());
        if (validTeams.length > 0) socket.emit('set_teams', validTeams);
    };

    const startRound = (index) => socket.emit('set_round', index);

    const updateScore = (index, val) => {
        socket.emit('update_score', index, parseInt(val) || 0);
    };

    const roundData = state.roundsSummary || [];

    return (
        <div className="panel dashboard-grid">
            <div className="card">
                <h2>Teams</h2>
                <div className="team-inputs">
                    {teamInputs.map((name, i) => (
                        <input
                            key={i}
                            type="text"
                            placeholder={`Team ${i + 1}`}
                            value={name}
                            onChange={e => {
                                const newInputs = [...teamInputs];
                                newInputs[i] = e.target.value;
                                setTeamInputs(newInputs);
                            }}
                        />
                    ))}
                </div>
                <button onClick={updateTeams} className="btn-primary" style={{ marginTop: 10 }}>Update Teams</button>

                <h3 style={{ marginTop: 20 }}>Score Adjustments</h3>
                <div className="team-inputs">
                    {state.teams.map((t, i) => (
                        <div key={i} style={{ marginBottom: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ marginRight: 10 }}>{t.name || `Team ${i + 1}`}</span>
                            <input
                                type="number"
                                value={t.score}
                                onChange={e => updateScore(i, e.target.value)}
                                style={{ width: 80, padding: 5 }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h2>Rounds</h2>
                <div className="round-tiles-container">
                    {state.roundsSummary && state.roundsSummary.map(r => (
                        <div
                            key={r.index}
                            className={`round-tile ${r.questionsAnswered >= r.totalQuestions ? 'completed' : ''}`}
                            onClick={() => startRound(r.index)}
                        >
                            <h3>{r.name}</h3>
                            <div>{r.questionsAnswered} / {r.totalQuestions}</div>
                            {r.scores && (
                                <div className="tile-scores">
                                    {Object.entries(r.scores).map(([k, v]) => {
                                        // k might be index (new) or name (old)
                                        let teamName = k;
                                        if (!isNaN(parseInt(k)) && state.teams[parseInt(k)]) {
                                            teamName = state.teams[parseInt(k)].name;
                                        }
                                        return <div key={k}>{teamName}: {v}</div>;
                                    })}
                                </div>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent clicking tile
                                    if (confirm('Are you sure you want to reset this round?')) {
                                        socket.emit('reset_round', r.index);
                                    }
                                }}
                                style={{
                                    marginTop: '10px',
                                    padding: '5px 10px',
                                    background: '#e74c3c',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.8em',
                                    cursor: 'pointer'
                                }}
                            >
                                Reset Round
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: '40px', padding: '20px', borderTop: '1px solid #444', textAlign: 'center', gridColumn: '1 / -1' }}>
                <button
                    className="btn "
                    style={{ background: '#ffd700', color: '#000', padding: '15px 30px', fontSize: '1.2em', fontWeight: 'bold' }}
                    onClick={() => {
                        if (confirm('Are you sure you want to go to the Final Results screen?')) {
                            socket.emit('go_to_final_results');
                        }
                    }}
                >
                    GO TO FINAL RESULTS
                </button>
            </div>
        </div>
    );
}
