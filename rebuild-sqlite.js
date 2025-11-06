#!/usr/bin/env node
/**
 * Helper script to rebuild better-sqlite3 for Electron
 * Checks Python version and provides helpful error messages
 */

const { execSync } = require('child_process');
const { platform } = require('os');

console.log('============================================');
console.log('  Rebuilding better-sqlite3 for Electron');
console.log('============================================\n');

// Check Python version
console.log('Step 1: Checking Python version...');
try {
  const pythonCmd = platform() === 'win32' ? 'python' : 'python3';
  const version = execSync(`${pythonCmd} --version`, { encoding: 'utf8' }).trim();
  console.log(`✓ Found: ${version}`);

  // Extract version number
  const match = version.match(/Python (\d+)\.(\d+)/);
  if (match) {
    const major = parseInt(match[1]);
    const minor = parseInt(match[2]);

    if (major === 3 && minor >= 8 && minor <= 12) {
      console.log('✓ Python version is compatible\n');
    } else if (major === 3 && minor === 13) {
      console.error('\n❌ ERROR: Python 3.13 is not supported by node-gyp yet!');
      console.error('\nPlease install Python 3.12 from: https://www.python.org/downloads/');
      console.error('\nWindows: After installing, set the PYTHON environment variable:');
      console.error('  setx PYTHON "C:\\Python312\\python.exe" /M');
      console.error('\nThen restart your terminal and run this script again.');
      process.exit(1);
    } else {
      console.warn(`⚠ Warning: Python ${major}.${minor} may not be compatible. Supported: Python 3.8-3.12\n`);
    }
  }
} catch (error) {
  console.error('❌ Python not found!');
  console.error('Please install Python 3.8-3.12 from: https://www.python.org/downloads/');
  process.exit(1);
}

// Rebuild better-sqlite3
console.log('Step 2: Rebuilding better-sqlite3...');
try {
  execSync('npx @electron/rebuild -f -w better-sqlite3', {
    stdio: 'inherit',
    shell: true
  });

  console.log('\n============================================');
  console.log('  ✅ Rebuild successful!');
  console.log('============================================\n');
  console.log('You can now run: npm run dev');

} catch (error) {
  console.error('\n============================================');
  console.error('  ❌ Rebuild failed!');
  console.error('============================================\n');
  console.error('Common issues:');
  console.error('1. Python version incompatible (need 3.8-3.12, not 3.13)');
  console.error('2. Visual Studio Build Tools not installed (Windows)');
  console.error('3. node-gyp not configured correctly');
  console.error('\nSee INSTALL.md for detailed troubleshooting.');
  process.exit(1);
}
