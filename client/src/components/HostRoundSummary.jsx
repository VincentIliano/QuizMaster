
import { socket } from '../socket';

export default function HostRoundSummary({ state }) {
    const finishRound = () => socket.emit('finish_round');

    return (
        <div className="panel" style={{ textAlign: 'center' }}>
            <h1>Round Complete!</h1>
            <h2>{state.roundName}</h2>

            <div style={{ margin: '40px 0', fontSize: '1.2em' }}>
                <p>Reviewing Scores...</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: '400px', margin: '0 auto' }}>
                    {state.teams.map((t, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, background: '#333', borderRadius: 5 }}>
                            <span>{t.name}</span>
                            <strong>{t.score}</strong>
                        </div>
                    ))}
                </div>
            </div>

            <button
                onClick={finishRound}
                style={{ fontSize: '1.5em', padding: '15px 30px', backgroundColor: '#646cff', color: 'white' }}
            >
                Return to Dashboard
            </button>
        </div>
    );
}
