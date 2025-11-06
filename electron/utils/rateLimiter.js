/**
 * Rate Limiter Utility
 * Manages API rate limits with configurable thresholds and request queuing
 */

class RateLimiter {
  constructor(db) {
    this.db = db;
    this.providers = {
      alpaca: {
        requests: 0,
        resetTime: Date.now() + 60000,
        maxPerMinute: 10000, // Default for paid plan
        dailyRequests: 0,
        dailyResetTime: Date.now() + 86400000,
        maxPerDay: null, // No daily limit for Alpaca
        queue: [],
        processing: false,
      },
      alphaVantage: {
        requests: 0,
        resetTime: Date.now() + 60000,
        maxPerMinute: 5, // Default for free tier
        dailyRequests: 0,
        dailyResetTime: Date.now() + 86400000,
        maxPerDay: 25, // Default for free tier
        queue: [],
        processing: false,
      },
    };

    // Load configuration from database if available
    this.loadConfiguration();
  }

  /**
   * Load rate limit configuration from database
   */
  loadConfiguration() {
    if (!this.db) return;

    try {
      // Load Alpaca settings
      const alpacaMinute = this.db
        .prepare('SELECT value FROM app_settings WHERE key = ?')
        .get('alpaca_rate_limit_per_minute');
      if (alpacaMinute) {
        this.providers.alpaca.maxPerMinute = parseInt(alpacaMinute.value);
      }

      const alpacaDay = this.db
        .prepare('SELECT value FROM app_settings WHERE key = ?')
        .get('alpaca_rate_limit_per_day');
      if (alpacaDay && alpacaDay.value !== 'null') {
        this.providers.alpaca.maxPerDay = parseInt(alpacaDay.value);
      }

      // Load Alpha Vantage settings
      const avMinute = this.db
        .prepare('SELECT value FROM app_settings WHERE key = ?')
        .get('alpha_vantage_rate_limit_per_minute');
      if (avMinute) {
        this.providers.alphaVantage.maxPerMinute = parseInt(avMinute.value);
      }

      const avDay = this.db
        .prepare('SELECT value FROM app_settings WHERE key = ?')
        .get('alpha_vantage_rate_limit_per_day');
      if (avDay) {
        this.providers.alphaVantage.maxPerDay = parseInt(avDay.value);
      }

      console.log('Rate limits loaded from database:', {
        alpaca: {
          perMinute: this.providers.alpaca.maxPerMinute,
          perDay: this.providers.alpaca.maxPerDay,
        },
        alphaVantage: {
          perMinute: this.providers.alphaVantage.maxPerMinute,
          perDay: this.providers.alphaVantage.maxPerDay,
        },
      });
    } catch (error) {
      console.error('Error loading rate limit configuration:', error.message);
      // Use defaults
    }
  }

  /**
   * Save rate limit configuration to database
   */
  saveConfiguration(provider, settings) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const prefix = provider === 'alpaca' ? 'alpaca' : 'alpha_vantage';

    try {
      if (settings.maxPerMinute !== undefined) {
        this.db
          .prepare(
            `INSERT OR REPLACE INTO app_settings (key, value)
             VALUES (?, ?)`
          )
          .run(`${prefix}_rate_limit_per_minute`, settings.maxPerMinute.toString());
        this.providers[provider].maxPerMinute = settings.maxPerMinute;
      }

      if (settings.maxPerDay !== undefined) {
        const value = settings.maxPerDay === null ? 'null' : settings.maxPerDay.toString();
        this.db
          .prepare(
            `INSERT OR REPLACE INTO app_settings (key, value)
             VALUES (?, ?)`
          )
          .run(`${prefix}_rate_limit_per_day`, value);
        this.providers[provider].maxPerDay = settings.maxPerDay;
      }

      console.log(`Rate limits updated for ${provider}:`, settings);
    } catch (error) {
      console.error(`Error saving rate limit configuration for ${provider}:`, error.message);
      throw error;
    }
  }

  /**
   * Execute a request with rate limiting
   * @param {string} provider - 'alpaca' or 'alphaVantage'
   * @param {Function} requestFn - Async function to execute
   * @param {Object} options - { priority: 'high'|'normal', timeout: ms }
   * @returns {Promise} - Resolves with request result
   */
  async executeRequest(provider, requestFn, options = {}) {
    const { priority = 'normal', timeout = 30000 } = options;

    return new Promise((resolve, reject) => {
      const request = {
        fn: requestFn,
        resolve,
        reject,
        priority,
        timestamp: Date.now(),
        timeout,
      };

      // Add to queue
      if (priority === 'high') {
        this.providers[provider].queue.unshift(request);
      } else {
        this.providers[provider].queue.push(request);
      }

      // Start processing queue
      this.processQueue(provider);
    });
  }

  /**
   * Process queued requests with rate limiting
   */
  async processQueue(provider) {
    const limits = this.providers[provider];

    // Already processing
    if (limits.processing) return;

    limits.processing = true;

    while (limits.queue.length > 0) {
      const now = Date.now();

      // Reset minute counter if needed
      if (now > limits.resetTime) {
        limits.requests = 0;
        limits.resetTime = now + 60000;
      }

      // Reset daily counter if needed
      if (now > limits.dailyResetTime) {
        limits.dailyRequests = 0;
        limits.dailyResetTime = now + 86400000;
      }

      // Check if we can make a request
      if (limits.requests >= limits.maxPerMinute) {
        // Wait until reset
        const waitTime = limits.resetTime - now;
        console.log(`${provider} rate limit reached, waiting ${waitTime}ms...`);
        await this.sleep(waitTime);
        continue;
      }

      if (limits.maxPerDay && limits.dailyRequests >= limits.maxPerDay) {
        const waitTime = limits.dailyResetTime - now;
        console.log(`${provider} daily limit reached, waiting ${waitTime}ms...`);
        await this.sleep(Math.min(waitTime, 60000)); // Wait max 1 minute at a time
        continue;
      }

      // Get next request from queue
      const request = limits.queue.shift();

      // Check if request timed out
      if (now - request.timestamp > request.timeout) {
        request.reject(new Error('Request timeout'));
        continue;
      }

      // Execute request
      try {
        limits.requests++;
        limits.dailyRequests++;

        const result = await request.fn();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }

      // Small delay between requests to avoid bursting
      await this.sleep(100);
    }

    limits.processing = false;
  }

  /**
   * Execute multiple requests with batching and throttling
   * Automatically distributes requests over time to stay under rate limits
   */
  async executeBatch(provider, requestFunctions, options = {}) {
    const { batchSize = 10, delayBetweenBatches = 1000 } = options;
    const results = [];

    // Process in batches
    for (let i = 0; i < requestFunctions.length; i += batchSize) {
      const batch = requestFunctions.slice(i, i + batchSize);

      // Execute batch in parallel with rate limiting
      const batchResults = await Promise.allSettled(
        batch.map((fn) => this.executeRequest(provider, fn, options))
      );

      results.push(...batchResults);

      // Delay between batches (except for last batch)
      if (i + batchSize < requestFunctions.length) {
        await this.sleep(delayBetweenBatches);
      }
    }

    return results;
  }

  /**
   * Get current rate limit status
   */
  getStatus() {
    const status = {};

    for (const [provider, limits] of Object.entries(this.providers)) {
      status[provider] = {
        requestsThisMinute: limits.requests,
        maxPerMinute: limits.maxPerMinute,
        requestsToday: limits.dailyRequests,
        maxPerDay: limits.maxPerDay,
        queuedRequests: limits.queue.length,
        minuteResetsIn: Math.max(0, limits.resetTime - Date.now()),
        dayResetsIn: Math.max(0, limits.dailyResetTime - Date.now()),
      };
    }

    return status;
  }

  /**
   * Check if a request can be made immediately
   */
  canMakeRequest(provider) {
    const limits = this.providers[provider];
    const now = Date.now();

    // Reset counters if needed
    if (now > limits.resetTime) {
      limits.requests = 0;
      limits.resetTime = now + 60000;
    }

    if (now > limits.dailyResetTime) {
      limits.dailyRequests = 0;
      limits.dailyResetTime = now + 86400000;
    }

    // Check limits
    if (limits.requests >= limits.maxPerMinute) return false;
    if (limits.maxPerDay && limits.dailyRequests >= limits.maxPerDay) return false;

    return true;
  }

  /**
   * Reset all counters (for testing)
   */
  reset(provider) {
    if (provider) {
      this.providers[provider].requests = 0;
      this.providers[provider].dailyRequests = 0;
      this.providers[provider].queue = [];
    } else {
      // Reset all
      for (const limits of Object.values(this.providers)) {
        limits.requests = 0;
        limits.dailyRequests = 0;
        limits.queue = [];
      }
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = RateLimiter;
