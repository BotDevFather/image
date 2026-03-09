import sharp from "sharp";

export default async function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const { botToken, user1, user2 } = req.query;

  if (!botToken || !user1 || !user2) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const SIZE = 223;

  const U1_LEFT = 21;
  const U1_TOP = 81;

  const U2_LEFT = 491;
  const U2_TOP = 86;

  // TEXT POSITION (change number to move text up/down)
  const TXT_TOP1 = U1_TOP + SIZE + 16;
  const TXT_TOP2 = U2_TOP + SIZE + 14;

  try {

    // GET USER INFO + PHOTO
    const getUser = async (userId) => {

      try {

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

      } catch {

        return {
          username: "User",
          photo: Buffer.alloc(0)
        };

      }

    };

    const [u1, u2] = await Promise.all([
      getUser(user1),
      getUser(user2)
    ]);

    // CIRCLE MASK
    const circleMask = Buffer.from(
      `<svg width="${SIZE}" height="${SIZE}">
        <circle cx="${SIZE/2}" cy="${SIZE/2}" r="${SIZE/2}" fill="white"/>
      </svg>`
    );

    const processAvatar = async (buffer) => {

      return sharp(buffer)
        .resize(SIZE, SIZE, { fit: "cover" })
        .composite([{ input: circleMask, blend: "dest-in" }])
        .png()
        .toBuffer();

    };

    const [img1, img2] = await Promise.all([
      processAvatar(u1.photo),
      processAvatar(u2.photo)
    ]);

    // TEXT RENDER WITH YOUR PUBLIC SANS FONT
    const renderText = (name) => {

const svg = `
<svg width="300" height="60">
<style>
text{
  font-family: Arial, sans-serif;
  font-size: 32px;
  fill: black;
  font-weight: 700;
}
</style>

<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">
${name}
</text>
</svg>
`;

return Buffer.from(svg);

};

    const txt1 = renderText(u1.username);
    const txt2 = renderText(u2.username);

    // LOAD TEMPLATE
    const template = await fetch(
      "https://raw.githubusercontent.com/BotDevFather/image/refs/heads/main/IMG_20260309_105850_752.jpg"
    );

    const templateBuffer = Buffer.from(await template.arrayBuffer());

    // FINAL IMAGE
    const finalImage = await sharp(templateBuffer)
      .composite([
        { input: img1, left: U1_LEFT, top: U1_TOP },
        { input: img2, left: U2_LEFT, top: U2_TOP },

        { input: txt1, left: U1_LEFT - 38, top: TXT_TOP1 },
        { input: txt2, left: U2_LEFT - 38, top: TXT_TOP2 }
      ])
      .png()
      .toBuffer();

    // UPLOAD RESULT
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
