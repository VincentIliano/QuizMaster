import { useState, useEffect } from 'react';
import { socket } from './socket';
import HostDashboard from './components/HostDashboard';
import RoundReady from './components/RoundReady';
import HostControlPanel from './components/HostControlPanel';

import HostRoundSummary from './components/HostRoundSummary';
import HostConnections from './components/HostConnections';
import HostFinalResults from './components/HostFinalResults';

export default function Host() {
    const [state, setState] = useState(null);

    useEffect(() => {
        const onState = (s) => setState(s);
        const onTimer = (val) => setState(prev => prev ? ({ ...prev, timeLimit: val }) : prev);

        socket.on('state_update', onState);
        socket.on('timer_tick', onTimer);

        // Request initial state on mount
        socket.emit('get_state');

        return () => {
            socket.off('state_update', onState);
            socket.off('timer_tick', onTimer);
        };
    }, []);

    if (!state) return <div>Connecting to Host Console...</div>;

    if (state.status === 'DASHBOARD') {
        return <HostDashboard state={state} />;
    }

    if (state.status === 'ROUND_READY') {
        return <RoundReady state={state} />;
    }

    if (state.status === 'ROUND_SUMMARY') {
        return <HostRoundSummary state={state} />;
    }

    if (state.status === 'FINAL_RESULTS') {
        return <HostFinalResults state={state} />;
    }

    if (state.roundType === 'connections') {
        return <HostConnections state={state} />;
    }

    return <HostControlPanel state={state} />;
}
