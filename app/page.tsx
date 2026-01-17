"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ImageIcon, Download, Sparkles } from "lucide-react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async () => {
    if (!prompt.trim()) {
      setError("프롬프트를 입력해주세요");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "이미지 생성에 실패했습니다");
      }

      setImage(data.image);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!image) return;

    const link = document.createElement("a");
    link.href = `data:image/png;base64,${image}`;
    link.download = `ollama-image-${Date.now()}.png`;
    link.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      generateImage();
    }
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
          </div>
          <p className="text-zinc-400">
            Z-Image-Turbo 모델을 사용하여 텍스트로 이미지를 생성합니다
          </p>
        </header>

        <div className="space-y-6">
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-6">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-zinc-300">
                  프롬프트
                </label>
                <Textarea
                  placeholder="생성하고 싶은 이미지를 설명해주세요... (예: A cute orange cat sitting on a cushion, soft lighting)"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[120px] bg-zinc-900 border-zinc-600 text-white placeholder:text-zinc-500 focus:border-purple-500 focus:ring-purple-500"
                  disabled={loading}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-500">
                    Ctrl+Enter (또는 Cmd+Enter)로 생성
                  </p>
                  <Button
                    onClick={generateImage}
                    disabled={loading || !prompt.trim()}
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
