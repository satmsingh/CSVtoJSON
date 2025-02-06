const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const outputDir = path.join(__dirname, "output");
const categoryDir = path.join(outputDir, "category");
const ratingsDir = path.join(outputDir, "ratings");

// Ensure output directories exist
[outputDir, categoryDir, ratingsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        console.log(`Creating directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
    }
});

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

// Format category unique name
function formatCategoryUniqueName(category) {
    return category.toLowerCase().replace(/\s+/g, '-');
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

        const productCategory = row["Product Category"] || "Unknown Category";
        const productName = row["Product Name"] || `Unknown Product ${index + 1}`;
        const specsFields = row["Specs fields"] ? row["Specs fields"].split("\r\n") : [];
        const ratingsFields = row["Ratings fields"] ? row["Ratings fields"].split("\r\n") : [];

        const uiSpecs = parseUISpecs(row["Specs UI"]);
        const valueSpecs = parseValueSpecs(row["Specs values"]);
        
        if (specsFields.length === 0 && ratingsFields.length === 0) {
            console.warn(`Skipping row ${index + 1} due to missing Specs and Ratings fields.`);
            return;
        }

        const categoryUniqueName = formatCategoryUniqueName(productCategory);

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
            const fieldName = field.toLowerCase().replace(/\s+/g, '-');
            const baseProperties = {
                type: "string",
                fieldKey: fieldName,
                fieldlabel: field,
                specificationType: "specifications",
                categoryUniqueName: categoryUniqueName
            };

            if (valueSpecs[fieldName] && valueSpecs[fieldName].toLowerCase() === 'yes/no selection') {
                specsSchema.formSchema.properties[fieldName] = {
                    ...baseProperties,
                    enum: ["Yes", "No"],
                    default: "No"
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
            } else if (uiSpecs[fieldName] && uiSpecs[fieldName].toLowerCase().includes('rows')) {
                specsSchema.formSchema.properties[fieldName] = baseProperties;
                specsSchema.uiSchema[fieldName] = {
                    "ui:widget": "textarea",
                    "ui:options": {
                        rows: parseInt(uiSpecs[fieldName].match(/\d+/)[0]) || 2
                    }
                };
            } else {
                specsSchema.formSchema.properties[fieldName] = baseProperties;
            }

            specsSchema.formSchema.required.push(fieldName);
        });

        // Process Ratings fields
        ratingsFields.forEach((field) => {
            const fieldName = field.toLowerCase().replace(/\s+/g, '-');
            productSchema.formSchema.properties[fieldName] = {
                type: "number",
                fieldKey: fieldName,
                fieldlabel: field,
                specificationType: "ratings",
                categoryUniqueName: categoryUniqueName,
                enum: ratingEnum
            };
            productSchema.formSchema.required.push(fieldName);
            productSchema.uiSchema[fieldName] = { "ui:widget": "select" };
        });

        const categoryFilePath = path.join(categoryDir, `category_${index + 1}.json`);
        const productFilePath = path.join(ratingsDir, `product_${index + 1}.json`);

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
