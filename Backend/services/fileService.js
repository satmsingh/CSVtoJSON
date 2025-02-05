const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const outputDir = path.join(__dirname, "output");

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    console.log("Creating output directory...");
    fs.mkdirSync(outputDir, { recursive: true });
}

// Default rating enum values
const ratingEnum = [0, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0];

// Process Excel file and generate JSON
async function processExcel(filePath) {
    console.log("Processing Excel file:", filePath);

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`Total rows found: ${sheet.length}`);

    let outputFiles = [];

    sheet.forEach((row, index) => {
        console.log(`Processing row ${index + 1}:`, row);

        // Extract fields with fallbacks
        const productCategory = row["Product Category"] || "Unknown Category";
        const productName = row["Product Name"] || `Unknown Product ${index + 1}`;
        const specsFields = row["Specs fields"] ? row["Specs fields"].split("\r\n") : [];
        const ratingsFields = row["Ratings fields"] ? row["Ratings fields"].split("\r\n") : [];
        const specsUI = row["Specs UI"] || "Default UI Setting";
        const specsValues = row["Specs values"] || "Default Value Setting";

        if (specsFields.length === 0 && ratingsFields.length === 0) {
            console.warn(`Skipping row ${index + 1} due to missing Specs and Ratings fields.`);
            return;
        }

        // Create JSON for Specs (Product Category)
        let specsSchema = {
            formSchema: {
                title: productCategory,
                type: "object",
                properties: {},
                required: []
            },
            uiSchema: {}
        };

        let productSchema = {
            formSchema: {
                title: productName,
                type: "object",
                properties: {},
                required: []
            },
            uiSchema: {}
        };

        // Process Spec fields
        specsFields.forEach((field) => {
            const fieldName = field.toLowerCase().replace(/\s+/g, "-");
            specsSchema.formSchema.properties[fieldName] = {
                type: "string",
                title: field,
                default: specsValues
            };
            specsSchema.formSchema.required.push(fieldName);
            specsSchema.uiSchema[fieldName] = {
                "ui:widget": "textarea",
                "ui:options": { rows: 2 }
            };
        });

        // Process Ratings fields
        ratingsFields.forEach((field) => {
            const fieldName = field.toLowerCase().replace(/\s+/g, "-");
            productSchema.formSchema.properties[fieldName] = {
                type: "number",
                title: field,
                enum: ratingEnum
            };
            productSchema.formSchema.required.push(fieldName);
            productSchema.uiSchema[fieldName] = { "ui:widget": "select" };
        });

        // Define file paths
        const categoryFilePath = path.join(outputDir, `category_${index + 1}.json`);
        const productFilePath = path.join(outputDir, `product_${index + 1}.json`);

        console.log("Writing category JSON to:", categoryFilePath);
        console.log("Writing product JSON to:", productFilePath);

        try {
            fs.writeFileSync(categoryFilePath, JSON.stringify(specsSchema, null, 2));
            fs.writeFileSync(productFilePath, JSON.stringify(productSchema, null, 2));
            console.log(` Row ${index + 1}: JSON files generated successfully.`);
            outputFiles.push({ categoryFilePath, productFilePath });
        } catch (error) {
            console.error(` Error writing JSON for row ${index + 1}:`, error);
        }
    });

    return outputFiles;
}

module.exports = { processExcel };
