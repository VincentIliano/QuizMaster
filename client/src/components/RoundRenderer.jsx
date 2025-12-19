
import React from 'react';
import StandardRound from './rounds/StandardRound';
import FreezeOutRound from './rounds/FreezeOutRound';
import ContestantConnections from './ContestantConnections';

// This component decides which specific round component to render
// based on the state.roundType provided by the backend.
export default function RoundRenderer({ state, animClass }) {
    switch (state.roundType) {
        case 'freezeout':
            return <FreezeOutRound state={state} animClass={animClass} />;
        case 'connections':
            return <ContestantConnections state={state} />;
        case 'standard':
        default:
            return <StandardRound state={state} animClass={animClass} />;
    }
}
