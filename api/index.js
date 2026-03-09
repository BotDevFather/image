import Jimp from "jimp";

const SIZE = 223;

const U1_LEFT = 21;
const U1_TOP = 81;

const U2_LEFT = 491;
const U2_TOP = 86;

const TXT_TOP1 = U1_TOP + SIZE + 25;
const TXT_TOP2 = U2_TOP + SIZE + 20;

const TEMPLATE =
"https://raw.githubusercontent.com/BotDevFather/image/refs/heads/main/IMG_20260309_105850_752.jpg";

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

  let photoUrl;

  if (!photoJson.ok || !photoJson.result.photos.length) {

    photoUrl =
      "https://ui-avatars.com/api/?background=dbdbdb&size=223&name=U";

  } else {

    const fileId = photoJson.result.photos[0][0].file_id;

    const fileReq = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );

    const fileJson = await fileReq.json();

    photoUrl =
      `https://api.telegram.org/file/bot${botToken}/${fileJson.result.file_path}`;

  }

  const img = await Jimp.read(photoUrl);

  img.resize(SIZE, SIZE);

  return { username, photo: img };

}

async function circleAvatar(img) {

  const mask = new Jimp(SIZE, SIZE, 0x00000000);

  mask.scan(0, 0, SIZE, SIZE, function (x, y) {

    const dx = x - SIZE / 2;
    const dy = y - SIZE / 2;

    if (dx * dx + dy * dy <= (SIZE / 2) * (SIZE / 2)) {
      mask.setPixelColor(0xffffffff, x, y);
    }

  });

  img.mask(mask, 0, 0);

  return img;

}

export default async function handler(req, res) {

  const { botToken, user1, user2 } = req.query;

  if (!botToken || !user1 || !user2) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {

    const template = await Jimp.read(TEMPLATE);

    const font = await Jimp.loadFont("https://unpkg.com/jimp@0.22.10/fonts/open-sans/open-sans-16-black/open-sans-16-black.fnt");

    const [u1, u2] = await Promise.all([
      getUser(botToken, user1),
      getUser(botToken, user2)
    ]);

    const img1 = await circleAvatar(u1.photo);
    const img2 = await circleAvatar(u2.photo);

    template.composite(img1, U1_LEFT, U1_TOP);
    template.composite(img2, U2_LEFT, U2_TOP);

    template.print(
      font,
      U1_LEFT - 80,
      TXT_TOP1,
      { text: u1.username, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER },
      360
    );

    template.print(
      font,
      U2_LEFT - 80,
      TXT_TOP2,
      { text: u2.username, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER },
      400
    );

    const buffer = await template.getBufferAsync(Jimp.MIME_PNG);

    const form = new FormData();

    form.append(
      "file",
      new Blob([buffer], { type: "image/png" }),
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
