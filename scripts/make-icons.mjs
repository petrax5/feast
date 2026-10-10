// Builds the app icons and logo files from the Feast Mode logo: node scripts/make-icons.mjs <logo image>
import sharp from "sharp";

const src = process.argv[2];
if (!src) throw new Error("Usage: node scripts/make-icons.mjs <logo image>");

await sharp(src).webp({ quality: 92 }).toFile("public/logo.webp");

// The green "F" with the star (left part of the logo) becomes the square app icon.
// Only green pixels are kept, so the black lettering next to it is dropped.
const { data, info } = await sharp(src).extract({ left: 0, top: 0, width: 420, height: 400 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < data.length; i += 4) {
  const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
  if (!(g > r + 25 && g > b + 40)) data[i + 3] = 0;
}
const mark = await sharp(data, { raw: info }).png().trim().toBuffer();

async function icon(size, file, pad = 0.18) {
  const inner = Math.round(size * (1 - pad * 2));
  const img = await sharp(mark).resize(inner, inner, { fit: "contain", background: "#ffffff00" }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } })
    .composite([{ input: img, gravity: "center" }])
    .png()
    .toFile(file);
}

await icon(192, "public/icons/icon-192.png");
await icon(512, "public/icons/icon-512.png");
await icon(512, "public/icons/maskable-512.png", 0.24);
await icon(180, "src/app/apple-icon.png");
await icon(64, "src/app/icon.png", 0.08);
console.log("icons written");
