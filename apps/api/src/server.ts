import { buildApp } from './app.js';
import { setupSocket } from './socket.js';
import { startCronJobs } from './cron.js';

const PORT = parseInt(process.env.API_PORT || '4000', 10);
const HOST = process.env.API_HOST || '0.0.0.0';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    
    // Set up Socket.IO on the underlying HTTP server
    const httpServer = app.server;
    setupSocket(httpServer);
    
    console.log(`🧠 BrainForge API running at http://${HOST}:${PORT}`);
    console.log(`🔌 Socket.IO ready on /brainstorm namespace`);
    
    // Start cron jobs (daily notulen at 12:00 PM)
    startCronJobs();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
