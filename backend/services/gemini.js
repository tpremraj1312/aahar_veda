import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Repair malformed JSON
const repairJson = (rawText) => {
  let cleaned = rawText
    .replace(/```json|```/g, '') // Remove markdown wrappers
    .replace(/^[^{]*?{/, '{')    // Remove anything before first {
    .replace(/}[^}]*$/, '}')     // Remove anything after last }
    .trim();

  // Add commas between objects
  cleaned = cleaned.replace(/}\s*{/g, '},{');

  // Fix common JSON issues
  cleaned = cleaned.replace(/,\s*}/g, '}'); // Remove trailing commas
  cleaned = cleaned.replace(/([a-zA-Z0-9_]+):/g, '"$1":'); // Ensure keys are quoted

  return cleaned;
};

// Validate and sanitize response data
const validateResponse = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response: Expected a JSON object');
  }

  const requiredFields = ['foodName', 'calories', 'macronutrients', 'healthinessRating'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Sanitize fields
  data.foodName = (data.foodName || 'Unknown Food').trim();
  data.calories = parseFloat(data.calories) || 0;
  if (data.calories < 0) {
    console.warn(`Negative calories for ${data.foodName}, setting to 0`);
    data.calories = 0;
  }

  // Validate macronutrients
  if (!data.macronutrients || typeof data.macronutrients !== 'object') {
    data.macronutrients = { protein: 0, carbs: 0, fats: 0 };
  } else {
    data.macronutrients.protein = parseFloat(data.macronutrients.protein) || 0;
    data.macronutrients.carbs = parseFloat(data.macronutrients.carbs) || 0;
    data.macronutrients.fats = parseFloat(data.macronutrients.fats) || 0;
  }

  // Validate healthinessRating
  data.healthinessRating = parseInt(data.healthinessRating) || 5;
  if (data.healthinessRating < 1 || data.healthinessRating > 10) {
    console.warn(`Invalid healthinessRating ${data.healthinessRating} for ${data.foodName}, setting to 5`);
    data.healthinessRating = 5;
  }

  // Sanitize healthierAlternative
  data.healthierAlternative = (data.healthierAlternative || '').trim() || null;

  return data;
};

export async function estimateCalories(foodName, weight, imagePath) {
  // Validate inputs
  if (!foodName || !weight) {
    throw new Error('Food name and weight are required');
  }

  const parsedWeight = parseFloat(weight);
  if (isNaN(parsedWeight) || parsedWeight <= 0) {
    throw new Error('Weight must be a positive number');
  }

  // Validate API key
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not configured in .env');
    throw new Error('Server configuration error: Missing Gemini API key');
  }
  console.log('GEMINI_API_KEY: Present');

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
Analyze the food item "${foodName}" with a weight of ${weight} grams.
If an image is provided, use it to refine the analysis.
Provide a structured JSON response with:
- foodName: string
- calories: number (kcal)
- macronutrients: { protein: number, carbs: number, fats: number } (in grams)
- healthinessRating: number (1-10)
- healthierAlternative: string (optional, suggest if applicable)

Rules:
1. Use the provided food name and weight as the primary inputs.
2. If the image is provided, use it to verify or refine the food identification.
3. Estimate calories and macronutrients based on standard nutritional data for the food, scaled by weight.
4. Assign a healthiness rating (1-10) based on nutritional value (e.g., vegetables: 8-10, junk food: 1-3).
5. Suggest a healthier alternative if the food is less healthy (e.g., replace fried chicken with grilled chicken).
6. Ensure all monetary values are numbers (e.g., 95, not "95").
7. Ensure macronutrients are non-negative and proportional to the weight.
8. If data is uncertain, use reasonable defaults (e.g., healthinessRating: 5).

Example:
For "Apple", 150 grams:
{
  "foodName": "Apple",
  "calories": 95,
  "macronutrients": {
    "protein": 0.3,
    "carbs": 25.2,
    "fats": 0.2
  },
  "healthinessRating": 8,
  "healthierAlternative": null
}
`;

    let request;
    if (imagePath) {
      // Read image file and convert to base64
      const absolutePath = path.join(__dirname, '..', imagePath);
      console.log('Reading image from:', absolutePath);
      const imageBuffer = await fs.readFile(absolutePath);
      const base64Data = imageBuffer.toString('base64');

      request = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Data,
                },
              },
            ],
          },
        ],
      };
    } else {
      request = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      };
    }

    console.log('Sending Gemini request:', { foodName, weight, hasImage: !!imagePath });

    const result = await model.generateContent(request);
    const rawText = await result.response.text();

    console.log('Raw Gemini response:', rawText);

    // Attempt to parse JSON
    let parsed;
    try {
      const cleanedText = repairJson(rawText);
      parsed = JSON.parse(cleanedText);
    } catch (err) {
      console.error('Failed to parse JSON:', rawText, 'Error:', err.message);
      throw new Error(`Invalid JSON format from Gemini: ${err.message}`);
    }

    // Validate and sanitize response
    const validatedData = validateResponse(parsed);

    console.log('Validated response:', JSON.stringify(validatedData, null, 2));

    return validatedData;
  } catch (err) {
    console.error('Gemini API error:', err.message, err.stack);
    throw new Error(`Failed to estimate calories: ${err.message}`);
  }
}