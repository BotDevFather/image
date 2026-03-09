import sharp from "sharp";
import fs from "fs";

const width = 300;
const height = 80;
const text = "Hello World";

const svg = Buffer.from(`
<svg width="${width}" height="${height}">
<style>
text {
  font-family: Arial, sans-serif;
  font-size: 40px;
  fill: black;
}
</style>

<rect width="100%" height="100%" fill="white"/>

<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">
${text}
</text>
</svg>
`);

const img = await sharp({
  create: {
    width,
    height,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 }
  }
})
.composite([{ input: svg }])
.png()
.toBuffer();

fs.writeFileSync("output.png", img);

console.log("Image saved as output.png");
