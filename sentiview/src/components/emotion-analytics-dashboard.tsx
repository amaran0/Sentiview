"use client";

import * as React from "react";
import {
  ChartNoAxesCombined,
  ChartSpline,
  ChartArea,
  TrendingUp,
  ChartPie,
  ChartBarIncreasing,
  ChartColumnStacked,
  ChartLine,
  LayoutDashboard,
  Gauge,
  FileChartLine,
  FileChartColumn,
  SquareActivity,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type Emotion =
  | "joy"
  | "sadness"
  | "anger"
  | "fear"
  | "surprise"
  | "disgust"
  | "neutral";

export type TimePoint = {
  date: string | Date;
  scores: Record<Emotion, number>;
};

export type HeatmapDay = {
  date: string | Date;
  score: number; // 0..1
};

export type RecentAnalysis = {
  id: string;
  imageUrl: string; // Unsplash only
  timestamp: string | Date;
  topEmotions: { emotion: Emotion; score: number }[];
};

export type SummaryMetrics = {
  totalAnalyses: number;
  dominantEmotion: Emotion | null;
  stabilityScore: number; // 0..100
  changePct: number; // -100..100
  mostFrequentEmotions?: { emotion: Emotion; count: number }[];
};

export type EmotionAnalyticsDashboardProps = {
  className?: string;
  style?: React.CSSProperties;
  loading?: boolean;
  empty?: boolean;
  timeSeries?: TimePoint[];
  distribution?: Record<Emotion, number>;
  heatmap?: HeatmapDay[];
  summary?: SummaryMetrics;
  recentAnalyses?: RecentAnalysis[];
  defaultRange?: "week" | "month" | "year";
  defaultEmotionFilter?: "all" | Emotion;
  onDrillDown?: (payload: { type: "date" | "emotion"; value: string }) => void;
};

const EMOTIONS: Emotion[] = [
  "joy",
  "sadness",
  "anger",
  "fear",
  "surprise",
  "disgust",
  "neutral",
];

const EMOTION_LABEL: Record<Emotion, string> = {
  joy: "Joy",
  sadness: "Sadness",
  anger: "Anger",
  fear: "Fear",
  surprise: "Surprise",
  disgust: "Disgust",
  neutral: "Neutral",
};

const EMOTION_COLOR: Record<Emotion, string> = {
  joy: "var(--chart-1)",
  sadness: "var(--chart-2)",
  anger: "var(--chart-3)",
  fear: "var(--chart-4)",
  surprise: "var(--chart-5)",
  disgust: "rgba(79,124,255,0.6)", // variation of chart-3
  neutral: "rgba(106,168,255,0.6)", // variation of chart-1
};

function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(d: Date): string {
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function getRangeFilteredSeries(series: TimePoint[] | undefined, range: "week" | "month" | "year") {
  if (!series) return [];
  const now = new Date();
  const start = new Date(now);
  if (range === "week") start.setDate(now.getDate() - 6);
  if (range === "month") start.setMonth(now.getMonth() - 1);
  if (range === "year") start.setFullYear(now.getFullYear() - 1);
  return series.filter((p) => toDate(p.date) >= start).sort((a, b) => +toDate(a.date) - +toDate(b.date));
}

type HoverPoint =
  | { kind: "line"; x: number; y: number; label: string }
  | { kind: "bar"; x: number; y: number; label: string }
  | { kind: "cell"; x: number; y: number; label: string }
  | null;

export default function EmotionAnalyticsDashboard(props: EmotionAnalyticsDashboardProps) {
  const {
    className,
    style,
    loading: loadingProp,
    empty: emptyProp,
    timeSeries = [],
    distribution = {} as Record<Emotion, number>,
    heatmap = [],
    summary,
    recentAnalyses = [],
    defaultRange = "month",
    defaultEmotionFilter = "all",
    onDrillDown,
  } = props;

  const [range, setRange] = React.useState<"week" | "month" | "year">(defaultRange);
  const [emotionFilter, setEmotionFilter] = React.useState<"all" | Emotion>(defaultEmotionFilter);
  const [activeTab, setActiveTab] = React.useState<"line" | "bar" | "heatmap">("line");
  const [hover, setHover] = React.useState<HoverPoint>(null);

  const isLoading = !!loadingProp;
  const isEmpty = !!emptyProp || (!isLoading && timeSeries.length === 0 && recentAnalyses.length === 0);

  const series = React.useMemo(() => getRangeFilteredSeries(timeSeries, range), [timeSeries, range]);

  const overallByDate = React.useMemo(() => {
    if (series.length === 0) return [] as { date: Date; value: number }[];
    return series.map((p) => {
      const vals = Object.values(p.scores ?? {});
      const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return { date: toDate(p.date), value: clamp01(mean) };
    });
  }, [series]);

  const filteredLineSeries = React.useMemo(() => {
    if (emotionFilter === "all") return overallByDate;
    return series.map((p) => ({
      date: toDate(p.date),
      value: clamp01(p.scores?.[emotionFilter] ?? 0),
    }));
  }, [series, emotionFilter, overallByDate]);

  const dominantEmotion = summary?.dominantEmotion ?? null;
  const stability = typeof summary?.stabilityScore === "number" ? summary!.stabilityScore : 0;
  const changePct = typeof summary?.changePct === "number" ? summary!.changePct : 0;
  const totalAnalyses = summary?.totalAnalyses ?? 0;
  const mostFreq = summary?.mostFrequentEmotions ?? [];

  // Colors for bars in distribution chart
  const distributionPairs = React.useMemo(() => {
    return EMOTIONS.map((e) => ({
      emotion: e,
      value: (distribution as any)?.[e] ?? 0,
      color: EMOTION_COLOR[e],
    }));
  }, [distribution]);

  // Calendar heatmap grid computation (weeks x days)
  const calendarMatrix = React.useMemo(() => {
    if (!heatmap.length) return { weeks: 0, days: [] as { date: Date; score: number }[] };
    const sorted = [...heatmap].sort((a, b) => +toDate(a.date) - +toDate(b.date));
    const start = toDate(sorted[0].date);
    const end = toDate(sorted[sorted.length - 1].date);
    // Build continuous days between start and end
    const days: { date: Date; score: number }[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const hit = sorted.find((d) => new Date(toDate(d.date).toDateString()).getTime() === new Date(cursor.toDateString()).getTime());
      days.push({ date: new Date(cursor), score: clamp01(hit?.score ?? 0) });
      cursor.setDate(cursor.getDate() + 1);
    }
    const weeks = Math.ceil(days.length / 7);
    return { weeks, days };
  }, [heatmap]);

  // Loading and Empty
  if (isEmpty) {
    return (
      <Card className={cn("w-full bg-card shadow-sm border rounded-2xl", className)} style={style}>
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-[color:var(--primary)]" aria-hidden="true" />
            Emotion Analytics Dashboard
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Start by uploading an image to analyze emotions. Your insights and trends will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-secondary p-6">
              <div className="flex items-center gap-3">
                <Gauge className="h-5 w-5 text-[color:var(--primary)]" aria-hidden="true" />
                <p className="font-medium">No Metrics Yet</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Your stability score, dominant emotions, and distributions will show after your first analysis.
              </p>
            </div>
            <div className="rounded-xl border bg-secondary p-6">
              <div className="flex items-center gap-3">
                <FileChartLine className="h-5 w-5 text-[color:var(--primary)]" aria-hidden="true" />
                <p className="font-medium">Trends Over Time</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Track emotional patterns across days, weeks, and months with interactive charts.
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-xl border bg-card p-6">
            <div className="flex items-center gap-3">
              <SquareActivity className="h-5 w-5 text-[color:var(--primary)]" aria-hidden="true" />
              <p className="font-medium">Get Started</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload a new image in the analysis section above to begin building your emotional well-being history.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className={cn("w-full", className)} style={style}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ChartNoAxesCombined className="h-5 w-5 text-[color:var(--primary)]" aria-hidden="true" />
            <h2 className="text-xl sm:text-2xl font-heading">Analytics Overview</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex rounded-lg border bg-card p-1">
              <Button
                type="button"
                size="sm"
                variant={range === "week" ? "default" : "ghost"}
                className={cn(
                  "rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                  range === "week" ? "" : "text-foreground"
                )}
                onClick={() => setRange("week")}
                aria-pressed={range === "week"}
              >
                7D
              </Button>
              <Button
                type="button"
                size="sm"
                variant={range === "month" ? "default" : "ghost"}
                className={cn(
                  "rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                  range === "month" ? "" : "text-foreground"
                )}
                onClick={() => setRange("month")}
                aria-pressed={range === "month"}
              >
                1M
              </Button>
              <Button
                type="button"
                size="sm"
                variant={range === "year" ? "default" : "ghost"}
                className={cn(
                  "rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                  range === "year" ? "" : "text-foreground"
                )}
                onClick={() => setRange("year")}
                aria-pressed={range === "year"}
              >
                1Y
              </Button>
            </div>
            <Select
              value={emotionFilter}
              onValueChange={(v) => setEmotionFilter(v as any)}
            >
              <SelectTrigger className="w-[180px] bg-card">
                <SelectValue placeholder="Filter by emotion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All emotions</SelectItem>
                {EMOTIONS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {EMOTION_LABEL[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Total Analyses</CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="text-3xl font-semibold">{isLoading ? <Skeleton className="h-8 w-20 rounded-md" /> : totalAnalyses}</div>
              <ChartBarIncreasing className="h-5 w-5 text-[color:var(--primary)]" aria-hidden="true" />
            </CardContent>
          </Card>
          <Card className="bg-card border rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Dominant Emotion</CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              {isLoading ? (
                <Skeleton className="h-8 w-28 rounded-md" />
              ) : dominantEmotion ? (
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: EMOTION_COLOR[dominantEmotion] }}
                  />
                  <span className="text-lg font-medium">{EMOTION_LABEL[dominantEmotion]}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
              <ChartPie className="h-5 w-5 text-[color:var(--primary)]" aria-hidden="true" />
            </CardContent>
          </Card>
          <Card className="bg-card border rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Stability Score</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-6 w-24 rounded-md" />
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-semibold">{Math.round(stability)}</span>
                  <Gauge className="h-5 w-5 text-[color:var(--primary)]" aria-hidden="true" />
                </div>
              )}
              <div className="mt-2">
                {isLoading ? (
                  <Skeleton className="h-2 w-full rounded" />
                ) : (
                  <Progress value={Math.max(0, Math.min(100, stability))} className="h-2" />
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Trend</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              {isLoading ? (
                <Skeleton className="h-8 w-28 rounded-md" />
              ) : (
                <div className="flex items-center gap-2">
                  <TrendingUp className={cn("h-5 w-5", changePct >= 0 ? "text-green-600" : "text-[color:var(--destructive)]")} aria-hidden="true" />
                  <span className={cn("text-lg font-medium", changePct >= 0 ? "text-green-700" : "text-[color:var(--destructive)]")}>
                    {changePct > 0 ? "+" : ""}
                    {changePct.toFixed(1)}%
                  </span>
                </div>
              )}
              <ChartLine className="h-5 w-5 text-[color:var(--primary)]" aria-hidden="true" />
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Card className="mt-4 bg-card border rounded-2xl">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {activeTab === "line" ? <ChartSpline className="h-4 w-4 text-[color:var(--primary)]" aria-hidden="true" /> : null}
                  {activeTab === "bar" ? <ChartColumnStacked className="h-4 w-4 text-[color:var(--primary)]" aria-hidden="true" /> : null}
                  {activeTab === "heatmap" ? <SquareActivity className="h-4 w-4 text-[color:var(--primary)]" aria-hidden="true" /> : null}
                  {activeTab === "line" ? "Emotion Trend Over Time" : activeTab === "bar" ? "Emotion Distribution" : "Daily Emotion Heatmap"}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {activeTab === "line"
                    ? emotionFilter === "all"
                      ? "Average emotional intensity across all emotions."
                      : `Trend for ${EMOTION_LABEL[emotionFilter]}`
                    : activeTab === "bar"
                    ? "Distribution of detected emotions in the selected period."
                    : "Intensity by day. Click a cell to drill down."}
                </CardDescription>
              </div>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="hidden sm:block">
                <TabsList className="bg-secondary">
                  <TabsTrigger value="line" className="data-[state=active]:bg-card">Line</TabsTrigger>
                  <TabsTrigger value="bar" className="data-[state=active]:bg-card">Bars</TabsTrigger>
                  <TabsTrigger value="heatmap" className="data-[state=active]:bg-card">Heatmap</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="sm:hidden mb-3">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="bg-secondary w-full">
                  <TabsTrigger value="line" className="flex-1 data-[state=active]:bg-card">Line</TabsTrigger>
                  <TabsTrigger value="bar" className="flex-1 data-[state=active]:bg-card">Bars</TabsTrigger>
                  <TabsTrigger value="heatmap" className="flex-1 data-[state=active]:bg-card">Heatmap</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="relative min-h-[220px]">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-[180px] w-full rounded-xl" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-16 rounded" />
                    <Skeleton className="h-4 w-24 rounded" />
                  </div>
                </div>
              ) : activeTab === "line" ? (
                <LineChart
                  data={filteredLineSeries}
                  color={emotionFilter === "all" ? "var(--chart-1)" : EMOTION_COLOR[emotionFilter]}
                  onHover={setHover}
                  onLeave={() => setHover(null)}
                  onSelect={(d) => onDrillDown?.({ type: "date", value: d.toISOString() })}
                  ariaLabel="Line chart showing emotional trend over time"
                />
              ) : activeTab === "bar" ? (
                <BarChart
                  data={distributionPairs}
                  onHover={setHover}
                  onLeave={() => setHover(null)}
                  onSelect={(e) => onDrillDown?.({ type: "emotion", value: e })}
                  ariaLabel="Bar chart showing emotion distribution"
                />
              ) : (
                <CalendarHeatmap
                  weeks={calendarMatrix.weeks}
                  days={calendarMatrix.days}
                  onHover={setHover}
                  onLeave={() => setHover(null)}
                  onSelect={(d) => onDrillDown?.({ type: "date", value: d.toISOString() })}
                  ariaLabel="Calendar heatmap of daily emotions"
                />
              )}

              {hover && (
                <div
                  className="pointer-events-none absolute z-20 rounded-md border bg-popover px-2 py-1 text-xs shadow-sm"
                  style={{
                    left: Math.max(8, hover.x - 40),
                    top: Math.max(8, hover.y - 36),
                  }}
                  role="tooltip"
                >
                  {hover.label}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Insights + Recent */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card className="bg-card border rounded-2xl lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Insights</CardTitle>
              <CardDescription className="text-muted-foreground">Key takeaways based on your recent data.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <InsightRow
                icon={<FileChartColumn className="h-4 w-4 text-[color:var(--primary)]" aria-hidden="true" />}
                title="Most frequent emotions"
                body={
                  isLoading ? (
                    <Skeleton className="h-4 w-40 rounded" />
                  ) : mostFreq.length ? (
                    <div className="flex flex-wrap gap-2">
                      {mostFreq
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 3)
                        .map((m) => (
                          <Badge key={m.emotion} variant="secondary" className="gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: EMOTION_COLOR[m.emotion] }}
                              aria-hidden="true"
                            />
                            {EMOTION_LABEL[m.emotion]} <span className="text-muted-foreground">({m.count})</span>
                          </Badge>
                        ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Not enough data yet</span>
                  )
                }
              />
              <InsightRow
                icon={<ChartArea className="h-4 w-4 text-[color:var(--primary)]" aria-hidden="true" />}
                title="Stability context"
                body={
                  isLoading ? (
                    <Skeleton className="h-4 w-56 rounded" />
                  ) : (
                    <span className="text-sm">
                      Your stability score is{" "}
                      <strong>{Math.round(stability)}</strong>. {stability >= 70 ? "Consistent emotional patterns detected." : stability >= 40 ? "Moderate variation in emotions." : "High variability in recent emotions."}
                    </span>
                  )
                }
              />
              <InsightRow
                icon={<TrendingUp className="h-4 w-4 text-[color:var(--primary)]" aria-hidden="true" />}
                title="Trend analysis"
                body={
                  isLoading ? (
                    <Skeleton className="h-4 w-48 rounded" />
                  ) : (
                    <span className="text-sm">
                      Average intensity {changePct >= 0 ? "increased" : "decreased"} by{" "}
                      <strong className={changePct >= 0 ? "text-green-700" : "text-[color:var(--destructive)]"}>
                        {changePct > 0 ? "+" : ""}
                        {changePct.toFixed(1)}%
                      </strong>{" "}
                      over the selected period.
                    </span>
                  )
                }
              />
              <InsightRow
                icon={<ChartBarIncreasing className="h-4 w-4 text-[color:var(--primary)]" aria-hidden="true" />}
                title="Balanced profile"
                body={
                  isLoading ? (
                    <Skeleton className="h-4 w-60 rounded" />
                  ) : (
                    <span className="text-sm">
                      {emotionFilter === "all"
                        ? "Use the emotion filter to explore specific patterns by emotion."
                        : `You're viewing insights for ${EMOTION_LABEL[emotionFilter]}. Try switching emotions for comparison.`}
                    </span>
                  )
                }
              />
            </CardContent>
          </Card>

          <Card className="bg-card border rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent Analyses</CardTitle>
              <CardDescription className="text-muted-foreground">Latest uploads with timestamps and top emotions.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3 rounded" />
                        <Skeleton className="h-3 w-1/2 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentAnalyses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent analyses. Upload an image to see it here.</p>
              ) : (
                <ul className="space-y-4">
                  {recentAnalyses.slice(0, 6).map((item) => {
                    const date = toDate(item.timestamp);
                    return (
                      <li key={item.id} className="flex items-center gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-lg border bg-muted">
                          {/* Unsplash thumbnail */}
                          <img
                            src={item.imageUrl}
                            alt="Analyzed"
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{formatTime(date)}</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {item.topEmotions.slice(0, 3).map((te) => (
                              <Badge key={te.emotion} variant="outline" className="gap-1">
                                <span
                                  aria-hidden="true"
                                  className="inline-block h-2 w-2 rounded-full"
                                  style={{ backgroundColor: EMOTION_COLOR[te.emotion] }}
                                />
                                <span className="text-xs">{EMOTION_LABEL[te.emotion]}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {Math.round(te.score * 100)}%
                                </span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ----------------------------- Small Subcomponents ----------------------------- */

function InsightRow({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-secondary p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">{icon}</div>
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          <div className="mt-1 text-sm text-muted-foreground break-words">{body}</div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Charts (SVG) ----------------------------- */

function LineChart({
  data,
  color,
  onHover,
  onLeave,
  onSelect,
  ariaLabel,
}: {
  data: { date: Date; value: number }[];
  color: string;
  onHover: (p: HoverPoint) => void;
  onLeave: () => void;
  onSelect: (date: Date) => void;
  ariaLabel: string;
}) {
  const width = 920;
  const height = 220;
  const padding = { top: 12, right: 16, bottom: 28, left: 36 };

  const dates = data.map((d) => d.date.getTime());
  const values = data.map((d) => d.value);
  const minX = Math.min(...dates);
  const maxX = Math.max(...dates);
  const minY = 0;
  const maxY = 1;

  function xScale(t: number) {
    if (minX === maxX) return padding.left + (width - padding.left - padding.right) / 2;
    return (
      padding.left +
      ((t - minX) / (maxX - minX)) * (width - padding.left - padding.right)
    );
  }
  function yScale(v: number) {
    return padding.top + (1 - (v - minY) / (maxY - minY)) * (height - padding.top - padding.bottom);
  }

  const pathD = React.useMemo(() => {
    if (!data.length) return "";
    return data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(d.date.getTime())} ${yScale(d.value)}`)
      .join(" ");
  }, [data]);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data for the selected range.</p>;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border bg-secondary">
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${width} ${height}`}
        className="h-[220px] w-full"
      >
        {/* Grid */}
        <g>
          {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
            const y = yScale(g);
            return (
              <line
                key={i}
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeOpacity="0.8"
                strokeWidth={1}
              />
            );
          })}
        </g>

        {/* Axes labels (Y) */}
        <g>
          {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
            <text
              key={i}
              x={8}
              y={yScale(v) + 4}
              fontSize="10"
              fill="var(--color-muted-foreground)"
            >
              {(v * 100).toFixed(0)}%
            </text>
          ))}
        </g>

        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} />

        {/* Dots + interaction */}
        {data.map((d, i) => {
          const cx = xScale(d.date.getTime());
          const cy = yScale(d.value);
          const label = `${formatShortDate(d.date)} — ${(d.value * 100).toFixed(0)}%`;
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={3} fill={color} />
              <rect
                x={cx - 12}
                y={padding.top}
                width={24}
                height={height - padding.top - padding.bottom}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  const rect = (e.target as SVGRectElement).getBoundingClientRect();
                  onHover({
                    kind: "line",
                    x: rect.left + rect.width / 2 - (e.view?.scrollX ?? 0),
                    y: rect.top - (e.view?.scrollY ?? 0) + cy - 12,
                    label,
                  });
                }}
                onMouseLeave={onLeave}
                onClick={() => onSelect(d.date)}
                aria-label={`Data point ${label}`}
              />
            </g>
          );
        })}

        {/* X ticks */}
        <g>
          {data.map((d, i) => {
            if (i % Math.ceil(data.length / 6 || 1) !== 0) return null;
            const x = xScale(d.date.getTime());
            return (
              <text
                key={i}
                x={x}
                y={height - 8}
                textAnchor="middle"
                fontSize="10"
                fill="var(--color-muted-foreground)"
              >
                {formatShortDate(d.date)}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function BarChart({
  data,
  onHover,
  onLeave,
  onSelect,
  ariaLabel,
}: {
  data: { emotion: Emotion; value: number; color: string }[];
  onHover: (p: HoverPoint) => void;
  onLeave: () => void;
  onSelect: (emotion: Emotion) => void;
  ariaLabel: string;
}) {
  const width = 920;
  const height = 220;
  const padding = { top: 12, right: 16, bottom: 36, left: 36 };

  const maxVal = Math.max(1, ...data.map((d) => d.value));
  const xCount = data.length;
  const barW = (width - padding.left - padding.right) / xCount - 10;

  function x(i: number) {
    return padding.left + i * ((width - padding.left - padding.right) / xCount) + 5;
  }
  function y(v: number) {
    return padding.top + (1 - v / maxVal) * (height - padding.top - padding.bottom);
  }

  if (data.every((d) => d.value === 0)) {
    return <p className="text-sm text-muted-foreground">No distribution data for the selected range.</p>;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border bg-secondary">
      <svg role="img" aria-label={ariaLabel} viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full">
        {/* Grid */}
        <g>
          {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
            const yv = padding.top + (1 - g) * (height - padding.top - padding.bottom);
            return (
              <line
                key={i}
                x1={padding.left}
                x2={width - padding.right}
                y1={yv}
                y2={yv}
                stroke="var(--border)"
                strokeOpacity="0.8"
                strokeWidth={1}
              />
            );
          })}
        </g>

        {data.map((d, i) => {
          const bx = x(i);
          const by = y(d.value);
          const h = height - padding.bottom - by;
          const label = `${EMOTION_LABEL[d.emotion]} — ${d.value}`;
          return (
            <g key={d.emotion}>
              <rect
                x={bx}
                y={by}
                width={Math.max(6, barW)}
                height={Math.max(0, h)}
                fill={d.color}
                rx={6}
                className="cursor-pointer transition-opacity hover:opacity-90"
                onMouseEnter={(e) => {
                  const rect = (e.target as SVGRectElement).getBoundingClientRect();
                  onHover({
                    kind: "bar",
                    x: rect.left + rect.width / 2 - (e.view?.scrollX ?? 0),
                    y: rect.top - (e.view?.scrollY ?? 0) + by,
                    label,
                  });
                }}
                onMouseLeave={onLeave}
                onClick={() => onSelect(d.emotion)}
                aria-label={`Bar ${label}`}
              />
              <text
                x={bx + Math.max(6, barW) / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fill="var(--color-muted-foreground)"
              >
                {EMOTION_LABEL[d.emotion]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function CalendarHeatmap({
  weeks,
  days,
  onHover,
  onLeave,
  onSelect,
  ariaLabel,
}: {
  weeks: number;
  days: { date: Date; score: number }[];
  onHover: (p: HoverPoint) => void;
  onLeave: () => void;
  onSelect: (date: Date) => void;
  ariaLabel: string;
}) {
  const cell = 16;
  const gap = 4;
  const cols = Math.max(1, weeks);
  const rows = 7;
  const width = 36 + cols * (cell + gap) + gap;
  const height = 20 + rows * (cell + gap) + gap;

  function colorFor(v: number) {
    // Blend between accent and chart-3 based on intensity
    const base = [106, 168, 255]; // approx chart-1
    const strong = [79, 124, 255]; // approx chart-3
    const r = Math.round(base[0] + (strong[0] - base[0]) * v);
    const g = Math.round(base[1] + (strong[1] - base[1]) * v);
    const b = Math.round(base[2] + (strong[2] - base[2]) * v);
    return `rgb(${r}, ${g}, ${b})`;
  }

  if (!days.length) {
    return <p className="text-sm text-muted-foreground">No daily data to display.</p>;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border bg-secondary">
      <svg role="img" aria-label={ariaLabel} viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full">
        {/* Weekday labels */}
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <text key={d} x={8} y={24 + i * (cell + gap)} fontSize="10" fill="var(--color-muted-foreground)">
            {d}
          </text>
        ))}

        {/* Cells */}
        {days.map((d, idx) => {
          const week = Math.floor(idx / 7);
          const day = idx % 7;
          const x = 28 + week * (cell + gap);
          const y = 12 + day * (cell + gap);
          const label = `${formatShortDate(d.date)} — ${(d.score * 100).toFixed(0)}% intensity`;
          return (
            <rect
              key={idx}
              x={x}
              y={y}
              width={cell}
              height={cell}
              rx={4}
              fill={colorFor(d.score)}
              className="cursor-pointer"
              onMouseEnter={(e) => {
                const rect = (e.target as SVGRectElement).getBoundingClientRect();
                onHover({
                  kind: "cell",
                  x: rect.left + rect.width / 2 - (e.view?.scrollX ?? 0),
                  y: rect.top - (e.view?.scrollY ?? 0) + y,
                  label,
                });
              }}
              onMouseLeave={onLeave}
              onClick={() => onSelect(d.date)}
              aria-label={`Heat cell ${label}`}
            />
          );
        })}
      </svg>
    </div>
  );
}

/* ----------------------------- Example Usage Notes -----------------------------
Pass Unsplash images for recentAnalyses.imageUrl, e.g.:
https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=400&auto=format&fit=crop

This component is layout-agnostic. Parent controls spacing/placement.
It implements responsive, accessible, and performant SVG charts with tooltips and drill-down callbacks.
------------------------------------------------------------------------------ */