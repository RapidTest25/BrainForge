import { notulenService } from './modules/notulen/notulen.service.js';

/**
 * Simple cron scheduler — runs notulen daily summaries at 12:00 PM.
 * Uses setInterval to check every minute if it's noon.
 */
export function startCronJobs() {
  let lastRunDate = '';

  const checkAndRun = async () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // Run at 12:00 PM (noon) once per day
    if (hours === 12 && minutes === 0 && lastRunDate !== dateKey) {
      lastRunDate = dateKey;
      console.log(`[Cron] Running daily notulen summaries at ${now.toISOString()}`);
      try {
        const results = await notulenService.runDailySummaries();
        const succeeded = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        console.log(`[Cron] Notulen summaries complete: ${succeeded} succeeded, ${failed} failed`);
      } catch (err: any) {
        console.error('[Cron] Notulen daily summary error:', err.message);
      }
    }
  };

  // Check every 60 seconds
  setInterval(checkAndRun, 60 * 1000);
  console.log('[Cron] Daily notulen cron scheduled for 12:00 PM');
}
