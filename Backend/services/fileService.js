const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const processExcelFile = async (filePath) => {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const categorizedData = {};

    sheet.forEach(row => {
        let category = row.categoryUniqueName?.trim();
        let type = row.specificationType?.trim();
        let fieldKey = row.fieldKey?.trim();
        let fieldLabel = row.fieldlabel?.trim();
        let fieldType = row.fieldType?.trim() || "string";
        let widget = row["ui:widget"]?.trim();
        let uiOption = row["ui:option"]?.trim();
        let options = row.enum ? row.enum.split(",").map(opt => opt.trim()) : [];

        if (!category || !type || !fieldKey || !fieldLabel) return; // Skip invalid rows

        if (!categorizedData[type]) {
            categorizedData[type] = {};
        }
        if (!categorizedData[type][category]) {
            categorizedData[type][category] = [];
        }

        let fieldSchema = {
            fieldKey,
            fieldLabel,
            required: row.required === "Yes",
            fieldType,
            widget,
            options,
            uiOption
        };

        categorizedData[type][category].push(fieldSchema);
    });

    // Ensure output directories exist inside "output"
    const baseOutputDir = path.join(__dirname, "../output");
    const outputDirs = ["specifications", "ratings"];

    if (!fs.existsSync(baseOutputDir)) {
        fs.mkdirSync(baseOutputDir, { recursive: true });
    }

    outputDirs.forEach(dir => {
        const dirPath = path.join(baseOutputDir, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    });

    let jsonSchemas = {};
    Object.keys(categorizedData).forEach(type => {
        jsonSchemas[type] = {};
        Object.keys(categorizedData[type]).forEach(category => {
            let schema = {
                formSchema: {
                    title: category.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()), // Format title
                    type: "object",
                    properties: {},
                    required: []
                },
                uiSchema: {}
            };

            categorizedData[type][category].forEach(field => {
                let key = field.fieldKey;
                let property = {
                    type: field.fieldType || "string",
                    title: field.fieldLabel
                };

                if (field.required) {
                    schema.formSchema.required.push(key);
                }

                // Handle Textarea with Rows
                if (field.widget === "textarea" && field.uiOption) {
                    let match = field.uiOption.match(/(\d+) rows/i);
                    if (match) {
                        schema.uiSchema[key] = {
                            "ui:widget": "textarea",
                            "ui:options": { rows: parseInt(match[1], 10) }
                        };
                    }
                }

                // Handle Yes/No Dropdown
                if (field.widget === "select" && field.uiOption?.toLowerCase() === "yes/no") {
                    property.type = "string";
                    property.enum = ["Yes", "No"];
                    schema.uiSchema[key] = { "ui:widget": "select" };
                }

                // Handle General Enum Dropdown
                if (field.options.length > 0) {
                    property.enum = field.options;
                    schema.uiSchema[key] = { "ui:widget": "select" };
                }

                schema.formSchema.properties[key] = property;
            });

            // Special Handling for Ratings Schema
            if (type === "ratings") {
                const ratingEnum = Array.from({ length: 21 }, (_, i) => i / 2); // [0, 0.5, 1, ..., 10]
                Object.keys(schema.formSchema.properties).forEach(key => {
                    schema.formSchema.properties[key].type = "number";
                    schema.formSchema.properties[key].enum = ratingEnum;
                    schema.uiSchema[key] = { "ui:widget": "select" };
                });

                // Ensure required fields for ratings
                schema.formSchema.required = Object.keys(schema.formSchema.properties);
            }

            // Generate JSON file path inside output directory
            const filePath = path.join(baseOutputDir, type, `${category}.json`);

            // Check if file exists and only modify if content has changed
            if (fs.existsSync(filePath)) {
                const existingData = fs.readFileSync(filePath, "utf8");
                const newData = JSON.stringify(schema, null, 2);

                if (existingData === newData) {
                    console.log(`Skipping ${filePath} (no changes detected)`);
                    return;
                }
            }

            // Write JSON file
            fs.writeFileSync(filePath, JSON.stringify(schema, null, 2));
            console.log(`Updated ${filePath}`);

            jsonSchemas[type][category] = schema;
        });
    });

    return jsonSchemas;
};

module.exports = { processExcelFile };
