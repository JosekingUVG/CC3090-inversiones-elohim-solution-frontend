import { NextResponse } from "next/server";
import { buildStoreBuilderSystemPrompt, parseAgentResponse } from "@/lib/agent/store-builder-agent";

export const maxDuration = 60; // 60 seconds timeout for AI generation

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json(
        {
          error: "No se encontró la variable GEMINI_API_KEY configurada en el entorno. Por favor define GEMINI_API_KEY en tu archivo .env para activar el Agente de Diseño."
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { prompt, storeConfig, activeStore, history } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "El campo 'prompt' es requerido y debe ser un texto." },
        { status: 400 }
      );
    }

    const systemPrompt = buildStoreBuilderSystemPrompt(storeConfig || {}, activeStore || {});

    // Prepare conversation messages for Gemini
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history)) {
      for (const item of history) {
        if (item.role === "user" || item.role === "assistant" || item.role === "model") {
          contents.push({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.content || item.text || "" }]
          });
        }
      }
    }

    // Add current user prompt
    contents.push({
      role: "user",
      parts: [{ text: prompt }]
    });

    // Try Gemini models in priority order
    const candidateModels = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-pro", "gemini-pro-latest"];
    let lastError: Error | null = null;
    let rawText = "";

    for (const modelName of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemPrompt }]
            },
            contents,
            generationConfig: {
              temperature: 0.7,
              topP: 0.95,
              maxOutputTokens: 8192
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errMsg = errorData?.error?.message || `HTTP ${response.status} de Gemini API`;
          console.warn(`Error probando modelo ${modelName}:`, errMsg);
          lastError = new Error(errMsg);
          continue; // Try next model
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;

        if (text) {
          rawText = text;
          break; // Success!
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (!rawText) {
      throw lastError || new Error("No se pudo obtener respuesta de los modelos de Gemini.");
    }

    const parsedResult = parseAgentResponse(rawText, storeConfig || {});

    return NextResponse.json({
      success: true,
      action: "build",
      plan: parsedResult.planRaw,
      explanation: parsedResult.explanation,
      storeConfig: parsedResult.storeConfig,
      config: parsedResult.storeConfig,
      productsToCreate: parsedResult.productsToCreate || [],
      products: parsedResult.productsToCreate || [],
      rawText: parsedResult.rawText
    });
  } catch (error) {
    console.error("Error en /api/agent/store-builder:", error);
    return NextResponse.json(
      {
        error: (error instanceof Error ? error.message : "") || "Ocurrió un error inesperado al procesar la solicitud del agente."
      },
      { status: 500 }
    );
  }
}
