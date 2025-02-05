const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { processExcel } = require("./services/fileService");

const app = express();
const port = 5000;

app.use(cors());

// Configure Multer for file uploads
const upload = multer({ dest: "uploads/" });

// Ensure output directory exists
const outputDir = path.join(__dirname, "output");
if (!fs.existsSync(outputDir)) {
    console.log("Creating output directory...");
    fs.mkdirSync(outputDir, { recursive: true });
}

// File upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        console.log("File received:", req.file.originalname);

        // Process the uploaded Excel file
        const outputFiles = await processExcel(req.file.path);

        res.json({ message: "JSON files generated successfully", files: outputFiles });
    } catch (error) {
        console.error("Error processing file:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
