/**
 * Update Checker Service
 * Checks for new versions of the application from GitHub releases
 */

const axios = require('axios');
const { app } = require('electron');

class UpdateChecker {
  constructor() {
    this.currentVersion = this.getCurrentVersion();
    this.githubRepo = 'EnragedAntelope/autotrader';
    this.checkInterval = 24 * 60 * 60 * 1000; // Check once per day
    this.lastCheckTime = null;
  }

  /**
   * Get current application version from package.json
   */
  getCurrentVersion() {
    try {
      const packageJson = require('../../package.json');
      return packageJson.version || '1.0.0';
    } catch (error) {
      console.error('Error reading package.json:', error);
      return '1.0.0';
    }
  }

  /**
   * Check for updates from GitHub releases
   * @returns {Promise<Object>} Update information
   */
  async checkForUpdates() {
    try {
      this.lastCheckTime = Date.now();

      const url = `https://api.github.com/repos/${this.githubRepo}/releases/latest`;
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Alpaca-Trading-Scanner'
        },
        timeout: 10000
      });

      const latestRelease = response.data;
      const latestVersion = latestRelease.tag_name.replace(/^v/, ''); // Remove 'v' prefix if present

      const updateAvailable = this.compareVersions(latestVersion, this.currentVersion) > 0;

      return {
        updateAvailable,
        currentVersion: this.currentVersion,
        latestVersion,
        releaseNotes: latestRelease.body,
        releaseUrl: latestRelease.html_url,
        downloadUrl: latestRelease.assets && latestRelease.assets.length > 0
          ? latestRelease.assets[0].browser_download_url
          : latestRelease.html_url,
        publishedAt: latestRelease.published_at
      };
    } catch (error) {
      console.error('Error checking for updates:', error.message);

      // Provide helpful error messages
      let errorMessage = error.message;
      if (error.response && error.response.status === 404) {
        errorMessage = 'No releases found on GitHub. This is normal for development - releases are only available in production builds.';
      } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        errorMessage = 'Unable to connect to GitHub. Check your internet connection.';
      }

      // Return safe fallback
      return {
        updateAvailable: false,
        currentVersion: this.currentVersion,
        latestVersion: this.currentVersion,
        error: errorMessage
      };
    }
  }

  /**
   * Compare two semantic version strings
   * @param {string} v1 - First version
   * @param {string} v2 - Second version
   * @returns {number} 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }

  /**
   * Check if it's time to check for updates again
   * @returns {boolean} True if should check
   */
  shouldCheck() {
    if (!this.lastCheckTime) return true;
    return (Date.now() - this.lastCheckTime) >= this.checkInterval;
  }

  /**
   * Get time until next automatic check
   * @returns {number} Milliseconds until next check
   */
  getTimeUntilNextCheck() {
    if (!this.lastCheckTime) return 0;
    const elapsed = Date.now() - this.lastCheckTime;
    return Math.max(0, this.checkInterval - elapsed);
  }
}

module.exports = new UpdateChecker();
