const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const wwwDir = path.join(rootDir, 'www');

// Ensure www exists
if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir, { recursive: true });
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Copy HTML pages
const htmlFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));
for (const file of htmlFiles) {
  let content = fs.readFileSync(path.join(rootDir, file), 'utf8');
  // Inject is-apk-native class into html tag if not present
  if (!content.includes('is-apk-native')) {
    content = content.replace('<html lang="en">', '<html lang="en" class="is-apk-native">')
                     .replace('<html>', '<html class="is-apk-native">');
  }
  fs.writeFileSync(path.join(wwwDir, file), content, 'utf8');
  console.log(`Copied ${file} -> www/${file} (with is-apk-native)`);
}

// 2. Copy directories
copyDirectory(path.join(rootDir, 'css'), path.join(wwwDir, 'css'));
console.log('Copied css -> www/css');

copyDirectory(path.join(rootDir, 'js'), path.join(wwwDir, 'js'));
console.log('Copied js -> www/js');

copyDirectory(path.join(rootDir, 'assets'), path.join(wwwDir, 'assets'));
console.log('Copied assets -> www/assets');

console.log('Web assets successfully synced to www folder!');
