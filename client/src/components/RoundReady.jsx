
import { socket } from '../socket';

export default function RoundReady({ state }) {
    const nextQuestion = () => socket.emit('next_question');
    const returnDashboard = () => socket.emit('return_to_dashboard');

    return (
        <div className="panel">
            <h1>Round: {state.roundName}</h1>
            <p>{state.roundDescription}</p>
            <div style={{ marginTop: 40, textAlign: 'center' }}>
                {state.upcomingQuestion && (
                    <div style={{ marginBottom: 20, padding: 15, background: '#444', borderRadius: 8 }}>
                        <strong>Next Up:</strong><br />
                        {state.upcomingQuestion}<br />
                        <em style={{ color: '#aaa' }}>({state.upcomingAnswer})</em>
                    </div>
                )}
                <button
                    onClick={nextQuestion}
                    style={{ fontSize: '2em', padding: '20px 40px', backgroundColor: '#28a745', color: 'white' }}
                >
                    START ROUND
                </button>
                <br /><br />
                <button onClick={returnDashboard} style={{ backgroundColor: '#555' }}>Cancel</button>
            </div>
        </div>
    );
}
