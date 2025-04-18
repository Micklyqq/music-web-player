const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const mm = require("music-metadata");
const fs = require("fs");

const app = express();

app.use(cors());

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const originalName = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
    );
    cb(null, originalName);
  },
});

const upload = multer({ storage });

app.post("/upload", upload.single("track"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  res.json({
    message: "File uploaded successfully",
    filename: req.file.filename,
  });
});

app.get("/tracks", async (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir);
    const tracks = [];
    for (const file of files) {
      const filePath = path.join(uploadDir, file);
      try {
        const metadata = await mm.parseFile(filePath);

        tracks.push({
          filename: file,
          path: `/tracks/${file}`,
          metadata: {
            title: metadata.common.title || path.parse(file).name,
            artist: metadata.common.artist || "Неизвестный исполнитель",
            cover: metadata.common.picture?.[0]
              ? `data:${
                  metadata.common.picture[0].format
                };base64,${metadata.common.picture[0].data.toString("base64")}`
              : null,
            duration: metadata.format.duration,
          },
        });
      } catch (error) {
        console.log(`Error reading metada for ${file}:`, error);
      }
    }
    res.json(tracks);
  } catch (error) {
    console.error("Error listing tracks:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/tracks/:filename", (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

app.delete("/tracks/:filename", async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);

    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    await fs.promises.unlink(filePath);

    res.json({
      success: true,
      message: `File ${filename} deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting file: ", error);
    res.status(500).json({
      error: "Failed to delete file",
      details: error.message,
    });
  }
});

const PORT = 5500;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
