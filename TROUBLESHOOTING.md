# 🚨 Troubleshooting Guide - "Connecting..." Issue

## Quick Fix Checklist

### ✅ Step 1: Start the Server

**Open Terminal/Command Prompt:**

```bash
# Navigate to your project folder
cd emoji-battle-server

# Install dependencies (first time only)
npm install

# Start the server
npm start
```

**You should see:**
```
🎮 Emoji Battle Server running on port 3000
🌐 Server ready for connections
```

**If you DON'T see this:**
- You may not have Node.js installed → [Download Node.js](https://nodejs.org)
- You may be in the wrong folder → Make sure you're in the folder with `server.js`
- Port 3000 might be in use → Change port in server.js to 4000

---

### ✅ Step 2: Access via Browser CORRECTLY

**❌ WRONG - Don't do this:**
- Double-clicking the HTML file
- Opening file:///C:/Users/...
- Dragging HTML into browser

**✅ CORRECT - Do this:**
1. Make sure server is running (see Step 1)
2. Open browser
3. Type: `http://localhost:3000/diagnostic.html`
4. Press Enter

---

### ✅ Step 3: Use the Diagnostic Tool

Once the server is running:

1. Go to: **http://localhost:3000/diagnostic.html**
2. Look at the checklist - it will tell you exactly what's wrong
3. Follow the suggestions

---

## Common Issues & Solutions

### Issue #1: "I double-clicked the HTML file"

**Problem:** You're seeing `file:///C:/Users/...` in the address bar

**Solution:**
1. Close that tab
2. Start the server: `npm start`
3. Open browser to: `http://localhost:3000/diagnostic.html`

---

### Issue #2: "npm: command not found"

**Problem:** Node.js is not installed

**Solution:**
1. Go to https://nodejs.org
2. Download and install the LTS version
3. Close and reopen your terminal
4. Try `npm start` again

---

### Issue #3: "Port 3000 is already in use"

**Problem:** Another program is using port 3000

**Solution Option A - Find what's using it:**
```bash
# Windows
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :3000
```

**Solution Option B - Use a different port:**
1. Open `server.js`
2. Find: `const PORT = process.env.PORT || 3000;`
3. Change to: `const PORT = process.env.PORT || 4000;`
4. Save and restart server
5. Access via: `http://localhost:4000/diagnostic.html`

---

### Issue #4: "Socket.io library not found"

**Problem:** Server isn't serving the Socket.io client library

**Symptoms:**
- Browser console shows 404 for `/socket.io/socket.io.js`
- Diagnostic shows "Socket.io library not loaded"

**Solution:**
1. Make sure you ran `npm install` first
2. Check that `node_modules` folder exists
3. Restart the server
4. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)

---

### Issue #5: "Nothing happens when I run npm start"

**Checklist:**
- [ ] Are you in the correct folder? (Should contain `server.js` and `package.json`)
- [ ] Did you run `npm install` first?
- [ ] Is Node.js installed? Test with: `node --version`
- [ ] Any error messages in terminal?

---

### Issue #6: "Server starts but browser can't connect"

**Check firewall:**
```bash
# Windows - Allow Node.js through firewall
# Mac - System Preferences > Security > Firewall
```

**Try different localhost variations:**
- http://localhost:3000/diagnostic.html
- http://127.0.0.1:3000/diagnostic.html
- http://[::1]:3000/diagnostic.html

---

## Testing Procedure

### 1️⃣ Server Test

**Terminal:**
```bash
npm start
```

**Expected output:**
```
🎮 Emoji Battle Server running on port 3000
🌐 Server ready for connections
```

**✅ If you see this → Server is working!**

---

### 2️⃣ Diagnostic Test

**Browser:**
```
http://localhost:3000/diagnostic.html
```

**Expected result:**
- ✅ All green checkmarks
- "Connected Successfully!"
- Socket ID displayed

**✅ If you see this → Everything works!**

---

### 3️⃣ Health Check Test

**Browser (or terminal):**
```
http://localhost:3000/health
```

**Expected response:**
```json
{"status":"OK","players":0}
```

**✅ If you see this → Server is responding!**

---

### 4️⃣ Multi-Player Test

1. Open: `http://localhost:3000/diagnostic.html`
2. Open another tab: `http://localhost:3000/diagnostic.html`
3. Both should connect
4. Both should show different Socket IDs

**✅ If both connect → Multiplayer ready!**

---

## Still Not Working?

### Get More Information

**1. Check browser console (F12):**
- Look for red errors
- Copy any error messages

**2. Check server terminal:**
- Look for error messages
- Copy the full output

**3. Check versions:**
```bash
node --version    # Should be v18 or higher
npm --version     # Should be 8 or higher
```

---

## Quick Test Script

Copy and paste this into your terminal:

```bash
# Quick diagnostic
echo "=== Node.js Version ==="
node --version

echo ""
echo "=== NPM Version ==="
npm --version

echo ""
echo "=== Current Directory ==="
pwd

echo ""
echo "=== Files in Directory ==="
ls -la

echo ""
echo "=== Starting Server ==="
npm start
```

---

## Need to Reset Everything?

If things are really broken:

```bash
# Stop server (Ctrl+C)

# Remove node_modules
rm -rf node_modules

# Remove lock file
rm package-lock.json

# Reinstall everything
npm install

# Start fresh
npm start
```

---

## What Should Work

**✅ This will work:**
1. Terminal: `npm start`
2. Browser: `http://localhost:3000/diagnostic.html`
3. See: "Connected Successfully!"

**❌ This will NOT work:**
1. Double-click HTML file
2. See: `file:///` in address bar
3. Stuck at: "Connecting..."

---

## Summary

**The #1 issue is usually:**
> Opening the HTML file directly instead of accessing it through the server

**Always:**
1. ✅ Start server: `npm start`
2. ✅ Open browser to: `http://localhost:3000/diagnostic.html`
3. ✅ Never open HTML files directly

---

**Still stuck?** Check what the diagnostic tool says - it will tell you exactly what's wrong!
