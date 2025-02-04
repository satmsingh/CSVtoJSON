import { useState } from "react";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";

export default function UploadForm() {
    const [schema, setSchema] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        const formData = new FormData();
        formData.append("file", file);

        setLoading(true);

        try {
            const response = await fetch("http://localhost:5000/upload", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            console.log("Generated JSON Schema:", data);

            // Merge UI Schema inside the JSON Schema display
            const mergedSchema = { ...data.formSchema, uiSchema: data.uiSchema };
            setSchema(mergedSchema);
        } catch (error) {
            console.error("Error uploading file:", error);
        } finally {
            setLoading(false);
        }
    };

    // Handle form submission and log data in JSON format
    const handleSubmit = ({ formData }) => {
        console.log("Form Submitted Data:", JSON.stringify(formData, null, 2));
    };

    return (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "20px" }}>
            {/* Left Panel - JSON Schema Display */}
            <div style={{ width: "45%", padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}>
                <h3>JSON Schema (Includes UI Schema)</h3>
                {schema ? (
                    <pre style={{ background: "#f4f4f4", padding: "10px", borderRadius: "5px", whiteSpace: "pre-wrap" }}>
                        {JSON.stringify(schema, null, 2)}
                    </pre>
                ) : (
                    <p>No schema available. Upload a CSV file to generate.</p>
                )}
            </div>

            {/* Right Panel - Form Display */}
            <div style={{ width: "45%", padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}>
                <h3>Generated Form</h3>
                <input type="file" onChange={handleFileUpload} style={{ marginBottom: "10px" }} />

                {loading && <p>Processing file...</p>}

                {schema && (
                    <div style={{ marginTop: "20px" }}>
                        <Form schema={schema} uiSchema={schema.uiSchema} validator={validator} onSubmit={handleSubmit} />
                    </div>
                )}
            </div>
        </div>
    );
}
