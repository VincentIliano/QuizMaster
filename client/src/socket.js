import io from 'socket.io-client';

// Connect to backend (assuming localhost:3000)
const URL = 'http://localhost:3000';
export const socket = io(URL, {
    autoConnect: true
});
