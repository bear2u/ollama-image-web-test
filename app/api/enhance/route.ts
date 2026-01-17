import { NextRequest, NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

const STYLE_PROMPTS: Record<string, string> = {
  none: "",
  photorealistic:
    "Transform this into a photorealistic image prompt with detailed lighting, textures, and realistic details. Add terms like: photorealistic, 8k, detailed, professional photography, natural lighting.",
  anime:
    "Transform this into an anime/manga style image prompt. Add terms like: anime style, vibrant colors, cel shading, Japanese animation, detailed eyes.",
  oil_painting:
    "Transform this into an oil painting style prompt. Add terms like: oil painting, artistic brush strokes, classical art style, rich colors, canvas texture.",
  watercolor:
    "Transform this into a watercolor painting style prompt. Add terms like: watercolor painting, soft colors, fluid brush strokes, artistic, delicate details.",
  "3d_render":
    "Transform this into a 3D render style prompt. Add terms like: 3D render, octane render, CGI, volumetric lighting, highly detailed, cinematic.",
  pixel_art:
    "Transform this into a pixel art style prompt. Add terms like: pixel art, 16-bit style, retro gaming aesthetic, limited color palette.",
  minimalist:
    "Transform this into a minimalist style prompt. Add terms like: minimalist, clean design, simple shapes, negative space, modern aesthetic.",
  cyberpunk:
    "Transform this into a cyberpunk style prompt. Add terms like: cyberpunk, neon lights, futuristic city, dark atmosphere, high-tech low-life.",
  fantasy:
    "Transform this into a fantasy art style prompt. Add terms like: fantasy art, magical, ethereal lighting, mystical atmosphere, epic composition.",
  vintage:
    "Transform this into a vintage/retro style prompt. Add terms like: vintage photography, retro aesthetic, film grain, muted colors, nostalgic feel.",
};

export async function POST(request: NextRequest) {
  try {
    const { prompt, style = "none", model = "llama3.2:latest" } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "프롬프트를 입력해주세요" },
        { status: 400 }
      );
    }

    const styleInstruction = STYLE_PROMPTS[style] || STYLE_PROMPTS.none;

    const systemPrompt = `You are an expert image prompt engineer. Your task is to enhance user prompts for AI image generation.

Rules:
1. Output ONLY the enhanced prompt, nothing else
2. Keep it concise but descriptive (max 100 words)
3. Include specific visual details: lighting, composition, mood, colors
4. Use English for the output
5. Do not include negative prompts or technical parameters
6. Make it vivid and specific

${styleInstruction}`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        prompt: `Enhance this image prompt: "${prompt}"`,
        system: systemPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 200,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Ollama 에러: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.response) {
      return NextResponse.json(
        { error: "프롬프트 개선에 실패했습니다" },
        { status: 500 }
      );
    }

    // 응답에서 불필요한 따옴표나 설명 제거
    let enhancedPrompt = data.response.trim();
    enhancedPrompt = enhancedPrompt.replace(/^["']|["']$/g, "");
    enhancedPrompt = enhancedPrompt.replace(/^(Here'?s?|Enhanced prompt:?|Prompt:?)\s*/i, "");

    return NextResponse.json({
      original: prompt,
      enhanced: enhancedPrompt,
      style: style,
      model: model,
    });
  } catch (error) {
    console.error("프롬프트 개선 에러:", error);
    return NextResponse.json(
      { error: "프롬프트 개선 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
