import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config'; // Load .env variables

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const CONFIG_FILE = path.join(__dirname, 'bot-config.json');

// Middleware
app.use(cors());
app.use(express.json());

// Helper to parse boolean env vars
const parseBool = (val) => val === 'true';

// Initial Env Config
const envConfig = {
  botName: process.env.BOT_NAME,
  prefix: process.env.BOT_PREFIX,
  ownerId: process.env.BOT_OWNER_ID,
  activityType: process.env.BOT_ACTIVITY_TYPE,
  statusText: process.env.BOT_STATUS_TEXT,
  onlineStatus: process.env.BOT_ONLINE_STATUS,
  debugMode: process.env.BOT_DEBUG_MODE ? parseBool(process.env.BOT_DEBUG_MODE) : undefined,
  developerMode: process.env.BOT_DEVELOPER_MODE ? parseBool(process.env.BOT_DEVELOPER_MODE) : undefined,
  syncCommands: process.env.BOT_SYNC_COMMANDS ? parseBool(process.env.BOT_SYNC_COMMANDS) : undefined
};

// API Routes
app.get('/api/config', async (req, res) => {
  try {
    // Try to read from file
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    const fileConfig = JSON.parse(data);
    
    // Merge: File config takes precedence for persistence locally, 
    // but we could allow ENV to override if we wanted to enforce it.
    // Here we'll treat ENV as defaults if file is missing/incomplete, 
    // or you could choose to overwrite file config with ENV.
    // For now: Return file config, but if fields are missing, fill from ENV.
    const mergedConfig = { ...envConfig, ...fileConfig };
    
    // If we want ENV to always override specific keys, swap the spread order:
    // const mergedConfig = { ...fileConfig, ...envConfig };
    
    res.json(mergedConfig);
  } catch (error) {
    console.error('Error reading config:', error);
    // If file doesn't exist, return env config
    res.json(envConfig);
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const newConfig = req.body;
    await fs.writeFile(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
    console.log('Configuration saved:', newConfig);
    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Error writing config:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Serve static files from the React build directory (dist)
// This will only be used in production (or when running node server.js manually)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Handle React routing, return all requests to React app
app.get(/.*/, (req, res) => {
  // Check if we are in a production environment or if dist exists
  // If dist/index.html doesn't exist, we might be in dev mode running server.js separately
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      if (req.originalUrl.startsWith('/api')) {
        res.status(404).json({ error: 'API endpoint not found' });
      } else {
        res.status(500).send('Server is running, but the React build (dist) is missing. Please run "npm run build" first.');
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
