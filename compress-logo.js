#!/usr/bin/env node

/**
 * Automated Logo Compression Script
 * Compresses duken-logo.png from 307KB to ~20KB
 * 
 * Usage: node compress-logo.js
 */

import { createRequire } from 'module';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const LOGO_PATH = join(__dirname, 'src', 'assets', 'duken-logo.png');
const OUTPUT_PATH = join(__dirname, 'src', 'assets', 'duken-logo-compressed.png');

console.log('🖼️  Duken Logo Compression Tool\n');

// Check if sharp is installed
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('⚠️  sharp library not installed.');
  console.log('\n📦 Installing sharp...');
  console.log('Run: npm install --save-dev sharp\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 MANUAL INSTRUCTIONS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('1. Go to: https://squoosh.app/\n');
  console.log('2. Upload: src/assets/duken-logo.png\n');
  console.log('3. Settings:');
  console.log('   - Resize: 200px width');
  console.log('   - Format: WebP');
  console.log('   - Quality: 80\n');
  console.log('4. Download and replace: src/assets/duken-logo.png\n');
  console.log('5. Expected size: ~15-20KB (was 307KB)\n');
  console.log('6. Then run: npm run build\n');
  process.exit(0);
}

async function compressLogo() {
  try {
    if (!existsSync(LOGO_PATH)) {
      console.error(`❌ Logo file not found: ${LOGO_PATH}`);
      process.exit(1);
    }

    // Get original file size
    const originalBuffer = readFileSync(LOGO_PATH);
    const originalSize = originalBuffer.length;
    
    console.log(`📂 Original file: ${LOGO_PATH}`);
    console.log(`📏 Original size: ${(originalSize / 1024).toFixed(2)} KB\n`);

    // Compress with sharp
    console.log('🔄 Compressing logo...');
    
    const compressedBuffer = await sharp(originalBuffer)
      .resize(200, undefined, { // Resize to 200px width, maintain aspect ratio
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ 
        quality: 80,
        effort: 6 // Higher effort = better compression (0-6)
      })
      .toBuffer();

    // Save compressed version
    writeFileSync(OUTPUT_PATH, compressedBuffer);
    
    const compressedSize = compressedBuffer.length;
    const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    console.log(`✅ Compressed file: ${OUTPUT_PATH}`);
    console.log(`📏 Compressed size: ${(compressedSize / 1024).toFixed(2)} KB`);
    console.log(`📉 Reduction: ${reduction}%\n`);

    if (compressedSize > 50 * 1024) {
      console.log('⚠️  File still larger than expected.');
      console.log('💡 Try manual compression with squoosh.app for better results.\n');
    } else {
      console.log('🎉 Great compression! Ready to replace original.\n');
      console.log('To replace original:');
      console.log(`  mv "${OUTPUT_PATH}" "${LOGO_PATH}"\n`);
    }

    console.log('Next steps:');
    console.log('  1. Verify compressed logo looks good');
    console.log('  2. Replace original: mv src/assets/duken-logo-compressed.png src/assets/duken-logo.png');
    console.log('  3. Rebuild: npm run build');
    console.log('  4. Test: npm run preview\n');

  } catch (error) {
    console.error('❌ Error compressing logo:', error.message);
    console.log('\n💡 Fallback: Use manual compression at https://squoosh.app/\n');
    process.exit(1);
  }
}

compressLogo();
