const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'frontend');
const dest = path.join(root, 'public');

console.log('CWD:', process.cwd());
console.log('Root:', root);
console.log('Source:', src);
console.log('Source exists:', fs.existsSync(src));

if (!fs.existsSync(src)) {
  console.error('ERROR: frontend directory not found at', src);
  console.log('Directory contents of root:', fs.readdirSync(root));
  process.exit(1);
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(src, dest);
console.log('Done — frontend copied to public/');
