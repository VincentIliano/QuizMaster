
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
            <div className="connections-header" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '20px' }}>
                <div className={`gs-timer ${state.timeLimit <= 5 ? 'low' : ''}`} style={{ fontSize: '3em', fontWeight: 'bold', color: '#fff', background: '#333', padding: '10px 30px', borderRadius: '50px' }}>
                    {state.timeLimit}
                </div>
            </div>



            {/* Grid Section - All items stay in place, solved ones light up */}
            <div className="grid-section">
                {gridItems.map((item) => {
                    const isSolved = item.solved;
                    const groupColorClass = isSolved ? `group-color-${item.groupIndex} solved-card` : '';

                    return (
                        <div
                            key={item.id}
                            className={`grid-card ${groupColorClass} ${!isSolved ? 'pop-in' : ''}`}
                            style={{
                                transition: 'background-color 0.5s ease, transform 0.3s ease',
                                transform: isSolved ? 'scale(0.95)' : 'scale(1)'
                            }}
                        >
                            {/* Optional: Show Category Name overlay if solved? User didn't ask, but it helps. 
                                Let's keep it simple: Just Text + Color as requested.
                            */}
                            {item.text}
                        </div>
                    );
                })}
            </div>

            {/* Footer: Revealed Categories */}
            <div className="connections-footer" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: 'auto', minHeight: '100px' }}>
                {solvedGroups.map(groupIndex => {
                    const group = groups[groupIndex];
                    if (!group) return null;
                    return (
                        <div
                            key={groupIndex}
                            className={`group-banner group-color-${groupIndex} slide-in`}
                            style={{
                                animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                fontSize: '1.2em',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                padding: '10px',
                                textTransform: 'uppercase',
                                fontWeight: 'bold'
                            }}
                        >
                            {group.name}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
