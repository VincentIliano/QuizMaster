
import { useState, useEffect } from 'react';
import { socket } from '../socket';

export default function HostSettings({ state, onBack }) {
    const [rounds, setRounds] = useState([]);
    const [selectedRoundIndex, setSelectedRoundIndex] = useState(0);
    const [editingQuestion, setEditingQuestion] = useState(null); // null or { index, data }

    const [loading, setLoading] = useState(true);

    // Init from state
    useEffect(() => {
        setLoading(true);
        socket.emit('get_rounds', (data) => {
            if (data) {
                setRounds(JSON.parse(JSON.stringify(data)));
            }
            setLoading(false);
        });
    }, []);

    const handleSave = () => {
        if (confirm('Save changes? This will impact the running game.')) {
            socket.emit('update_quiz_data', rounds);
            onBack();
        }
    };

    const updateRoundField = (field, value) => {
        const newRounds = [...rounds];
        newRounds[selectedRoundIndex] = { ...newRounds[selectedRoundIndex], [field]: value };
        setRounds(newRounds);
    };

    const deleteQuestion = (qIndex) => {
        if (confirm('Delete this question?')) {
            const newRounds = [...rounds];
            const round = newRounds[selectedRoundIndex];
            round.questions.splice(qIndex, 1);
            setRounds(newRounds);
        }
    };

    const saveQuestion = (qData) => {
        const newRounds = [...rounds];
        const round = newRounds[selectedRoundIndex];

        if (editingQuestion.index === -1) {
            // Add new
            round.questions.push(qData);
        } else {
            // Update
            round.questions[editingQuestion.index] = qData;
        }
        setRounds(newRounds);
        setEditingQuestion(null);
    };

    const currentRound = rounds[selectedRoundIndex];

    if (loading) return <div>Loading...</div>;
    if (!currentRound) return <div>No rounds loaded.</div>;

    const isConnections = currentRound.type === 'connections';

    return (
        <div className="panel settings-panel" style={{ height: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1>Settings & Content Management</h1>
                <div>
                    <button className="btn" onClick={onBack} style={{ marginRight: 10, background: '#666' }}>Cancel</button>
                    <button className="btn" onClick={handleSave} style={{ background: '#4caf50' }}>Save Changes</button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 20 }}>
                {/* Round List Sidebar */}
                <div style={{ width: '250px', borderRight: '1px solid #444', paddingRight: 20 }}>
                    <h3>Rounds</h3>
                    {rounds.map((r, i) => (
                        <div
                            key={i}
                            style={{
                                padding: '10px',
                                background: i === selectedRoundIndex ? '#ffd700' : '#333',
                                color: i === selectedRoundIndex ? '#000' : '#fff',
                                marginBottom: 5,
                                cursor: 'pointer',
                                borderRadius: 4
                            }}
                            onClick={() => setSelectedRoundIndex(i)}
                        >
                            {r.name}
                        </div>
                    ))}
                    <button
                        className="btn"
                        style={{ width: '100%', marginTop: 10, background: '#3498db', fontSize: '0.9em' }}
                        onClick={() => {
                            const type = prompt('Enter round type (standard, countdown, connections):', 'standard');
                            if (type) {
                                const cleanType = type.toLowerCase();
                                let newRound = {
                                    name: 'New Round',
                                    type: cleanType,
                                    time_limit: 30,
                                    points: 10,
                                    description: 'New round description',
                                    questions: []
                                };

                                if (cleanType === 'connections') {
                                    newRound.description = 'Find the connection groups.';
                                    newRound.questions = [{ groups: [] }];
                                } else if (cleanType === 'countdown') {
                                    newRound.points = 0;
                                    newRound.description = 'Push your luck! Points = Time Remaining.';
                                }

                                const newRounds = [...rounds, newRound];
                                setRounds(newRounds);
                                setSelectedRoundIndex(newRounds.length - 1);
                            }
                        }}
                    >
                        + Add Round
                    </button>
                </div>

                {/* Round Details */}
                <div style={{ flex: 1 }}>
                    {editingQuestion ? (
                        isConnections ? (
                            <ConnectionsEditor
                                question={editingQuestion.data}
                                onSave={saveQuestion}
                                onCancel={() => setEditingQuestion(null)}
                            />
                        ) : (
                            <QuestionEditor
                                question={editingQuestion.data}
                                onSave={saveQuestion}
                                onCancel={() => setEditingQuestion(null)}
                            />
                        )
                    ) : (
                        <>
                            <h2>Round Details ({currentRound.type || 'Standard'})</h2>
                            <div className="form-group" style={{ marginBottom: 15 }}>
                                <label>Name</label>
                                <input
                                    value={currentRound.name}
                                    onChange={e => updateRoundField('name', e.target.value)}
                                    style={{ width: '100%', padding: 8 }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 15 }}>
                                <label>Description</label>
                                <textarea
                                    value={currentRound.description || ''}
                                    onChange={e => updateRoundField('description', e.target.value)}
                                    style={{ width: '100%', padding: 8, height: 60 }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                                <div>
                                    {currentRound.type === 'countdown' ? (
                                        <div style={{ paddingTop: 24, fontStyle: 'italic', color: '#aaa' }}>
                                            Points = Time Remaining
                                        </div>
                                    ) : (
                                        <>
                                            <label>Points per Q</label>
                                            <input
                                                type="number"
                                                value={currentRound.points || 0}
                                                onChange={e => updateRoundField('points', parseInt(e.target.value))}
                                                style={{ width: 80, padding: 8, display: 'block' }}
                                            />
                                        </>
                                    )}
                                </div>
                                <div>
                                    <label>Time Limit (s)</label>
                                    <input
                                        type="number"
                                        value={currentRound.time_limit || 0}
                                        onChange={e => updateRoundField('time_limit', parseInt(e.target.value))}
                                        style={{ width: 80, padding: 8, display: 'block' }}
                                    />
                                </div>
                            </div>

                            <h3>Questions ({currentRound.questions ? currentRound.questions.length : 0})</h3>
                            <button
                                className="btn"
                                style={{ background: '#3498db', marginBottom: 10, fontSize: '0.9em', padding: '5px 10px' }}
                                onClick={() => setEditingQuestion({ index: -1, data: isConnections ? { groups: [] } : { text: '', answer: '' } })}
                            >
                                + Add {isConnections ? 'Puzzle' : 'Question'}
                            </button>

                            <div className="questions-list">
                                {currentRound.questions && currentRound.questions.map((q, i) => (
                                    <div key={i} style={{
                                        background: '#222', padding: 10, marginBottom: 5, borderRadius: 4,
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            {isConnections ? (
                                                <div style={{ fontWeight: 'bold' }}>Puzzle {i + 1} ({q.groups ? q.groups.length : 0} Groups)</div>
                                            ) : (
                                                <>
                                                    <div style={{ fontWeight: 'bold' }}>{q.text}</div>
                                                    <div style={{ color: '#888', fontSize: '0.9em' }}>Ans: {q.answer}</div>
                                                </>
                                            )}
                                        </div>
                                        <div>
                                            <button
                                                onClick={() => setEditingQuestion({ index: i, data: q })}
                                                style={{ marginRight: 5, padding: '5px' }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => deleteQuestion(i)}
                                                style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '5px' }}
                                            >
                                                Del
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function QuestionEditor({ question, onSave, onCancel }) {
    const [data, setData] = useState({ ...question });

    const handleChange = (field, val) => setData({ ...data, [field]: val });

    return (
        <div style={{ background: '#333', padding: 20, borderRadius: 8 }}>
            <h3>{question.text ? 'Edit Question' : 'New Question'}</h3>
            <div style={{ marginBottom: 10 }}>
                <label>Question Text</label>
                <input
                    value={data.text || ''}
                    onChange={e => handleChange('text', e.target.value)}
                    style={{ width: '100%', padding: 8 }}
                />
            </div>
            <div style={{ marginBottom: 10 }}>
                <label>Answer</label>
                <input
                    value={data.answer || ''}
                    onChange={e => handleChange('answer', e.target.value)}
                    style={{ width: '100%', padding: 8 }}
                />
            </div>
            <div style={{ marginBottom: 10 }}>
                <label>Media URL (Optional)</label>
                <input
                    value={data.mediaUrl || ''}
                    onChange={e => handleChange('mediaUrl', e.target.value)}
                    style={{ width: '100%', padding: 8 }}
                />
            </div>
            <div style={{ marginBottom: 10 }}>
                <label>Media Type</label>
                <select
                    value={data.mediaType || 'image'}
                    onChange={e => handleChange('mediaType', e.target.value)}
                    style={{ padding: 8, marginLeft: 10 }}
                >
                    <option value="image">Image</option>
                    <option value="audio">Audio</option>
                    <option value="video">Video</option>
                </select>
            </div>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
                <button onClick={onCancel} style={{ padding: '10px 20px', marginRight: 10 }}>Cancel</button>
                <button onClick={() => onSave(data)} style={{ padding: '10px 20px', background: '#4caf50', color: 'white', border: 'none' }}>Save</button>
            </div>
        </div>
    );
}

function ConnectionsEditor({ question, onSave, onCancel }) {
    // question structure should be { groups: [...] }
    const [data, setData] = useState({ groups: [], ...question });

    const handleGroupChange = (gIndex, field, val) => {
        const newGroups = [...data.groups];
        newGroups[gIndex] = { ...newGroups[gIndex], [field]: val };
        setData({ ...data, groups: newGroups });
    };

    const handleItemChange = (gIndex, iIndex, val) => {
        const newGroups = [...data.groups];
        const newItems = [...newGroups[gIndex].items];
        newItems[iIndex] = val;
        newGroups[gIndex].items = newItems;
        setData({ ...data, groups: newGroups });
    };

    const addGroup = () => {
        setData({
            ...data,
            groups: [...(data.groups || []), { name: 'New Group', items: ['', '', '', ''] }]
        });
    };

    const removeGroup = (index) => {
        if (confirm('Delete this group?')) {
            const newGroups = [...data.groups];
            newGroups.splice(index, 1);
            setData({ ...data, groups: newGroups });
        }
    };

    return (
        <div style={{ background: '#333', padding: 20, borderRadius: 8 }}>
            <h3>Edit Connections Puzzle</h3>

            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {data.groups && data.groups.map((group, gIndex) => (
                    <div key={gIndex} style={{ background: '#444', padding: 10, marginBottom: 10, borderRadius: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <input
                                value={group.name}
                                onChange={e => handleGroupChange(gIndex, 'name', e.target.value)}
                                style={{ fontWeight: 'bold', width: '70%', padding: 5 }}
                                placeholder="Group Name"
                            />
                            <button onClick={() => removeGroup(gIndex)} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '2px 8px' }}>X</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                            {group.items.map((item, iIndex) => (
                                <input
                                    key={iIndex}
                                    value={item}
                                    onChange={e => handleItemChange(gIndex, iIndex, e.target.value)}
                                    style={{ padding: 5 }}
                                    placeholder={`Item ${iIndex + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={addGroup} style={{ width: '100%', padding: 10, background: '#3498db', border: 'none', color: 'white', marginTop: 10 }}>
                + Add Group
            </button>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
                <button onClick={onCancel} style={{ padding: '10px 20px', marginRight: 10 }}>Cancel</button>
                <button onClick={() => onSave(data)} style={{ padding: '10px 20px', background: '#4caf50', color: 'white', border: 'none' }}>Save</button>
            </div>
        </div>
    );
}
