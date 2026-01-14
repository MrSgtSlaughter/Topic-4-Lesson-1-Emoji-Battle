# Indus Valley Emoji Battle - Multiplayer Server

Multiplayer game server using Socket.io for real-time battles and quiz competitions.

## 🚀 Quick Deploy to Render

### Option 1: Deploy from GitHub (Recommended)

1. **Push this code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Emoji Battle Server"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy on Render:**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name:** `emoji-battle-server` (or your choice)
     - **Environment:** `Node`
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Plan:** Free
   - Click "Create Web Service"

3. **Done!** Render will build and deploy your server.
   Your game will be at: `https://your-service-name.onrender.com`

### Option 2: Manual Deploy

1. **Upload files to Render:**
   - Create a new Web Service on Render
   - Choose "Deploy from Git" or upload files manually
   - Ensure these files are included:
     - `server.js`
     - `package.json`
     - `public/` folder with your game HTML

2. **Environment Settings:**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Port: Render sets PORT automatically

## 📁 Project Structure

```
emoji-battle-server/
├── server.js           # Socket.io server (handles multiplayer)
├── package.json        # Node.js dependencies
├── public/             # Static files served to players
│   ├── index.html     # Main game (Socket.io version)
│   └── test.html      # Connection test page
└── README.md          # This file
```

## 🎮 Files Included

### 1. `server.js`
The Node.js server with Socket.io that handles:
- Player connections and rooms (Arena A, B, C, D, E)
- Real-time position updates
- Quiz battles between players
- Knockout tracking and leaderboards
- Automatic cleanup of old data

### 2. `package.json`
Dependencies:
- `express` - Web server
- `socket.io` - Real-time communication

### 3. `public/test.html`
**Test your server connection:**
- Visit `https://your-app.onrender.com/test.html`
- Test joining rooms
- See real-time player updates
- Check connection status

### 4. `public/index.html`
Your full Indus Valley Emoji Battle game (needs conversion - see below)

## 🔧 Converting Your Game to Socket.io

Your original game uses Firebase. To use it with this Socket.io server, you need to make these changes:

### Step 1: Replace Firebase SDK

**Find this in your HTML:**
```html
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
<!-- etc -->
```

**Replace with:**
```html
<script src="/socket.io/socket.io.js"></script>
```

### Step 2: Replace Firebase Configuration

**Find the Firebase config section (around line 695):**
```javascript
const firebaseConfig = { /* ... */ };
firebase.initializeApp(firebaseConfig);
// etc.
```

**Replace with:**
```javascript
let socket;
let connected = false;
let playerId = null;

socket = io();

socket.on('connect', () => {
    connected = true;
    playerId = socket.id;
    console.log('Connected:', playerId);
});

socket.on('disconnect', () => {
    connected = false;
});
```

### Step 3: Replace Variable Names

Find and replace throughout the file:
- `firebaseEnabled` → `connected`
- `authReady` → `connected`

### Step 4: Replace Firebase Functions

#### A) **Joining a Room** (in `startGame()` function)

**Old Firebase code:**
```javascript
database.ref(`rooms/${currentRoom}/players/${playerId}`).set({
    name: playerName,
    emoji: selectedEmoji,
    x: player.x,
    y: player.y,
    knockouts: 0
});
```

**New Socket.io code:**
```javascript
socket.emit('joinRoom', {
    room: currentRoom,
    playerData: {
        name: playerName,
        emoji: selectedEmoji,
        x: player.x,
        y: player.y,
        knockouts: 0
    }
});
```

#### B) **Syncing Player Position** (in `syncPlayerToFirebase()` function)

**Old:**
```javascript
database.ref(`rooms/${currentRoom}/players/${playerId}`).update({
    x: player.x,
    y: player.y,
    knockouts: player.knockouts
});
```

**New:**
```javascript
socket.emit('updatePlayer', {
    x: player.x,
    y: player.y,
    knockouts: player.knockouts
});
```

#### C) **Listening to Other Players**

**Old Firebase:**
```javascript
database.ref(`rooms/${currentRoom}/players`).on('value', (snapshot) => {
    const players = snapshot.val() || {};
    // update otherPlayers
});
```

**New Socket.io:**
```javascript
// Initial room state
socket.on('roomState', (data) => {
    otherPlayers = data.players || {};
    delete otherPlayers[playerId]; // Don't include yourself
});

// New player joined
socket.on('playerJoined', (data) => {
    if (data.playerId !== playerId) {
        otherPlayers[data.playerId] = data.playerData;
    }
});

// Player updated
socket.on('playerUpdate', (data) => {
    if (data.playerId !== playerId && otherPlayers[data.playerId]) {
        Object.assign(otherPlayers[data.playerId], data.playerData);
    }
});

// Player left
socket.on('playerLeft', (data) => {
    delete otherPlayers[data.playerId];
});
```

#### D) **Starting a Battle**

**Old:**
```javascript
database.ref(`rooms/${currentRoom}/battles/${battleId}`).set({
    initiator: playerId,
    target: targetId,
    question: question
});
```

**New:**
```javascript
socket.emit('startBattle', {
    initiator: playerId,
    target: targetId,
    question: question
});
```

#### E) **Battle Results**

**Old:**
```javascript
database.ref(`rooms/${currentRoom}/battles/${battleId}`).remove();
database.ref(`rooms/${currentRoom}/knockouts/${knockoutId}`).set({
    winner: winnerId,
    loser: loserId
});
```

**New:**
```javascript
socket.emit('battleResult', {
    battleId: battleId,
    winner: winnerId,
    loser: loserId,
    answerCorrect: true,
    answerTime: 3500
});
```

#### F) **Room Counts** (for lobby)

**Old:**
```javascript
database.ref('rooms').on('value', (snapshot) => {
    const rooms = snapshot.val() || {};
    // count players in each room
});
```

**New:**
```javascript
// Request counts
socket.emit('requestRoomCounts');

// Receive counts
socket.on('roomCounts', (counts) => {
    // counts = { 'arena-a': 5, 'arena-b': 3, ... }
    Object.keys(counts).forEach(room => {
        updateRoomUI(room, counts[room]);
    });
});
```

#### G) **Cleanup on Exit**

**Old:**
```javascript
window.addEventListener('beforeunload', () => {
    database.ref(`rooms/${currentRoom}/players/${playerId}`).remove();
});
```

**New:**
```javascript
// Socket.io handles this automatically!
// The server removes players on disconnect
// No code needed, but you can keep the event listener if you want
```

## 🧪 Testing Your Deployment

1. **Test page:** `https://your-app.onrender.com/test.html`
   - Should show "Connected ✓"
   - Try joining a room
   - Open in another tab/browser to test multiplayer

2. **Main game:** `https://your-app.onrender.com`
   - Enter your name and select arena
   - Should see connection status
   - Other players should appear when they join

## 📊 Monitoring Your Server

**Render Dashboard:**
- View logs: See all server activity
- Monitor usage: Check player counts
- Health checks: `/health` endpoint shows status

**Health Check URL:**
```
https://your-app.onrender.com/health
```
Returns: `{"status": "OK", "players": 12}`

## 🎯 Arena Configuration

The server supports 5 arenas by default:
- Arena A (`arena-a`)
- Arena B (`arena-b`)
- Arena C (`arena-c`)
- Arena D (`arena-d`)
- Arena E (`arena-e`)

Each arena is completely independent with its own:
- Players
- Battles
- Knockouts
- Leaderboard

## ⚡ Performance Notes

**Free Tier Limits (Render):**
- Server spins down after 15 minutes of inactivity
- First request after spindown takes ~30 seconds
- 750 hours/month free (enough for 24/7 if it's your only service)

**To keep server always on:**
- Upgrade to paid plan ($7/month)
- Or use a uptime monitoring service (like UptimeRobot) to ping every 10 minutes

## 🔒 School Network Compatibility

**Why Render Works in Schools:**
1. ✅ HTTPS by default (required by most schools)
2. ✅ WebSocket support (Socket.io automatically upgrades)
3. ✅ Standard ports (443/80 - rarely blocked)
4. ✅ .onrender.com domain (usually not on blocklists)

**If blocked anyway:**
- Ask IT to whitelist `*.onrender.com`
- Or use a custom domain (Render supports this)

## 📝 Next Steps

1. ✅ Deploy server to Render
2. ✅ Test with test.html
3. ⏭️ Convert your full game HTML to use Socket.io (see above)
4. ⏭️ Upload converted game to public/index.html
5. ⏭️ Test multiplayer with friends!

## 🆘 Troubleshooting

**"Cannot connect to server"**
- Check server logs in Render dashboard
- Verify server is running (not asleep)
- Check browser console for errors

**"Players not showing up"**
- Make sure both players are in same arena
- Check server logs for connection events
- Verify Socket.io script is loading (`/socket.io/socket.io.js`)

**"Server keeps sleeping"**
- This is normal on free tier
- First load takes 30 seconds after sleep
- Upgrade to paid or use uptime monitor

## 📚 Resources

- [Socket.io Documentation](https://socket.io/docs/)
- [Render Documentation](https://render.com/docs)
- [Express.js Guide](https://expressjs.com/guide)

## 🎓 Educational Use

This server is designed for classroom use with:
- Universal Design for Learning (UDL) principles
- Accessibility features (handled by game frontend)
- Safe, moderated content (Indus Valley history questions)
- No personal data collection

Perfect for:
- Social studies classes
- Ancient civilizations units
- Gamified learning experiences
- Multiplayer educational activities

---

**Created by Jason - PixelED Path LLC**
*Making education accessible and engaging through technology*
