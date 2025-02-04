const xlsx = require("xlsx");
const fs = require("fs");

async function processExcel(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const jsonData = xlsx.utils.sheet_to_json(sheet);

    // Convert to JSON Schema
    const schema = generateJsonSchema(jsonData);

    // Remove uploaded file after processing
    fs.unlinkSync(filePath);

    return schema;
}

function generateJsonSchema(data) {
    if (data.length === 0) return { type: "object", properties: {} };

    let properties = {};
    let requiredFields = [];

    Object.keys(data[0]).forEach((key) => {
        properties[key] = { type: "string" }; // Default type as string
        requiredFields.push(key); // Mark all as required
    });

    return {
        type: "object",
        properties,
        required: requiredFields,
    };
}

module.exports = { processExcel };
