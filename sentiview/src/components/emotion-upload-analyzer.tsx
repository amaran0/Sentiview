"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloudUpload, Upload, Camera, FileImage, ImageOff, ScanFace, Loader, FileX2, ChartPie, Meh, Angry, Images } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Emotion =
  | "happy"
  | "sad"
  | "angry"
  | "surprised"
  | "disgusted"
  | "fearful"
  | "neutral";

type EmotionScores = Record<Emotion, number>;

type AnalysisState = "idle" | "uploading" | "analyzing" | "result" | "error";

export interface EmotionUploadAnalyzerProps {
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  initialImageUrl?: string | null;
  onAnalyze?: (file: File) => Promise<EmotionScores>;
  onSave?: (payload: { file: File | null; imageUrl: string | null; scores: EmotionScores; note?: string }) => Promise<void> | void;
  maxFileSizeMB?: number;
  acceptTypes?: string; // e.g., "image/*"
}

const EMOTIONS: Emotion[] = ["happy", "sad", "angry", "surprised", "disgusted", "fearful", "neutral"];

const emotionLabels: Record<Emotion, string> = {
  happy: "Happy",
  sad: "Sad",
  angry: "Angry",
  surprised: "Surprised",
  disgusted: "Disgusted",
  fearful: "Fearful",
  neutral: "Neutral",
};

// Fallback mock analyzer (only for development/demo)
async function mockAnalyze(file: File): Promise<EmotionScores> {
  // Simulate network/compute delay
  await new Promise((r) => setTimeout(r, 1400));
  // Produces deterministic pseudo-random based on file size
  const seed = Math.max(1, file.size % 97);
  const vals = EMOTIONS.map((_, i) => ((seed * (i + 13)) % 100) + 1);
  const sum = vals.reduce((a, b) => a + b, 0);
  const normalized = vals.map((v) => v / sum);
  const scores: Partial<EmotionScores> = {};
  EMOTIONS.forEach((e, idx) => {
    scores[e] = normalized[idx];
  });
  return scores as EmotionScores;
}

export default function EmotionUploadAnalyzer({
  className,
  style,
  disabled,
  initialImageUrl = null,
  onAnalyze,
  onSave,
  maxFileSizeMB = 10,
  acceptTypes = "image/*",
}: EmotionUploadAnalyzerProps) {
  const [state, setState] = useState<AnalysisState>(initialImageUrl ? "result" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [scores, setScores] = useState<EmotionScores | null>(null);
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [note, setNote] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const analyzingTimer = useRef<NodeJS.Timeout | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return () => {
      if (imageUrl && imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrl);
      }
      if (analyzingTimer.current) clearInterval(analyzingTimer.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [imageUrl]);

  const validateFile = useCallback(
    (f: File) => {
      const maxBytes = maxFileSizeMB * 1024 * 1024;
      if (!f.type.startsWith("image/")) {
        return "Please upload a valid image file.";
      }
      if (f.size > maxBytes) {
        return `File is too large. Max size is ${maxFileSizeMB}MB.`;
      }
      return null;
    },
    [maxFileSizeMB]
  );

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled) return;
      const dt = e.dataTransfer;
      const files = dt.files;
      if (!files || !files[0]) return;

      const f = files[0];
      const err = validateFile(f);
      if (err) {
        setError(err);
        setState("error");
        toast.error(err);
        return;
      }
      await handleNewFile(f);
    },
    [disabled, validateFile]
  );

  const handleNewFile = useCallback(
    async (f: File) => {
      // Reset previous
      setError(null);
      setScores(null);
      if (imageUrl && imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrl);
      }

      const objectUrl = URL.createObjectURL(f);
      setFile(f);
      setImageUrl(objectUrl);
      setState("uploading");

      // Simulate a short upload step before analyzing
      await new Promise((r) => setTimeout(r, 400));

      setState("analyzing");
      setAnalyzingProgress(8);

      // Fake indeterminate by gently increasing
      if (analyzingTimer.current) clearInterval(analyzingTimer.current);
      analyzingTimer.current = setInterval(() => {
        setAnalyzingProgress((p) => {
          // Slow approach to 90% max while analyzing
          if (p < 90) return p + Math.max(1, Math.floor((95 - p) / 8));
          return p;
        });
      }, 220);

      try {
        const analyzer = onAnalyze ?? mockAnalyze;
        const result = await analyzer(f);
        setScores(result);
        setState("result");
        setAnalyzingProgress(100);
        if (analyzingTimer.current) {
          clearInterval(analyzingTimer.current);
          analyzingTimer.current = null;
        }
        toast.success("Analysis complete");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Analysis failed. Please try again.";
        setError(msg);
        setState("error");
        if (analyzingTimer.current) {
          clearInterval(analyzingTimer.current);
          analyzingTimer.current = null;
        }
        setAnalyzingProgress(0);
        toast.error(msg);
      }
    },
    [imageUrl, onAnalyze]
  );

  const onSelectFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const err = validateFile(f);
      if (err) {
        setError(err);
        setState("error");
        toast.error(err);
        e.target.value = "";
        return;
      }
      await handleNewFile(f);
      e.target.value = "";
    },
    [handleNewFile, validateFile]
  );

  const dominantEmotion = useMemo(() => {
    if (!scores) return null;
    let maxKey: Emotion = "neutral";
    let maxVal = -Infinity;
    for (const key of EMOTIONS) {
      const val = scores[key] ?? 0;
      if (val > maxVal) {
        maxVal = val;
        maxKey = key;
      }
    }
    return { key: maxKey, value: maxVal };
  }, [scores]);

  const emotionColor = (e: Emotion) => {
    // Map to our soft palette tokens
    switch (e) {
      case "happy":
        return "bg-[color:var(--chart-5)]";
      case "sad":
        return "bg-[color:var(--chart-2)]";
      case "angry":
        return "bg-[color:var(--chart-3)]";
      case "surprised":
        return "bg-[color:var(--chart-1)]";
      case "disgusted":
        return "bg-[color:var(--chart-4)]";
      case "fearful":
        return "bg-[color:var(--chart-2)]";
      case "neutral":
      default:
        return "bg-[color:var(--muted-foreground)]";
    }
  };

  const emotionIcon = (e: Emotion) => {
    // Use limited icon set available
    switch (e) {
      case "angry":
        return <Angry className="h-4 w-4 text-foreground/80" aria-hidden="true" />;
      case "neutral":
        return <Meh className="h-4 w-4 text-foreground/80" aria-hidden="true" />;
      default:
        return <ChartPie className="h-4 w-4 text-foreground/80" aria-hidden="true" />;
    }
  };

  const handleSave = async () => {
    if (!scores) return;
    try {
      await onSave?.({ file, imageUrl, scores, note });
      toast.success("Saved to your emotional history");
    } catch (e) {
      toast.error("Unable to save. Please try again.");
    }
  };

  const handleRetry = () => {
    setError(null);
    setScores(null);
    setState("idle");
    if (imageUrl && imageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageUrl(null);
    setFile(null);
    setAnalyzingProgress(0);
  };

  const disabledAll = !!disabled || state === "uploading" || state === "analyzing";

  const openCamera = useCallback(async () => {
    if (disabledAll) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      toast.error("Unable to access camera");
    }
  }, [disabledAll]);

  const closeCamera = useCallback(() => {
    setCameraOpen(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvasRef.current = canvas;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const photoFile = new File([blob], `capture-${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
      await handleNewFile(photoFile);
      closeCamera();
    }, "image/jpeg", 0.92);
  }, [handleNewFile, closeCamera]);

  return (
    <Card className={cn("w-full bg-card shadow-sm", className)} style={style}>
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <ScanFace className="h-5 w-5 text-[color:var(--primary)]" aria-hidden="true" />
          <CardTitle className="text-xl sm:text-2xl">Emotion Analyzer</CardTitle>
        </div>
        <CardDescription className="text-sm">
          Upload a photo to analyze facial emotions with confidence scores for all seven emotions.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {state === "error" && error && (
          <Alert variant="destructive" className="bg-destructive text-destructive-foreground">
            <FileX2 className="h-5 w-5" aria-hidden="true" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="break-words">{error}</AlertDescription>
          </Alert>
        )}

        {(state === "idle" || state === "error") && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabledAll) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            aria-label="Upload image"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                fileInputRef.current?.click();
              }
            }}
            className={cn(
              "relative w-full rounded-lg border border-dashed p-6 sm:p-8",
              "bg-secondary/60 hover:bg-secondary transition-colors",
              isDragging ? "border-[color:var(--ring)] bg-accent/60" : "border-[color:var(--border)]",
              disabledAll ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
            )}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="rounded-full p-3 bg-accent">
                <CloudUpload className="h-6 w-6 text-[color:var(--primary)]" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground text-base">Drag and drop your image</p>
                <p className="text-sm text-muted-foreground">
                  or click to browse. PNG, JPG up to {maxFileSizeMB}MB.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={disabledAll}
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-primary text-primary-foreground hover:opacity-90"
                >
                  <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                  Choose file
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={disabledAll}
                  onClick={openCamera}
                  className="bg-secondary text-foreground hover:bg-accent"
                >
                  <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
                  Use camera
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled
                  className="text-muted-foreground hover:bg-transparent"
                >
                  <Images className="mr-2 h-4 w-4" aria-hidden="true" />
                  Recent photos
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptTypes}
                onChange={onSelectFile}
                className="sr-only"
                aria-hidden="true"
                tabIndex={-1}
              />
              {/* keep legacy hidden input for compatibility */}
              <input
                ref={cameraInputRef}
                type="file"
                accept={acceptTypes}
                capture="environment"
                onChange={onSelectFile}
                className="sr-only"
                aria-hidden="true"
                tabIndex={-1}
              />
            </div>
          </div>
        )}

        {(state === "uploading" || state === "analyzing") && (
          <div className="grid w-full gap-6 md:grid-cols-2">
            <div className="min-w-0">
              <div className="relative overflow-hidden rounded-lg border bg-card">
                <div className="aspect-[4/3] w-full bg-muted/60 flex items-center justify-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="max-w-full h-auto object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileImage className="h-8 w-8" aria-hidden="true" />
                      <span className="text-sm">Preparing preview…</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col justify-center gap-4">
              <div className="flex items-center gap-2">
                <ScanFace className="h-5 w-5 text-[color:var(--primary)] animate-pulse" aria-hidden="true" />
                <p className="font-medium text-foreground">
                  {state === "uploading" ? "Uploading image…" : "Analyzing emotions…"}
                </p>
              </div>
              <Progress value={state === "uploading" ? 20 : analyzingProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                This may take a few seconds. Please keep this tab open.
              </p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span className="text-sm">Processing securely</span>
              </div>
            </div>
          </div>
        )}

        {state === "result" && scores && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="min-w-0">
              <div className="relative overflow-hidden rounded-lg border bg-card">
                <div className="aspect-[4/3] w-full bg-muted/60">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Analyzed image"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                      <ImageOff className="h-8 w-8" aria-hidden="true" />
                      <span className="text-sm">Image not available</span>
                    </div>
                  )}
                </div>
                <div className="absolute left-3 top-3">
                  <Badge className="bg-accent text-accent-foreground">
                    <ScanFace className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Analysis complete
                  </Badge>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {dominantEmotion && (
                  <Badge variant="secondary" className="bg-secondary text-foreground">
                    {emotionIcon(dominantEmotion.key)}
                    <span className="ml-1">
                      Dominant: {emotionLabels[dominantEmotion.key]}{" "}
                      {Math.round(dominantEmotion.value * 100)}%
                    </span>
                  </Badge>
                )}
                {file && (
                  <span className="text-xs text-muted-foreground break-words">
                    File: {file.name}
                  </span>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="rounded-lg border bg-card p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Emotion classification</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      toast.message("Re-analyzing…");
                      if (file) handleNewFile(file);
                    }}
                    disabled={disabledAll}
                    aria-label="Re-run analysis"
                  >
                    <ScanFace className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <Separator className="my-3" />
                <div className="space-y-3">
                  {EMOTIONS.map((e) => {
                    const v = Math.max(0, Math.min(1, scores[e] ?? 0));
                    return (
                      <div key={e} className="min-w-0">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0">{emotionIcon(e)}</span>
                            <span className="text-sm">{emotionLabels[e]}</span>
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {Math.round(v * 100)}%
                          </span>
                        </div>
                        <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted")}>
                          <div
                            className={cn("h-full transition-all", emotionColor(e))}
                            style={{ width: `${v * 100}%` }}
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 space-y-3">
                  <label htmlFor="note" className="text-sm text-muted-foreground">How are you feeling? (optional)</label>
                  <textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a short note about your feelings or context..."
                    className="w-full min-h-24 rounded-md border bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                  />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    className="bg-primary text-primary-foreground hover:opacity-90"
                    onClick={handleSave}
                    disabled={!scores || disabled}
                  >
                    <FileImage className="mr-2 h-4 w-4" aria-hidden="true" />
                    Save to history
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="bg-secondary text-foreground hover:bg-accent"
                    onClick={handleRetry}
                    disabled={disabled}
                  >
                    <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                    Analyze another
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {state !== "result" && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={disabledAll}
              onClick={() => fileInputRef.current?.click()}
              className="bg-secondary text-foreground hover:bg-accent"
            >
              <FileImage className="mr-2 h-4 w-4" aria-hidden="true" />
              Select image
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={disabledAll}
              onClick={openCamera}
              className="hover:bg-accent"
            >
              <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
              Camera
            </Button>
          </div>
        )}

        {/* Camera Dialog */}
        <Dialog open={cameraOpen} onOpenChange={(o) => (o ? openCamera() : closeCamera())}>
          <DialogContent className="bg-popover max-w-lg">
            <DialogHeader>
              <DialogTitle>Take a photo</DialogTitle>
            </DialogHeader>
            <div className="relative w-full overflow-hidden rounded-md border bg-black">
              <video ref={videoRef} className="w-full h-full" playsInline muted />
            </div>
            <DialogFooter className="flex gap-2">
              <Button type="button" variant="secondary" onClick={closeCamera}>Cancel</Button>
              <Button type="button" onClick={capturePhoto} className="bg-primary text-primary-foreground">Capture</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}