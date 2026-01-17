import { NextRequest, NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "프롬프트를 입력해주세요" },
        { status: 400 }
      );
    }

    const response = await fetch(`${OLLAMA_URL}/v1/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "x/z-image-turbo",
        prompt: prompt,
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

    if (!data.data || !data.data[0]?.b64_json) {
      return NextResponse.json(
        { error: "이미지 생성에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      image: data.data[0].b64_json,
      created: data.created,
    });
  } catch (error) {
    console.error("이미지 생성 에러:", error);
    return NextResponse.json(
      { error: "이미지 생성 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
