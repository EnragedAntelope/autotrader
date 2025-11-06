#!/usr/bin/env node
/**
 * Helper script to rebuild better-sqlite3 for Electron
 * Checks Python version and provides helpful error messages
 * Reads .npmrc for project-specific Python configuration
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
  console.error('Then run this script again:');
  console.error('  npm run rebuild\n');
  process.exit(1);
}

// Check if Electron is installed
const electronPath = path.join(__dirname, 'node_modules', 'electron');
if (!fs.existsSync(electronPath)) {
  console.error('❌ ERROR: Electron not found!\n');
  console.error('You need to install dependencies first:');
  console.error('  npm install\n');
  console.error('Then run this script again:');
  console.error('  npm run rebuild\n');
  process.exit(1);
}

console.log('✓ node_modules and Electron found\n');

// Function to read Python path from .npmrc
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
        const pythonPath = trimmed.substring('python='.length).trim();
        return pythonPath;
      }
    }
  } catch (error) {
    console.warn('⚠ Warning: Could not read .npmrc file');
  }

  return null;
}

// Determine which Python to use
let pythonCmd;
const npmrcPython = getPythonFromNpmrc();

if (npmrcPython) {
  pythonCmd = `"${npmrcPython}"`;
  console.log(`✓ Using Python from .npmrc: ${npmrcPython}\n`);
} else {
  pythonCmd = platform() === 'win32' ? 'python' : 'python3';
  console.log('✓ Using system Python (no .npmrc configuration)\n');
}

// Check Python version
console.log('Step 1: Checking Python version...');
try {
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
      console.error('\n📝 SOLUTION: Create a .npmrc file in the project root with:');
      console.error('   python=C:\\python312\\python.exe');
      console.error('\n   (Use the path to your Python 3.12 installation)');
      console.error('\nAlternatively, install Python 3.12 from: https://www.python.org/downloads/');
      console.error('\nSee .npmrc.example for a template.');
      process.exit(1);
    } else {
      console.warn(`⚠ Warning: Python ${major}.${minor} may not be compatible. Supported: Python 3.8-3.12\n`);
    }
  }
} catch (error) {
  console.error('❌ Python not found!');
  if (npmrcPython) {
    console.error(`\nThe Python path in .npmrc is invalid: ${npmrcPython}`);
    console.error('Please check that the path is correct and the file exists.');
  } else {
    console.error('\nPlease either:');
    console.error('1. Install Python 3.8-3.12 from: https://www.python.org/downloads/');
    console.error('2. Or create a .npmrc file with: python=C:\\path\\to\\python312\\python.exe');
  }
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
