const cron = require('node-cron');
const scannerService = require('./scannerService');
const alpacaService = require('./alpacaService');

/**
 * Scheduler Service - Manages automated scanning
 * Handles cron jobs for scheduled profile scans
 */

class SchedulerService {
  constructor() {
    this.jobs = new Map(); // profileId -> cron job
    this.isRunning = false;
    this.db = null;
  }

  /**
   * Start the scheduler with database connection
   */
  start(database) {
    this.db = database;
    this.isRunning = true;

    // Load all profiles with scheduling enabled
    const profiles = this.db
      .prepare('SELECT * FROM screening_profiles WHERE schedule_enabled = 1')
      .all();

    console.log(`Starting scheduler with ${profiles.length} active profiles`);

    // Schedule each profile
    for (const profile of profiles) {
      this.scheduleProfile(profile);
    }

    // Update app settings
    this.db
      .prepare("UPDATE app_settings SET value = 'true' WHERE key = 'scheduler_running'")
      .run();
  }

  /**
   * Stop the scheduler and cancel all jobs
   */
  stop() {
    console.log('Stopping scheduler');
    this.isRunning = false;

    // Stop all cron jobs
    for (const [profileId, job] of this.jobs.entries()) {
      job.stop();
      console.log(`Stopped job for profile ${profileId}`);
    }

    this.jobs.clear();

    // Update app settings
    if (this.db) {
      this.db
        .prepare("UPDATE app_settings SET value = 'false' WHERE key = 'scheduler_running'")
        .run();
    }
  }

  /**
   * Schedule a specific profile
   */
  scheduleProfile(profile) {
    // Remove existing job if any
    if (this.jobs.has(profile.id)) {
      this.jobs.get(profile.id).stop();
    }

    const interval = profile.schedule_interval || 15; // Default 15 minutes
    const cronExpression = this.getCronExpression(interval);

    console.log(`Scheduling profile ${profile.id} (${profile.name}) with interval: ${interval} minutes`);

    const job = cron.schedule(cronExpression, async () => {
      await this.executeScheduledScan(profile);
    });

    this.jobs.set(profile.id, job);
  }

  /**
   * Execute a scheduled scan
   */
  async executeScheduledScan(profile) {
    try {
      // Check if market hours only is enabled
      if (profile.schedule_market_hours_only) {
        const isOpen = await alpacaService.isMarketOpen();
        if (!isOpen) {
          console.log(`Skipping scan for profile ${profile.id} - market is closed`);
          return;
        }
      }

      console.log(`Executing scheduled scan for profile ${profile.id} (${profile.name})`);

      // Run the scan
      const results = await scannerService.runScan(profile.id, this.db);

      // Create notification for matches
      if (results.matches && results.matches.length > 0) {
        this.db.prepare(`
          INSERT INTO notifications (type, title, message, related_profile_id)
          VALUES ('success', ?, ?, ?)
        `).run(
          'Scan Complete',
          `Found ${results.matches.length} match(es) for "${profile.name}"`,
          profile.id
        );

        console.log(`Scan found ${results.matches.length} matches`);
      }
    } catch (error) {
      console.error(`Error in scheduled scan for profile ${profile.id}:`, error);

      // Create error notification
      this.db.prepare(`
        INSERT INTO notifications (type, title, message, related_profile_id)
        VALUES ('error', ?, ?, ?)
      `).run(
        'Scan Error',
        `Error scanning "${profile.name}": ${error.message}`,
        profile.id
      );
    }
  }

  /**
   * Convert interval in minutes to cron expression
   */
  getCronExpression(intervalMinutes) {
    if (intervalMinutes < 60) {
      // Every X minutes
      return `*/${intervalMinutes} * * * *`;
    } else if (intervalMinutes === 60) {
      // Every hour
      return '0 * * * *';
    } else {
      // Every X hours
      const hours = Math.floor(intervalMinutes / 60);
      return `0 */${hours} * * *`;
    }
  }

  /**
   * Add or update a scheduled profile
   */
  updateSchedule(profileId) {
    if (!this.db) {
      console.error('Database not initialized');
      return;
    }

    const profile = this.db
      .prepare('SELECT * FROM screening_profiles WHERE id = ?')
      .get(profileId);

    if (!profile) {
      console.error(`Profile ${profileId} not found`);
      return;
    }

    if (profile.schedule_enabled && this.isRunning) {
      this.scheduleProfile(profile);
    } else {
      // Remove from schedule
      if (this.jobs.has(profileId)) {
        this.jobs.get(profileId).stop();
        this.jobs.delete(profileId);
        console.log(`Removed schedule for profile ${profileId}`);
      }
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: this.jobs.size,
      scheduledProfiles: Array.from(this.jobs.keys()),
    };
  }

  /**
   * Get next run times for all scheduled profiles
   */
  getNextRunTimes() {
    const nextRuns = [];

    for (const [profileId, job] of this.jobs.entries()) {
      const profile = this.db
        .prepare('SELECT name, schedule_interval FROM screening_profiles WHERE id = ?')
        .get(profileId);

      if (profile) {
        nextRuns.push({
          profileId,
          profileName: profile.name,
          interval: profile.schedule_interval,
          // Note: node-cron doesn't expose next run time directly
          // This would need to be calculated based on interval
        });
      }
    }

    return nextRuns;
  }
}

module.exports = new SchedulerService();
