const express = require("express");
const multer = require("multer");
const csvParser = require("csv-parser");
const cors = require("cors");
const fs = require("fs");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

app.post("/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csvParser())
        .on("data", (data) => results.push(data))
        .on("end", () => {
            const jsonSchema = generateJsonSchema(results);
            res.json(jsonSchema);
            fs.unlinkSync(req.file.path); // Delete uploaded file after processing
        });
});

function generateJsonSchema(csvData) {
    let properties = {};
    let uiSchema = {};

    csvData.forEach(row => {
        const key = row.key.trim();
        let type = row.type.trim().toLowerCase();
        const title = row.title.trim();
        const enumValues = row.enum ? row.enum.split(",").map(val => val.trim()) : null;
        const uiWidget = row["ui:widget"] ? row["ui:widget"].trim() : null;

        let fieldSchema = { title };

        if (type === "array") {
            if (enumValues) {
                fieldSchema.type = "array";
                fieldSchema.items = { type: "string", enum: enumValues };
                fieldSchema.default = [enumValues[0]]; // Default to first item in array
            } else {
                fieldSchema.type = "array";
                fieldSchema.items = { type: "string" }; // Default to string array
            }
        } else if (type === "enum") {
            fieldSchema.type = "string"; // Enums must be type string in JSON Schema
            fieldSchema.enum = enumValues;
            fieldSchema.default = enumValues ? enumValues[0] : ""; // Default to first enum value
        } else {
            fieldSchema.type = type;
            fieldSchema.default = "";
        }

        properties[key] = fieldSchema;

        
        if (uiWidget) {
            uiSchema[key] = { "ui:widget": uiWidget };
        }

        // Autofocus first field
        if (Object.keys(uiSchema).length === 0) {
            uiSchema[key] = { "ui:autofocus": true };
        }
    });

    return {
        formSchema: {
            title: "Generated Form",
            type: "object",
            properties,
        },
        uiSchema,
    };
}

app.listen(5000, () => {
    console.log("Server running on port 5000");
});
