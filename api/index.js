import sharp from "sharp";
import { createCanvas, registerFont } from "canvas";

const SIZE = 223;

const U1_LEFT = 21;
const U1_TOP = 81;

const U2_LEFT = 491;
const U2_TOP = 86;

const TXT_TOP1 = U1_TOP + SIZE + 16;
const TXT_TOP2 = U2_TOP + SIZE + 14;

const TEMPLATE =
"https://raw.githubusercontent.com/BotDevFather/image/refs/heads/main/IMG_20260309_105850_752.jpg";

/* OPTIONAL FONT */
try {
  registerFont("./PublicSans-Black.ttf", { family: "PublicSans" });
} catch {}

async function getUser(botToken, userId) {

  const chat = await fetch(
    `https://api.telegram.org/bot${botToken}/getChat?chat_id=${userId}`
  );

  const chatJson = await chat.json();

  const username =
    chatJson.ok && chatJson.result.username
      ? `@${chatJson.result.username}`
      : "User";

  const photos = await fetch(
    `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${userId}&limit=1`
  );

  const photoJson = await photos.json();

  let photoBuffer;

  if (!photoJson.ok || !photoJson.result.photos.length) {

    const fallback = await fetch(
      "https://ui-avatars.com/api/?background=dbdbdb&size=223&name=U"
    );

    photoBuffer = Buffer.from(await fallback.arrayBuffer());

  } else {

    const fileId = photoJson.result.photos[0][0].file_id;

    const fileReq = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );

    const fileJson = await fileReq.json();

    const img = await fetch(
      `https://api.telegram.org/file/bot${botToken}/${fileJson.result.file_path}`
    );

    photoBuffer = Buffer.from(await img.arrayBuffer());

  }

  return { username, photo: photoBuffer };

}

async function processAvatar(buffer) {

  const circleMask = Buffer.from(`
  <svg width="${SIZE}" height="${SIZE}">
  <circle cx="${SIZE/2}" cy="${SIZE/2}" r="${SIZE/2}" fill="white"/>
  </svg>
  `);

  return sharp(buffer)
    .resize(SIZE, SIZE, { fit: "cover" })
    .composite([{ input: circleMask, blend: "dest-in" }])
    .png()
    .toBuffer();

}

function renderText(text) {

  const canvas = createCanvas(400, 80);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0,0,400,80);

  ctx.fillStyle = "black";
  ctx.font = "bold 34px PublicSans, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(text, 200, 40);

  return canvas.toBuffer();

}

export default async function handler(req, res) {

  const { botToken, user1, user2 } = req.query;

  if (!botToken || !user1 || !user2) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {

    const [u1, u2] = await Promise.all([
      getUser(botToken, user1),
      getUser(botToken, user2)
    ]);

    const [img1, img2] = await Promise.all([
      processAvatar(u1.photo),
      processAvatar(u2.photo)
    ]);

    const txt1 = renderText(u1.username);
    const txt2 = renderText(u2.username);

    const template = await fetch(TEMPLATE);
    const templateBuffer = Buffer.from(await template.arrayBuffer());

    const finalImage = await sharp(templateBuffer)
      .composite([
        { input: img1, left: U1_LEFT, top: U1_TOP },
        { input: img2, left: U2_LEFT, top: U2_TOP },

        { input: txt1, left: U1_LEFT - 90, top: TXT_TOP1 },
        { input: txt2, left: U2_LEFT - 90, top: TXT_TOP2 }
      ])
      .png()
      .toBuffer();

    const form = new FormData();

    form.append(
      "file",
      new Blob([finalImage], { type: "image/png" }),
      "love.png"
    );

    const upload = await fetch(
      "https://tmpfiles.org/api/v1/upload",
      {
        method: "POST",
        body: form
      }
    );

    const uploadJson = await upload.json();

    const url = uploadJson.data.url.replace(
      "tmpfiles.org/",
      "tmpfiles.org/dl/"
    );

    res.status(200).json({
      success: true,
      image: url
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

      }
