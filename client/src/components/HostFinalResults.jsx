
import { socket } from '../socket';

export default function HostFinalResults({ state }) {
    const revealNext = () => socket.emit('reveal_next_finalist');
    const returnDashboard = () => socket.emit('return_to_dashboard');

    const revealCount = state.finalistRevealCount || 0;
    const totalTeams = state.teams.length;

    return (
        <div className="panel" style={{ textAlign: 'center' }}>
            <h1>Final Results Control</h1>
            <div style={{ fontSize: '1.5em', margin: '20px 0' }}>
                Revealed: {revealCount} / {totalTeams}
            </div>

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '30px' }}>
                <button
                    onClick={revealNext}
                    disabled={revealCount >= totalTeams}
                    className="btn"
                    style={{ background: '#4caf50', color: 'white', padding: '20px 40px', fontSize: '1.2em' }}
                >
                    Reveal Next Finalist
                </button>

                <button
                    onClick={returnDashboard}
                    className="btn"
                    style={{ background: '#666', color: 'white' }}
                >
                    Return to Dashboard
                </button>
            </div>
        </div>
    );
}
