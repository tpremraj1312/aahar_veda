import axios from "axios";
import Meal from "../models/meal.js";

export const getAIAnalysis = async (req, res) => {
  try {
    const userId = req.userId; // Assuming auth middleware sets req.user._id
    console.log("[aiAnalysis] Fetching meals for user ID:", userId);

    // Fetch user's meal history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const meals = await Meal.find({
      userId,
      consumed: true,
      createdAt: { $gte: thirtyDaysAgo },
    }).lean();

    console.log("[aiAnalysis] Found meals:", meals.length, "meals");
    console.log("[aiAnalysis] Sample meal data:", meals[0] || "No meals");

    if (!meals.length) {
      console.log("[aiAnalysis] No meals found, returning default response");
      return res.status(200).json({
        summary: "No meals logged in the last 30 days.",
        nutritionalBalance: "N/A",
        healthinessTrend: "N/A",
        recommendations: ["Start logging meals to receive personalized insights."],
      });
    }

    // Aggregate meal data
    const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const avgCalories = totalCalories / meals.length;
    const totalMacros = meals.reduce(
      (acc, meal) => ({
        protein: acc.protein + (meal.macronutrients?.protein || 0),
        carbs: acc.carbs + (meal.macronutrients?.carbs || 0),
        fats: acc.fats + (meal.macronutrients?.fats || 0),
      }),
      { protein: 0, carbs: 0, fats: 0 }
    );
    const avgHealthiness =
      meals.reduce((sum, meal) => sum + (meal.healthinessRating || 5), 0) / meals.length;

    console.log("[aiAnalysis] Aggregated data:", {
      totalCalories,
      avgCalories,
      totalMacros,
      avgHealthiness,
    });

    // Prepare prompt for Gemini API
    const prompt = `
Analyze the following meal history for a user over the last 30 days:
- Total meals: ${meals.length}
- Average calories per meal: ${avgCalories.toFixed(2)} kcal
- Total macronutrients: Protein: ${totalMacros.protein.toFixed(2)}g, Carbs: ${totalMacros.carbs.toFixed(2)}g, Fats: ${totalMacros.fats.toFixed(2)}g
- Average healthiness rating: ${avgHealthiness.toFixed(2)} (scale 1-10)

Provide a structured JSON response with:
- summary: string (brief overview of the user's diet)
- nutritionalBalance: string (assessment of macronutrient distribution)
- healthinessTrend: string (analysis of healthiness ratings)
- recommendations: array of strings (specific suggestions for improvement)

Example:
{
  "summary": "Your diet consists of balanced meals with moderate calorie intake.",
  "nutritionalBalance": "Macronutrients are well-distributed, with a slight emphasis on carbs.",
  "healthinessTrend": "Your meals have an average healthiness rating of 7, indicating mostly healthy choices.",
  "recommendations": ["Increase protein intake with lean meats.", "Reduce processed carbs."]
}
`;

    // Make direct Gemini API call
    console.log("[aiAnalysis] Calling Gemini API with prompt");
    const geminiApiKey = process.env.GEMINI_API_TOKEN;
    if (!geminiApiKey) {
      console.error("[aiAnalysis] GEMINI_API_TOKEN is not set");
      throw new Error("Gemini API key is missing");
    }

    const geminiResponse = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey,
        },
      }
    );

    console.log("[aiAnalysis] Raw Gemini API response:", geminiResponse.data);

    // Extract and parse the response
    const responseText =
      geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    console.log("[aiAnalysis] Extracted response text:", responseText);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
      console.log("[aiAnalysis] Parsed Gemini response:", parsedResponse);
    } catch (parseError) {
      console.error("[aiAnalysis] Failed to parse Gemini response:", parseError.message);
      throw new Error("Invalid JSON format from Gemini API");
    }

    // Validate and sanitize response
    const validatedResponse = {
      summary: parsedResponse.summary || "No summary provided.",
      nutritionalBalance:
        parsedResponse.nutritionalBalance || "No nutritional balance data provided.",
      healthinessTrend:
        parsedResponse.healthinessTrend || "No healthiness trend data provided.",
      recommendations: Array.isArray(parsedResponse.recommendations)
        ? parsedResponse.recommendations
        : ["No specific recommendations available."],
    };

    console.log("[aiAnalysis] Validated response:", validatedResponse);

    // Ensure all required fields are present
    const requiredFields = ["summary", "nutritionalBalance", "healthinessTrend", "recommendations"];
    for (const field of requiredFields) {
      if (!(field in validatedResponse)) {
        console.error("[aiAnalysis] Missing required field:", field);
        throw new Error(`Missing required field in AI analysis: ${field}`);
      }
    }

    res.status(200).json(validatedResponse);
  } catch (error) {
    console.error("[aiAnalysis] Error:", error.message, error.stack);
    res.status(500).json({ error: "Failed to generate AI analysis" });
  }
};