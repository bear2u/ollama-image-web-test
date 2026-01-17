import { NextRequest } from "next/server";
import { request } from "undici";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

const VALID_SIZES = ["512x512", "768x768", "1024x1024"] as const;
type ImageSize = (typeof VALID_SIZES)[number];

interface LogEntry {
  timestamp: string;
  step: string;
  message: string;
  data?: unknown;
  duration?: number;
}

function createLogEntry(step: string, message: string, data?: unknown, duration?: number): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    step,
    message,
    data,
    duration,
  };
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const logs: LogEntry[] = [];
  const startTime = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (log: LogEntry) => {
        logs.push(log);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "log", log })}\n\n`)
        );
      };

      const sendResult = (result: { image?: string; error?: string }) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "result", ...result, logs, totalDuration: Date.now() - startTime })}\n\n`
          )
        );
        controller.close();
      };

      try {
        // Step 1: 요청 파싱
        sendLog(createLogEntry("parse", "요청 데이터 파싱 시작"));
        const parseStart = Date.now();

        const body = await req.json();
        const { prompt, size = "512x512" } = body;

        sendLog(
          createLogEntry("parse", "요청 데이터 파싱 완료", {
            prompt: prompt?.substring(0, 100) + (prompt?.length > 100 ? "..." : ""),
            promptLength: prompt?.length,
            size,
          }, Date.now() - parseStart)
        );

        // Step 2: 유효성 검사
        sendLog(createLogEntry("validate", "입력 유효성 검사"));

        if (!prompt || typeof prompt !== "string") {
          sendLog(createLogEntry("validate", "유효성 검사 실패: 프롬프트 없음"));
          sendResult({ error: "프롬프트를 입력해주세요" });
          return;
        }

        const imageSize: ImageSize = VALID_SIZES.includes(size) ? size : "512x512";
        sendLog(
          createLogEntry("validate", "유효성 검사 완료", {
            validatedSize: imageSize,
          })
        );

        // Step 3: Ollama API 요청 준비
        const ollamaRequestBody = {
          model: "x/z-image-turbo",
          prompt: prompt,
          size: imageSize,
        };

        sendLog(
          createLogEntry("prepare", "Ollama API 요청 준비", {
            url: `${OLLAMA_URL}/v1/images/generations`,
            method: "POST",
            body: {
              ...ollamaRequestBody,
              prompt: prompt.substring(0, 100) + (prompt.length > 100 ? "..." : ""),
            },
          })
        );

        // Step 4: Ollama API 호출 (undici 사용, 10분 타임아웃)
        sendLog(createLogEntry("request", "Ollama API 호출 시작 (이미지 생성 중... 최대 10분 소요)"));
        const requestStart = Date.now();

        const { statusCode, headers, body: responseBody } = await request(
          `${OLLAMA_URL}/v1/images/generations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(ollamaRequestBody),
            headersTimeout: 10 * 60 * 1000, // 10분
            bodyTimeout: 10 * 60 * 1000, // 10분
          }
        );

        const requestDuration = Date.now() - requestStart;
        sendLog(
          createLogEntry("request", "Ollama API 응답 수신", {
            status: statusCode,
            headers: {
              contentType: headers["content-type"],
              contentLength: headers["content-length"],
            },
          }, requestDuration)
        );

        // Step 5: 응답 처리
        if (statusCode !== 200) {
          sendLog(createLogEntry("error", "Ollama API 에러 응답"));
          const errorText = await responseBody.text();
          sendLog(
            createLogEntry("error", "에러 상세", {
              status: statusCode,
              error: errorText,
            })
          );
          sendResult({ error: `Ollama 에러: ${errorText}` });
          return;
        }

        // Step 6: JSON 파싱
        sendLog(createLogEntry("parse_response", "응답 JSON 파싱 시작"));
        const parseResponseStart = Date.now();

        const data = await responseBody.json() as {
          data?: Array<{ b64_json?: string }>;
          created?: number;
        };

        sendLog(
          createLogEntry("parse_response", "응답 JSON 파싱 완료", {
            hasData: !!data.data,
            dataLength: data.data?.length,
            created: data.created,
          }, Date.now() - parseResponseStart)
        );

        // Step 7: 이미지 데이터 추출
        if (!data.data || !data.data[0]?.b64_json) {
          sendLog(
            createLogEntry("error", "이미지 데이터 없음", {
              responseStructure: Object.keys(data),
            })
          );
          sendResult({ error: "이미지 생성에 실패했습니다" });
          return;
        }

        const imageData = data.data[0].b64_json;
        const imageSizeKB = Math.round(imageData.length / 1024);

        sendLog(
          createLogEntry("complete", "이미지 생성 완료", {
            imageSizeKB: `${imageSizeKB}KB`,
            imageSizeBytes: imageData.length,
            created: data.created,
          })
        );

        // Step 8: 결과 전송
        sendResult({ image: imageData });

      } catch (error) {
        console.error("이미지 생성 에러:", error);
        sendLog(
          createLogEntry("error", "예외 발생", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          })
        );
        sendResult({ error: "이미지 생성 중 오류가 발생했습니다" });
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
