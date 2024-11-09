import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

const app = express();

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + uuidv4() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// CORS Configuration
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  })
);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Hello chai aur code' });
});

// Video upload and conversion endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    const lessonId = uuidv4();
    const videoPath = req.file.path;
    const outputPath = `./uploads/courses/${lessonId}`;
    const hlsPath = `${outputPath}/index.m3u8`;

    // Ensure the output directory exists
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // Construct ffmpeg command
    const ffmpegCommand = `ffmpeg -i "${videoPath}" -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 "${hlsPath}"`;

    // Execute ffmpeg command
    exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing ffmpeg: ${error}`);
        return res.status(500).json({ error: 'Video conversion failed' });
      }

      console.log(`ffmpeg stdout: ${stdout}`);
      console.error(`ffmpeg stderr: ${stderr}`);

      const videoUrl = `http://localhost:8000/uploads/courses/${lessonId}/index.m3u8`;
      res.json({
        message: 'Video converted to HLS format',
        videoUrl: videoUrl,
        lessonId: lessonId,
      });
    });
  } catch (err) {
    console.error(`Error: ${err}`);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

// Start the server
app.listen(8000, () => {
  console.log('App is listening on port 8000...');
});
