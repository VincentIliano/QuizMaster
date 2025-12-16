const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');

const Storage = require('./services/Storage');
const GameEngine = require('./services/GameEngine');
const socketHandler = require('./handlers/SocketHandler');

const app = express();
app.use(cors()); // Allow Vite dev server
app.use(express.static(path.join(__dirname, 'public')));
// Also serve client build if available (for production)
// app.use(express.static(path.join(__dirname, '../client/dist')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

// Initialize Services
const storage = new Storage(__dirname);
const gameEngine = new GameEngine(storage);

// Initialize Socket Handlers
socketHandler(io, gameEngine);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
