import { GoogleGenAI, Type } from "@google/genai";
import { CVData, GeminiAIResponse } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// Schema for parsing a full CV from text remains the same, but the prompt will be improved.
const cvDataSchema = {
    type: Type.OBJECT,
    properties: {
        personal: {
            type: Type.OBJECT,
            properties: {
                firstName: { type: Type.STRING },
                lastName: { type: Type.STRING },
                title: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                address: { type: Type.STRING },
                infos: { type: Type.STRING },
                summary: { type: Type.STRING },
                linkedin: { type: Type.STRING },
                github: { type: Type.STRING },
                portfolio: { type: Type.STRING },
            },
        },
        experiences: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    role: { type: Type.STRING },
                    company: { type: Type.STRING },
                    city: { type: Type.STRING },
                    date: { type: Type.STRING },
                    description: { type: Type.STRING },
                },
            },
        },
        education: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    degree: { type: Type.STRING },
                    school: { type: Type.STRING },
                    city: { type: Type.STRING },
                    date: { type: Type.STRING },
                    description: { type: Type.STRING },
                },
            },
        },
        skills: { type: Type.ARRAY, items: { type: Type.STRING } },
        hobbies: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
};

// Schema for the AI assistant response, now including 'suggestion' type.
const aiResponseSchema = {
    type: Type.OBJECT,
    properties: {
        type: { type: Type.STRING, enum: ['chat', 'update', 'suggestion'] },
        content: {
            oneOf: [
                { type: Type.STRING }, // For 'chat' type
                { // For 'suggestion' type
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            field: { type: Type.STRING, enum: ['summary', 'experience.description'] },
                            itemId: { type: Type.INTEGER },
                            original: { type: Type.STRING },
                            suggestion: { type: Type.STRING },
                        },
                        required: ['field', 'original', 'suggestion']
                    }
                },
                { // For 'update' type, allows partial CVData
                    type: Type.OBJECT,
                    properties: {
                        personal: {
                            type: Type.OBJECT,
                            properties: { // All personal fields are optional
                                firstName: { type: Type.STRING },
                                lastName: { type: Type.STRING },
                                title: { type: Type.STRING },
                                email: { type: Type.STRING },
                                phone: { type: Type.STRING },
                                address: { type: Type.STRING },
                                infos: { type: Type.STRING },
                                summary: { type: Type.STRING },
                                linkedin: { type: Type.STRING },
                                github: { type: Type.STRING },
                                portfolio: { type: Type.STRING },
                            },
                        },
                        experiences: { // For updating specific experiences
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.INTEGER }, // ID is crucial for matching
                                    description: { type: Type.STRING },
                                },
                                required: ['id'],
                            },
                        },
                        education: { // For updating specific education items
                             type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.INTEGER }, // ID is crucial for matching
                                    description: { type: Type.STRING },
                                },
                                required: ['id'],
                            },
                        },
                         customSections: { // For updating specific custom sections
                             type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.INTEGER }, // Section ID
                                    items: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                id: {type: Type.INTEGER}, // Item ID
                                                description: { type: Type.STRING },
                                            },
                                            required: ['id']
                                        }
                                    }
                                },
                                required: ['id'],
                            },
                        },
                        skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                        hobbies: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                },
            ],
        },
    },
    required: ['type', 'content'],
};


export const parseCvFromText = async (cvText: string): Promise<Partial<CVData>> => {
    const systemInstruction = `You are an expert CV parser. Your task is to convert the raw text from a resume into a structured, strict JSON object that conforms to the provided schema.
- Extract all relevant information accurately.
- For fields that are not present in the text (e.g., 'hobbies', 'github'), return an empty string "" or an empty array [] for that key. Do not omit any keys from the schema.
- Pay close attention to dates, roles, and company names.
- The output MUST be a valid JSON object.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: cvText,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: cvDataSchema,
        }
    });

    // Fix: Clean up potential markdown wrappers from the response text.
    let jsonText = response.text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
    
    // Defensive parsing: find the start and end of the JSON object.
    const startIndex = jsonText.indexOf('{');
    const endIndex = jsonText.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        console.error("PDF parse response doesn't contain a valid JSON object.", jsonText);
        throw new Error("L'analyse du CV a produit une réponse invalide.");
    }

    jsonText = jsonText.substring(startIndex, endIndex + 1);

    try {
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error parsing CV JSON from text:", error);
        console.error("Original response from model:", response.text);
        console.error("Attempted to parse:", jsonText);
        const originalError = error instanceof Error ? error.message : String(error);
        throw new Error(`Erreur d'analyse du CV: ${originalError}`);
    }
};

export const getAIResponse = async (userInput: string, cvData: CVData): Promise<GeminiAIResponse> => {
    const systemInstruction = `You are 'Ultra CV Assistant', a world-class career coach and copywriter integrated into a CV builder application. Your primary goal is to understand the user's intent and help them create an outstanding resume. Analyze the user's request and the current CV data to provide the most helpful response.

Based on the user's request, you MUST respond in one of three ways, using the provided JSON schema:

1.  **If the user is asking a general question, seeking advice, or making a conversational remark**, respond in **CHAT MODE**.
    -   Your response MUST be a JSON object: \`{ "type": "chat", "content": "Your helpful, professional, and encouraging response." }\`
    -   Example user prompts: "What are good skills for a developer?", "Thanks for the help!", "Is it okay to have a two-page resume?"

2.  **If the user is asking to modify, add, remove, or correct information in their CV**, respond in **UPDATE MODE**.
    -   Interpret the request and generate a JSON object with ONLY the necessary changes.
    -   Format: \`{ "type": "update", "content": { ...cv fields to change... } }\`
    -   **CRITICAL**: For 'experiences', 'education', or 'customSections', you MUST include the original 'id' to identify which item to update.
    -   **If the user asks to "complete my CV" or fill in empty sections**, identify empty 'summary' or 'description' fields. Based on the CV's title and existing content, write professional, concise descriptions and return them in an 'update' response.

3.  **If the user wants to improve, rewrite, optimize, or get suggestions on their writing**, respond in **SUGGESTION MODE**.
    -   Your response MUST be a JSON object: \`{ "type": "suggestion", "content": [ ...suggestion objects... ] }\`
    -   Each suggestion object must contain the \`field\`, \`original\` text, and your improved \`suggestion\`. For experience descriptions, include the \`itemId\`.
    -   Focus on using strong action verbs, quantifying achievements, and enhancing clarity.
    -   If the request is general like "improve my CV", provide suggestions for the summary and the two most recent job descriptions.

Always use the user's current CV data as the single source of truth. It is provided below.

Current CV JSON:
${JSON.stringify(cvData, null, 2)}
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userInput,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: aiResponseSchema,
        }
    });

    // Fix: Clean up potential markdown wrappers from the response text.
    let jsonText = response.text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
    
    // Defensive parsing: find the start and end of the JSON object.
    const startIndex = jsonText.indexOf('{');
    const endIndex = jsonText.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        console.error("AI response doesn't contain a valid JSON object.", jsonText);
        // If it's not JSON, maybe it's a chat response that failed to format.
        return { type: 'chat', content: jsonText };
    }
    
    jsonText = jsonText.substring(startIndex, endIndex + 1);

    try {
        return JSON.parse(jsonText) as GeminiAIResponse;
    } catch (error) {
        console.error("Error parsing AI JSON response:", error);
        console.error("Original model response text:", response.text);
        console.error("Trimmed JSON text for parsing:", jsonText);
        const originalError = error instanceof Error ? error.message : String(error);
        throw new Error(`Réponse de l'IA malformée: ${originalError}`);
    }
};