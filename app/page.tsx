"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ImageIcon,
  Download,
  Sparkles,
  Wand2,
  RotateCcw,
  Bug,
  ChevronRight,
  ChevronDown,
  Server,
  Clock,
} from "lucide-react";

const IMAGE_SIZES = [
  { value: "512x512", label: "512 x 512", desc: "빠른 생성" },
  { value: "768x768", label: "768 x 768", desc: "중간 품질" },
  { value: "1024x1024", label: "1024 x 1024", desc: "고품질" },
];

const STYLES = [
  { value: "none", label: "없음", desc: "스타일 적용 안함" },
  { value: "photorealistic", label: "사실적", desc: "8K 고품질 사진" },
  { value: "anime", label: "애니메이션", desc: "일본 애니메이션 스타일" },
  { value: "oil_painting", label: "유화", desc: "클래식 유화 스타일" },
  { value: "watercolor", label: "수채화", desc: "부드러운 수채화" },
  { value: "3d_render", label: "3D 렌더", desc: "CGI/옥테인 렌더" },
  { value: "pixel_art", label: "픽셀 아트", desc: "레트로 게임 스타일" },
  { value: "minimalist", label: "미니멀", desc: "깔끔한 미니멀리즘" },
  { value: "cyberpunk", label: "사이버펑크", desc: "네온/미래도시" },
  { value: "fantasy", label: "판타지", desc: "마법/신비로운 분위기" },
  { value: "vintage", label: "빈티지", desc: "레트로/필름 느낌" },
];

interface ServerLog {
  timestamp: string;
  step: string;
  message: string;
  data?: unknown;
  duration?: number;
}

interface DebugLog {
  id: string;
  timestamp: Date;
  type: "request" | "response" | "error" | "info" | "server";
  title: string;
  endpoint?: string;
  method?: string;
  data: unknown;
  duration?: number;
  serverLogs?: ServerLog[];
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [size, setSize] = useState("512x512");
  const [style, setStyle] = useState("none");
  const [model, setModel] = useState("llama3.2:latest");
  const [models, setModels] = useState<string[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState<string>("");
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentLogIdRef = useRef<string | null>(null);

  const addLog = (log: Omit<DebugLog, "id" | "timestamp">) => {
    const newLog: DebugLog = {
      ...log,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
    };
    setDebugLogs((prev) => [newLog, ...prev]);
    return newLog.id;
  };

  const updateLog = (id: string, updates: Partial<DebugLog>) => {
    setDebugLogs((prev) =>
      prev.map((log) => (log.id === id ? { ...log, ...updates } : log))
    );
  };

  const appendServerLog = (id: string, serverLog: ServerLog) => {
    setDebugLogs((prev) =>
      prev.map((log) =>
        log.id === id
          ? { ...log, serverLogs: [...(log.serverLogs || []), serverLog] }
          : log
      )
    );
  };

  const toggleLogExpand = (id: string) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const clearLogs = () => {
    setDebugLogs([]);
    setExpandedLogs(new Set());
  };

  const startTimer = () => {
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 100);
    }, 100);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    fetchModels();
    return () => stopTimer();
  }, []);

  const fetchModels = async () => {
    const startTime = Date.now();
    addLog({
      type: "request",
      title: "모델 목록 조회",
      endpoint: "/api/models",
      method: "GET",
      data: null,
    });

    try {
      const response = await fetch("/api/models");
      const data = await response.json();

      addLog({
        type: "response",
        title: "모델 목록 응답",
        endpoint: "/api/models",
        data: data,
        duration: Date.now() - startTime,
      });

      if (data.models && data.models.length > 0) {
        setModels(data.models);
        setModel(data.models[0]);
      }
    } catch (err) {
      addLog({
        type: "error",
        title: "모델 목록 조회 실패",
        data: err instanceof Error ? err.message : err,
        duration: Date.now() - startTime,
      });
    }
  };

  const enhancePrompt = async () => {
    if (!prompt.trim()) {
      setError("프롬프트를 입력해주세요");
      return;
    }

    setEnhancing(true);
    setError(null);
    setOriginalPrompt(prompt);

    const requestBody = { prompt, style, model };
    const startTime = Date.now();

    addLog({
      type: "request",
      title: "프롬프트 개선 요청",
      endpoint: "/api/enhance",
      method: "POST",
      data: requestBody,
    });

    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      addLog({
        type: response.ok ? "response" : "error",
        title: response.ok ? "프롬프트 개선 응답" : "프롬프트 개선 실패",
        endpoint: "/api/enhance",
        data: data,
        duration: Date.now() - startTime,
      });

      if (!response.ok) {
        throw new Error(data.error || "프롬프트 개선에 실패했습니다");
      }

      setPrompt(data.enhanced);
      setIsEnhanced(true);

      addLog({
        type: "info",
        title: "프롬프트 변환 완료",
        data: {
          original: requestBody.prompt,
          enhanced: data.enhanced,
          style: style,
          model: model,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setEnhancing(false);
    }
  };

  const resetPrompt = () => {
    if (originalPrompt) {
      addLog({
        type: "info",
        title: "프롬프트 초기화",
        data: {
          from: prompt,
          to: originalPrompt,
        },
      });
      setPrompt(originalPrompt);
      setIsEnhanced(false);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) {
      setError("프롬프트를 입력해주세요");
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentStep("시작");
    startTimer();

    const requestBody = { prompt, size };

    // 스트리밍 로그용 ID 생성
    const logId = addLog({
      type: "server",
      title: "이미지 생성 (스트리밍)",
      endpoint: "/api/generate",
      method: "POST",
      data: requestBody,
      serverLogs: [],
    });
    currentLogIdRef.current = logId;

    // 로그 자동 확장
    setExpandedLogs((prev) => new Set([...prev, logId]));

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("스트림을 읽을 수 없습니다");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.slice(6);
              const event = JSON.parse(jsonStr);

              if (event.type === "log") {
                const serverLog = event.log as ServerLog;
                setCurrentStep(serverLog.message);
                appendServerLog(logId, serverLog);
              } else if (event.type === "result") {
                stopTimer();

                if (event.error) {
                  updateLog(logId, {
                    type: "error",
                    title: "이미지 생성 실패",
                    duration: event.totalDuration,
                  });
                  throw new Error(event.error);
                } else {
                  updateLog(logId, {
                    type: "response",
                    title: "이미지 생성 완료",
                    duration: event.totalDuration,
                    data: {
                      ...requestBody,
                      totalDuration: `${event.totalDuration}ms`,
                      imageSize: event.image
                        ? `${Math.round(event.image.length / 1024)}KB`
                        : undefined,
                    },
                  });
                  setImage(event.image);
                }
              }
            } catch (e) {
              console.error("JSON 파싱 에러:", e);
            }
          }
        }
      }
    } catch (err) {
      stopTimer();
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
      setCurrentStep("");
      currentLogIdRef.current = null;
    }
  };

  const downloadImage = () => {
    if (!image) return;

    const link = document.createElement("a");
    link.href = `data:image/png;base64,${image}`;
    link.download = `ollama-image-${Date.now()}.png`;
    link.click();

    addLog({
      type: "info",
      title: "이미지 다운로드",
      data: {
        filename: `ollama-image-${Date.now()}.png`,
        size: `${Math.round(image.length / 1024)}KB`,
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      generateImage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  const formatElapsed = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getLogBadgeVariant = (type: DebugLog["type"]) => {
    switch (type) {
      case "request":
        return "default";
      case "response":
        return "secondary";
      case "error":
        return "destructive";
      case "info":
        return "outline";
      case "server":
        return "default";
    }
  };

  const getLogBadgeText = (type: DebugLog["type"]) => {
    switch (type) {
      case "request":
        return "REQ";
      case "response":
        return "RES";
      case "error":
        return "ERR";
      case "info":
        return "INFO";
      case "server":
        return "STREAM";
    }
  };

  const getStepColor = (step: string) => {
    if (step.includes("error") || step.includes("실패")) return "text-red-400";
    if (step.includes("complete") || step.includes("완료")) return "text-green-400";
    if (step.includes("request") || step.includes("호출")) return "text-yellow-400";
    return "text-blue-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-purple-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              Ollama Image Generator
            </h1>
            {/* 디버그 버튼 */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="ml-4 border-zinc-600 text-zinc-400 hover:bg-zinc-800 hover:text-white relative"
                >
                  <Bug className="w-4 h-4" />
                  {debugLogs.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full text-[10px] flex items-center justify-center">
                      {debugLogs.length > 99 ? "99+" : debugLogs.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[500px] sm:w-[600px] bg-zinc-900 border-zinc-700 text-white overflow-hidden flex flex-col">
                <SheetHeader>
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-white flex items-center gap-2">
                      <Bug className="w-5 h-5 text-purple-400" />
                      디버그 콘솔
                    </SheetTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearLogs}
                      className="text-zinc-400 hover:text-white text-xs"
                    >
                      로그 지우기
                    </Button>
                  </div>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-2">
                  {debugLogs.length === 0 ? (
                    <div className="text-center text-zinc-500 py-12">
                      <Bug className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>아직 로그가 없습니다</p>
                      <p className="text-xs mt-1">API 호출 시 로그가 표시됩니다</p>
                    </div>
                  ) : (
                    debugLogs.map((log) => (
                      <div
                        key={log.id}
                        className="bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => toggleLogExpand(log.id)}
                          className="w-full p-3 flex items-center gap-2 text-left hover:bg-zinc-800/80 transition-colors"
                        >
                          {expandedLogs.has(log.id) ? (
                            <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                          )}
                          <Badge
                            variant={getLogBadgeVariant(log.type)}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {getLogBadgeText(log.type)}
                          </Badge>
                          <span className="flex-1 text-sm truncate">
                            {log.title}
                          </span>
                          <span className="text-xs text-zinc-500 flex-shrink-0">
                            {formatTime(log.timestamp)}
                          </span>
                          {log.duration && (
                            <span className="text-xs text-green-400 flex-shrink-0">
                              {log.duration}ms
                            </span>
                          )}
                        </button>
                        {expandedLogs.has(log.id) && (
                          <div className="px-3 pb-3 border-t border-zinc-700">
                            {log.endpoint && (
                              <div className="mt-2 text-xs">
                                <span className="text-zinc-500">Endpoint: </span>
                                <span className="text-purple-400">
                                  {log.method && `${log.method} `}
                                  {log.endpoint}
                                </span>
                              </div>
                            )}

                            {/* 서버 로그 (스트리밍) */}
                            {log.serverLogs && log.serverLogs.length > 0 ? (
                              <div className="mt-3">
                                <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                                  <Server className="w-3 h-3" />
                                  서버 로그 ({log.serverLogs.length})
                                </div>
                                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                                  {log.serverLogs.map((sLog, idx) => (
                                    <div
                                      key={idx}
                                      className="p-2 bg-zinc-900/80 rounded text-xs border-l-2 border-zinc-600"
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <span
                                          className={`font-mono ${getStepColor(sLog.step)}`}
                                        >
                                          [{sLog.step}]
                                        </span>
                                        <span className="text-zinc-300">
                                          {sLog.message}
                                        </span>
                                        {sLog.duration !== undefined && (
                                          <span className="text-green-400 ml-auto">
                                            {sLog.duration}ms
                                          </span>
                                        )}
                                      </div>
                                      {sLog.data !== undefined && (
                                        <pre className="text-[10px] text-zinc-500 overflow-x-auto mt-1">
                                          {JSON.stringify(sLog.data, null, 2)}
                                        </pre>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {/* 요약 데이터 (스트리밍 완료 후) */}
                                {log.data !== undefined && (
                                  <div className="mt-2">
                                    <span className="text-xs text-zinc-500">Summary:</span>
                                    <pre className="mt-1 p-2 bg-zinc-900 rounded text-xs overflow-x-auto text-green-400 font-mono">
                                      {JSON.stringify(log.data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            ) : null}

                            {/* 일반 데이터 */}
                            {!log.serverLogs && log.data !== undefined && (
                              <div className="mt-2">
                                <span className="text-xs text-zinc-500">Data:</span>
                                <pre className="mt-1 p-2 bg-zinc-900 rounded text-xs overflow-x-auto text-green-400 font-mono">
                                  {JSON.stringify(log.data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <p className="text-zinc-400">
            Z-Image-Turbo 모델을 사용하여 텍스트로 이미지를 생성합니다
          </p>
        </header>

        <div className="space-y-6">
          {/* 프롬프트 입력 */}
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-zinc-300">
                      프롬프트
                    </label>
                    {isEnhanced && (
                      <span className="text-xs text-purple-400 flex items-center gap-1">
                        <Wand2 className="w-3 h-3" />
                        AI 개선됨
                      </span>
                    )}
                  </div>
                  <Textarea
                    placeholder="생성하고 싶은 이미지를 설명해주세요... (예: 쿠션 위에 앉아있는 귀여운 고양이)"
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      setIsEnhanced(false);
                    }}
                    onKeyDown={handleKeyDown}
                    className="min-h-[120px] bg-zinc-900 border-zinc-600 text-white placeholder:text-zinc-500 focus:border-purple-500 focus:ring-purple-500"
                    disabled={loading || enhancing}
                  />
                </div>

                {/* 프롬프트 빌더 옵션 */}
                <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-700">
                  <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-purple-400" />
                    프롬프트 빌더
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">
                        스타일
                      </label>
                      <Select
                        value={style}
                        onValueChange={setStyle}
                        disabled={loading || enhancing}
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-600 max-h-[300px]">
                          {STYLES.map((s) => (
                            <SelectItem
                              key={s.value}
                              value={s.value}
                              className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
                            >
                              <div className="flex flex-col">
                                <span>{s.label}</span>
                                <span className="text-xs text-zinc-400">
                                  {s.desc}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">
                        LLM 모델
                      </label>
                      <Select
                        value={model}
                        onValueChange={setModel}
                        disabled={loading || enhancing || models.length === 0}
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white text-sm">
                          <SelectValue placeholder="모델 선택" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-600">
                          {models.map((m) => (
                            <SelectItem
                              key={m}
                              value={m}
                              className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
                            >
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={enhancePrompt}
                      disabled={loading || enhancing || !prompt.trim()}
                      variant="outline"
                      className="flex-1 border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                    >
                      {enhancing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          개선 중...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          프롬프트 개선
                        </>
                      )}
                    </Button>
                    {isEnhanced && (
                      <Button
                        onClick={resetPrompt}
                        variant="outline"
                        className="border-zinc-600 text-zinc-400 hover:bg-zinc-700"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* 이미지 생성 옵션 */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-zinc-400 mb-1.5">
                      이미지 크기
                    </label>
                    <Select
                      value={size}
                      onValueChange={setSize}
                      disabled={loading}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-600">
                        {IMAGE_SIZES.map((s) => (
                          <SelectItem
                            key={s.value}
                            value={s.value}
                            className="text-white hover:bg-zinc-800 focus:bg-zinc-800"
                          >
                            <span>{s.label}</span>
                            <span className="ml-2 text-zinc-500 text-xs">
                              ({s.desc})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-zinc-500">
                    Ctrl+Enter로 바로 생성
                  </p>
                  <Button
                    onClick={generateImage}
                    disabled={loading || enhancing || !prompt.trim()}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        생성 중...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        이미지 생성
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 진행 상황 표시 */}
          {loading && (
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-zinc-200">
                      {currentStep || "이미지 생성 중..."}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      경과 시간: {formatElapsed(elapsedTime)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">디버그 콘솔에서</div>
                    <div className="text-xs text-zinc-400">상세 로그 확인</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {image && (
            <Card className="bg-zinc-800/50 border-zinc-700 overflow-hidden">
              <CardContent className="p-0">
                <div className="relative group">
                  <img
                    src={`data:image/png;base64,${image}`}
                    alt="Generated image"
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      onClick={downloadImage}
                      variant="secondary"
                      className="bg-white/90 hover:bg-white text-black"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      다운로드
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!image && !loading && (
            <Card className="bg-zinc-800/30 border-zinc-700 border-dashed">
              <CardContent className="p-12">
                <div className="text-center text-zinc-500">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>프롬프트를 입력하고 이미지를 생성해보세요</p>
                  <p className="text-xs mt-2">
                    프롬프트 빌더로 스타일을 적용하면 더 좋은 결과를 얻을 수
                    있습니다
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <footer className="mt-12 text-center text-zinc-600 text-sm">
          <p>Powered by Ollama + Z-Image-Turbo</p>
        </footer>
      </div>
    </div>
  );
}
