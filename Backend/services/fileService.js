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

// Parse UI specifications from Specs UI column
function parseUISpecs(uiSpecs) {
    if (!uiSpecs) return {};
    
    const specs = {};
    uiSpecs.split('\n').forEach(spec => {
        const [field, value] = spec.split('=').map(s => s.trim());
        if (field && value) {
            specs[field.toLowerCase().replace(/\s+/g, '-')] = value;
        }
    });
    return specs;
}

// Parse values specifications from Specs values column
function parseValueSpecs(valueSpecs) {
    if (!valueSpecs) return {};
    
    const specs = {};
    valueSpecs.split('\n').forEach(spec => {
        const [field, value] = spec.split('=').map(s => s.trim());
        if (field && value) {
            specs[field.toLowerCase().replace(/\s+/g, '-')] = value;
        }
    });
    return specs;
}

// Get UI widget configuration based on specs
function getUIWidget(fieldName, uiSpecs, valueSpecs) {
    const defaultWidget = {
        "ui:widget": "textarea",
        "ui:options": { rows: 2 }
    };

    // Check for specific UI configuration in Specs UI
    if (uiSpecs[fieldName]) {
        const value = uiSpecs[fieldName];
        if (value.toLowerCase().includes('rows')) {
            return {
                "ui:widget": "textarea",
                "ui:options": { rows: parseInt(value.match(/\d+/)[0]) || 2 }
            };
        }
    }

    // Check for specific value configuration in Specs values
    if (valueSpecs[fieldName]) {
        const value = valueSpecs[fieldName].toLowerCase();
        if (value.includes('yes/no')) {
            return { "ui:widget": "select" };
        }
        // Add more value-based widget configurations here
    }

    return defaultWidget;
}

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
        
        // Parse UI and value specifications
        const uiSpecs = parseUISpecs(row["Specs UI"]);
        const valueSpecs = parseValueSpecs(row["Specs values"]);

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
                title: field
            };

            // Add specific value configuration if available
            if (valueSpecs[fieldName]) {
                if (valueSpecs[fieldName].toLowerCase() === 'yes/no selection') {
                    specsSchema.formSchema.properties[fieldName] = {
                        type: "string",
                        title: field,
                        enum: ["Yes", "No"],
                        default: "No"  // Adding a default value
                    };
                    specsSchema.uiSchema[fieldName] = {
                        "ui:widget": "select",
                        "ui:options": {
                            enumOptions: [
                                { label: "Yes", value: "Yes" },
                                { label: "No", value: "No" }
                            ]
                        }
                    };
                    return; // Skip the default UI schema assignment
                }
            }

            specsSchema.formSchema.required.push(fieldName);
            specsSchema.uiSchema[fieldName] = getUIWidget(fieldName, uiSpecs, valueSpecs);
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