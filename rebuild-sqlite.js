#!/usr/bin/env node
/**
 * Helper script to rebuild better-sqlite3 for Electron
 * Uses npm rebuild with Electron headers (no @electron/rebuild dependency)
 */

const { execSync } = require('child_process');
const { platform } = require('os');
const fs = require('fs');
const path = require('path');

console.log('============================================');
console.log('  Rebuilding better-sqlite3 for Electron');
console.log('============================================\n');

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.error('❌ ERROR: node_modules not found!\n');
  console.error('You need to install dependencies first:');
  console.error('  npm install\n');
  process.exit(1);
}

// Check if Electron is installed
const electronPath = path.join(__dirname, 'node_modules', 'electron');
if (!fs.existsSync(electronPath)) {
  console.error('❌ ERROR: Electron not found!\n');
  console.error('You need to install dependencies first:');
  console.error('  npm install\n');
  process.exit(1);
}

console.log('✓ node_modules and Electron found\n');

// Get Electron version
let electronVersion;
try {
  const packagePath = path.join(electronPath, 'package.json');
  const electronPkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  electronVersion = electronPkg.version;
  console.log(`✓ Electron version: ${electronVersion}\n`);
} catch (error) {
  console.error('❌ Could not read Electron version');
  process.exit(1);
}

// Check Python (for informational purposes)
function getPythonFromNpmrc() {
  const npmrcPath = path.join(__dirname, '.npmrc');
  if (!fs.existsSync(npmrcPath)) {
    return null;
  }

  try {
    const npmrcContent = fs.readFileSync(npmrcPath, 'utf8');
    const lines = npmrcContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('python=')) {
        return trimmed.substring('python='.length).trim();
      }
    }
  } catch (error) {
    // Ignore
  }

  return null;
}

const npmrcPython = getPythonFromNpmrc();
if (npmrcPython) {
  console.log(`✓ Using Python from .npmrc: ${npmrcPython}`);
} else {
  console.log('ℹ No .npmrc Python configuration found (using system Python)');
}

console.log('\nStep 1: Checking Python version...');
try {
  const pythonCmd = npmrcPython ? `"${npmrcPython}"` : (platform() === 'win32' ? 'python' : 'python3');
  const version = execSync(`${pythonCmd} --version`, { encoding: 'utf8' }).trim();
  console.log(`✓ Found: ${version}`);

  const match = version.match(/Python (\d+)\.(\d+)/);
  if (match) {
    const major = parseInt(match[1]);
    const minor = parseInt(match[2]);

    if (major === 3 && minor >= 8 && minor <= 12) {
      console.log('✓ Python version is compatible\n');
    } else if (major === 3 && minor === 13) {
      console.error('\n⚠ WARNING: Python 3.13 detected!');
      console.error('node-gyp supports Python 3.8-3.12 only.');
      console.error('\nTo use Python 3.12 for this project only:');
      console.error('1. Download portable Python 3.12');
      console.error('2. Create .npmrc file with: python=C:\\path\\to\\python312\\python.exe');
      console.error('\nProceeding anyway (may fail)...\n');
    } else {
      console.warn(`⚠ Warning: Python ${major}.${minor} detected. Supported: 3.8-3.12\n`);
    }
  }
} catch (error) {
  console.warn('⚠ Warning: Could not check Python version');
  console.warn('If rebuild fails, ensure Python 3.8-3.12 is installed\n');
}

// Rebuild better-sqlite3 using npm rebuild with Electron headers
console.log('Step 2: Rebuilding better-sqlite3 for Electron...');
console.log('This uses npm rebuild (not @electron/rebuild) to avoid dependency issues.\n');

try {
  // Set environment variables for the rebuild
  const env = { ...process.env };
  env.npm_config_target = electronVersion;
  env.npm_config_arch = process.arch;
  env.npm_config_target_arch = process.arch;
  env.npm_config_dist_url = 'https://electronjs.org/headers';
  env.npm_config_runtime = 'electron';
  env.npm_config_build_from_source = 'true';

  execSync('npm rebuild better-sqlite3 --build-from-source', {
    stdio: 'inherit',
    env,
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
  console.error('Common causes:');
  console.error('1. Python version incompatible (need 3.8-3.12, not 3.13)');
  console.error('2. Visual Studio Build Tools not installed (Windows)');
  console.error('3. node-gyp not configured correctly');
  console.error('\nFor Python 3.13 users:');
  console.error('  Create .npmrc file with: python=C:\\path\\to\\python312\\python.exe');
  console.error('\nSee INSTALL.md for detailed troubleshooting.');
  process.exit(1);
}
