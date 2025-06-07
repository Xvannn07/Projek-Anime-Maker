const express = require('express');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const cors = require('cors');

const { toanime } = require('./src/toanime');
const { convertWebpToPng } = require('./src/function');

const Aiease = require('./src/aiease');
const responseAienase = new Aiease({ debug: true });

const app = express();
const PORT = process.env.PORT || 3000;
const tempFolderPath = path.join(__dirname, 'tmp');

//data
let dataResult = [];

const storage = multer.diskStorage({
  destination: tempFolderPath,
  filename: function (req, file, cb) {
    cb(null, crypto.randomBytes(16).toString('hex') + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage, 
  limits: {
    fileSize: 1048576 * 10
  }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/files', express.static(tempFolderPath));
app.use(cors());

const ISauthenticate = async (req, res, next) => {
  try {
    // Contoh sederhana: menggunakan menit UTC sebagai secret
    const secretResponse = new Date().getUTCMinutes().toString();
    const generatedApiKey = generateApiKey(secretResponse);
    console.log(generatedApiKey);
    console.log(req.headers);
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${generatedApiKey}`) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Endpoint untuk mengirimkan file index.html
// id
app.get('/', (req, res) => {
  res.render("id/index");
});

app.get('/id', (req, res) => {
  res.render("id/index");
});
//en
app.get('/en', (req, res) => {
  res.render("en/index");
});
//spa
app.get('/spa', (req, res) => {
  res.render("spa/index");
});

// Endpoint API untuk mengubah gambar menjadi anime
app.post("/api/toanime", upload.single("image"), async (req, res) => {
  // Set header untuk streaming text (bisa juga "text/event-stream" untuk SSE)
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  try {
    if (!req.file) {
      res.write("No image file uploaded.\n");
      res.end();
      return;
    }

    res.write("Image file received. Processing image...\n");

    // Buat callback untuk mengirim progres
    const progressCallback = (message) => {
      res.write(message);
    };

    const imgBuffer = fs.readFileSync(req.file.path);
    const results = await responseAienase.generateImage('filter', imgBuffer, { style: 2 }, progressCallback)
      .then(async (output) => {
        progressCallback("Image generation complete. Converting image...\n");
        return await convertWebpToPng(output[0]?.thumb);
      });

    const sessionsID = crypto.randomBytes(16).toString('hex');
    const fileID = crypto.randomBytes(16).toString('hex') + path.extname(req.file.originalname);
    const pathResult = path.join(tempFolderPath, fileID);
    fs.writeFileSync(pathResult, results);

    // Jika ingin mengakhiri stream dengan JSON final:
    const finalResponse = {
      success: true,
      id: sessionsID,
      data: {
        img_original: `/files/${req.file.filename}`,
        img_anime: `/files/${fileID}`
      }
    };
    res.write(`Final Result: ${JSON.stringify(finalResponse)}\n`);
    res.end();
  } catch (err) {
    console.error(err);
    res.write("Error processing image.\n");
    res.end();
  }
});

app.get('/downloads/:id', async(req, res) => {
  const dataS = dataResult.find(el => el.id == req.params.id);
  //const imagePath = `path/to/images/${id}.jpg`; // replace with your image path
  //const filename = `image_${id}.jpg`;
  const { result } = dataS;

  await fs.readFile(tempFolderPath + "/" + result.img_anime, (err, data) => {
    if (err) {
      res.status(404).render("404");
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="xvannn07-${crypto.randomBytes(7).toString('hex')}.png"`);
      res.setHeader('Content-Type', 'image/png');
      res.send(data);
    }
  });
});


app.listen(PORT, () => {
  console.log(`Server berjalan pada http://localhost:${PORT}`);
});

function generateApiKey(secret) {
  // Ambil menit saat ini sebagai nilai integer
  const currentMinute = Math.floor(Date.now() / 60000).toString();
  
  // Buat HMAC menggunakan algoritma SHA256 dan secret key
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(currentMinute);
  
  // Kembalikan hash dalam format hexadecimal
  return hmac.digest('hex');
};
