import { NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

export async function GET() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);

    if (!response.ok) {
      return NextResponse.json(
        { error: "모델 목록을 가져올 수 없습니다" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // 이미지 생성 모델 제외 (텍스트 생성용 모델만 필터링)
    const textModels = data.models
      .filter((model: { name: string }) => !model.name.includes("z-image"))
      .filter((model: { name: string }) => !model.name.includes("embed"))
      .map((model: { name: string }) => model.name);

    return NextResponse.json({ models: textModels });
  } catch (error) {
    console.error("모델 목록 조회 에러:", error);
    return NextResponse.json(
      { error: "모델 목록 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
