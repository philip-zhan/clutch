import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "src-tauri", "icons");

// Create tray icon: square with transparent "C" cutout
// For macOS template icons, use black for visible areas and transparent for cutout

async function generateTrayIcon(size, outputName, cornerRadius, fontSize) {
  // Step 1: Create a black rounded square (this will be the base)
  const squareSvg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="black"/>
</svg>`;

  // Step 2: Create the letter "C" as white on transparent (this will be our mask)
  const letterSvg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <text
    x="50%"
    y="55%"
    font-family="SF Pro Display, -apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="600"
    fill="white"
    text-anchor="middle"
    dominant-baseline="middle"
  >C</text>
</svg>`;

  // Create the base square
  const square = await sharp(Buffer.from(squareSvg))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Create the letter mask
  const letter = await sharp(Buffer.from(letterSvg))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Manually combine: where letter is white, make the square transparent
  const pixels = square.data;
  const letterPixels = letter.data;

  for (let i = 0; i < pixels.length; i += 4) {
    // If the letter pixel has any white (R > 0), make the square pixel transparent
    if (letterPixels[i] > 128) {
      // R channel of letter
      pixels[i + 3] = 0; // Set alpha to 0 (transparent)
    }
  }

  // Save the result
  const trayIconPath = path.join(iconsDir, outputName);
  await sharp(pixels, {
    raw: {
      width: square.info.width,
      height: square.info.height,
      channels: 4,
    },
  })
    .png()
    .toFile(trayIconPath);

  console.log(`Generated: ${trayIconPath}`);
}

async function main() {
  // 44x44 for @2x Retina displays
  await generateTrayIcon(44, "tray-icon.png", 6, 28);

  // 22x22 for standard displays
  await generateTrayIcon(22, "tray-icon@1x.png", 3, 14);
}

main().catch(console.error);
