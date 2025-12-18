
import React, { useEffect, useState } from 'react';
import './ContestantConnections.css'; // We'll create this CSS

export default function ContestantConnections({ state }) {
    const gridItems = state.gridItems || [];
    const solvedGroups = state.solvedGroups || [];
    const groups = state.groups || [];

    // Separate solved and unsolved items
    // Solved items should be grouped by their groupIndex
    // Unsolved items remain in the "grid"

    // Calculate layout:
    // Solved groups go to the top as "Banners"
    // Unsolved items fill the remaining grid slots below

    // We need to render the banners corresponding to solved groups
    // And the grid of remaining items.

    return (
        <div className="connections-container">
            {/* Header / Timer / Buzzer Overlay */}
            {state.buzzerWinner !== null && (
                <div className="buzzer-overlay animate-pop">
                    {state.teams[state.buzzerWinner].name} BUZZED!
                </div>
            )}

            {/* Solved Banners */}
            <div className="solved-section">
                {groups.map((g, i) => {
                    if (solvedGroups.includes(i)) {
                        return (
                            <div key={i} className={`group-banner group-color-${i} slide-in`}>
                                <h2>{g.name}</h2>
                                <div className="group-items">{g.items.join(' • ')}</div>
                            </div>
                        );
                    }
                    return null;
                })}
            </div>

            {/* Unsolved Grid */}
            <div className="grid-section">
                {gridItems.filter(item => !item.solved).map((item) => (
                    <div key={item.id} className="grid-card pop-in">
                        {item.text}
                    </div>
                ))}
            </div>
        </div>
    );
}
