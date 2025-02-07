const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const { processExcelFile } = require("./services/fileService");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "uploads");
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const filePath = req.file.path;
        const jsonSchema = await processExcelFile(filePath);

        res.json(jsonSchema);
    } catch (error) {
        console.error("Error processing file:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
