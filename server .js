const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));

// Game state
const rooms = {
    'arena-a': { players: {}, battles: {}, knockouts: {} },
    'arena-b': { players: {}, battles: {}, knockouts: {} },
    'arena-c': { players: {}, battles: {}, knockouts: {} },
    'arena-d': { players: {}, battles: {}, knockouts: {} },
    'arena-e': { players: {}, battles: {}, knockouts: {} }
};

// Helper function to get room player count
function getRoomPlayerCount(roomName) {
    return Object.keys(rooms[roomName]?.players || {}).length;
}

io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);
    let currentRoom = null;
    let playerId = null;

    // Join room
    socket.on('joinRoom', (data) => {
        const { room, playerData } = data;
        currentRoom = room;
        playerId = socket.id;

        // Join socket.io room
        socket.join(room);

        // Initialize room if needed
        if (!rooms[room]) {
            rooms[room] = { players: {}, battles: {}, knockouts: {} };
        }

        // Add player to room
        rooms[room].players[playerId] = {
            ...playerData,
            id: playerId,
            lastUpdate: Date.now()
        };

        console.log(`Player ${playerData.name} joined ${room}`);

        // Send current room state to new player
        socket.emit('roomState', {
            players: rooms[room].players,
            battles: rooms[room].battles,
            knockouts: rooms[room].knockouts
        });

        // Broadcast new player to others in room
        socket.to(room).emit('playerJoined', {
            playerId: playerId,
            playerData: rooms[room].players[playerId]
        });

        // Broadcast updated room counts to everyone in lobby
        broadcastRoomCounts();
    });

    // Update player position
    socket.on('updatePlayer', (playerData) => {
        if (currentRoom && rooms[currentRoom] && rooms[currentRoom].players[playerId]) {
            rooms[currentRoom].players[playerId] = {
                ...rooms[currentRoom].players[playerId],
                ...playerData,
                lastUpdate: Date.now()
            };

            // Broadcast to others in room
            socket.to(currentRoom).emit('playerUpdate', {
                playerId: playerId,
                playerData: playerData
            });
        }
    });

    // Start battle
    socket.on('startBattle', (battleData) => {
        console.log('📥 Server received startBattle:', battleData);
        
        if (currentRoom && rooms[currentRoom]) {
            const battleId = `${battleData.initiator}_${battleData.target}_${Date.now()}`;
            rooms[currentRoom].battles[battleId] = {
                ...battleData,
                id: battleId,
                timestamp: Date.now()
            };

            console.log('💾 Battle stored:', battleId);
            console.log('📤 Emitting battleStarted to room:', currentRoom);

            // Send battle to both players
            io.to(currentRoom).emit('battleStarted', {
                battleId: battleId,
                battleData: rooms[currentRoom].battles[battleId]
            });

            console.log(`✅ Battle started in ${currentRoom}:`, battleId);
        } else {
            console.log('❌ No room found:', currentRoom);
        }
    });

    // Handle battle answer
    socket.on('answerBattle', (data) => {
        if (currentRoom && rooms[currentRoom]) {
            const { battleId, answerIndex } = data;
            const battle = rooms[currentRoom].battles[battleId];
            
            if (!battle) {
                console.log('Battle not found:', battleId);
                return;
            }

            // Track who answered
            if (!battle.answers) {
                battle.answers = {};
            }
            
            battle.answers[playerId] = {
                index: answerIndex,
                time: Date.now() - battle.timestamp,
                correct: answerIndex === battle.question.c
            };

            console.log(`${playerId} answered ${answerIndex} (correct: ${battle.question.c})`);

            // Check if both players have answered
            const initiatorAnswer = battle.answers[battle.initiator];
            const targetAnswer = battle.answers[battle.target];

            if (initiatorAnswer && targetAnswer) {
                // Determine winner
                let winner = null;
                let loser = null;

                if (initiatorAnswer.correct && !targetAnswer.correct) {
                    winner = battle.initiator;
                    loser = battle.target;
                } else if (!initiatorAnswer.correct && targetAnswer.correct) {
                    winner = battle.target;
                    loser = battle.initiator;
                } else if (initiatorAnswer.correct && targetAnswer.correct) {
                    // Both correct - fastest wins
                    if (initiatorAnswer.time < targetAnswer.time) {
                        winner = battle.initiator;
                        loser = battle.target;
                    } else {
                        winner = battle.target;
                        loser = battle.initiator;
                    }
                }
                // If both wrong, no winner

                // Update winner's knockouts
                if (winner && rooms[currentRoom].players[winner]) {
                    rooms[currentRoom].players[winner].knockouts = 
                        (rooms[currentRoom].players[winner].knockouts || 0) + 1;
                }

                // Broadcast result
                io.to(currentRoom).emit('battleResult', {
                    battleId,
                    winner,
                    loser,
                    winnerKnockouts: rooms[currentRoom].players[winner]?.knockouts || 0
                });

                // Clean up battle
                delete rooms[currentRoom].battles[battleId];

                console.log(`Battle ${battleId} complete: Winner = ${winner}`);
            }
        }
    });

    // Battle result
    socket.on('battleResult', (resultData) => {
        if (currentRoom && rooms[currentRoom]) {
            const { battleId, winner, loser, answerCorrect, answerTime } = resultData;

            // Remove battle from active battles
            delete rooms[currentRoom].battles[battleId];

            // Update player stats
            if (rooms[currentRoom].players[winner]) {
                rooms[currentRoom].players[winner].knockouts = 
                    (rooms[currentRoom].players[winner].knockouts || 0) + 1;
            }

            // Broadcast result to room
            io.to(currentRoom).emit('battleEnded', {
                battleId,
                winner,
                loser,
                answerCorrect,
                answerTime,
                winnerKnockouts: rooms[currentRoom].players[winner]?.knockouts || 0
            });

            // Record knockout
            const knockoutId = `ko_${Date.now()}`;
            rooms[currentRoom].knockouts[knockoutId] = {
                winner,
                loser,
                timestamp: Date.now()
            };

            console.log(`Battle result in ${currentRoom}: ${winner} defeated ${loser}`);
        }
    });

    // Request room counts (for lobby)
    socket.on('requestRoomCounts', () => {
        const counts = {};
        Object.keys(rooms).forEach(roomName => {
            counts[roomName] = getRoomPlayerCount(roomName);
        });
        socket.emit('roomCounts', counts);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        
        if (currentRoom && rooms[currentRoom] && rooms[currentRoom].players[playerId]) {
            // Remove player from room
            delete rooms[currentRoom].players[playerId];

            // Broadcast player left to others
            socket.to(currentRoom).emit('playerLeft', {
                playerId: playerId
            });

            console.log(`Player ${playerId} left ${currentRoom}`);
        }

        // Broadcast updated room counts
        broadcastRoomCounts();
    });

    // Chat message (if you want to add chat later)
    socket.on('chatMessage', (message) => {
        if (currentRoom) {
            io.to(currentRoom).emit('chatMessage', {
                playerId: playerId,
                playerName: rooms[currentRoom].players[playerId]?.name || 'Unknown',
                message: message,
                timestamp: Date.now()
            });
        }
    });
});

// Broadcast room counts to all connected clients
function broadcastRoomCounts() {
    const counts = {};
    Object.keys(rooms).forEach(roomName => {
        counts[roomName] = getRoomPlayerCount(roomName);
    });
    io.emit('roomCounts', counts);
}

// Clean up old battles and knockouts every minute
setInterval(() => {
    const now = Date.now();
    const BATTLE_TIMEOUT = 60000; // 1 minute
    const KNOCKOUT_RETENTION = 300000; // 5 minutes

    Object.keys(rooms).forEach(roomName => {
        // Clean old battles
        Object.keys(rooms[roomName].battles).forEach(battleId => {
            if (now - rooms[roomName].battles[battleId].timestamp > BATTLE_TIMEOUT) {
                delete rooms[roomName].battles[battleId];
            }
        });

        // Clean old knockouts
        Object.keys(rooms[roomName].knockouts).forEach(knockoutId => {
            if (now - rooms[roomName].knockouts[knockoutId].timestamp > KNOCKOUT_RETENTION) {
                delete rooms[roomName].knockouts[knockoutId];
            }
        });
    });
}, 60000);

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        players: Object.keys(rooms).reduce((acc, room) => 
            acc + getRoomPlayerCount(room), 0
        )
    });
});

server.listen(PORT, () => {
    console.log(`🎮 Emoji Battle Server running on port ${PORT}`);
    console.log(`🌐 Server ready for connections`);
});
