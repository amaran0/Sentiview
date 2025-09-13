"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import NavigationHeader from "@/components/navigation-header";
import EmotionUploadAnalyzer from "@/components/emotion-upload-analyzer";
import EmotionAnalyticsDashboard, {
  Emotion as DashboardEmotion,
  TimePoint,
  HeatmapDay,
  RecentAnalysis,
  SummaryMetrics,
} from "@/components/emotion-analytics-dashboard";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Trash2, Check } from "lucide-react";

type AnalyzerEmotion =
  | "happy"
  | "sad"
  | "angry"
  | "surprised"
  | "disgusted"
  | "fearful"
  | "neutral";

type AnalyzerScores = Record<AnalyzerEmotion, number>;

const analyzerToDashboardMap: Record<AnalyzerEmotion, DashboardEmotion> = {
  happy: "joy",
  sad: "sadness",
  angry: "anger",
  surprised: "surprise",
  disgusted: "disgust",
  fearful: "fear",
  neutral: "neutral",
};

function formatDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function Page() {
  const [activeKey, setActiveKey] = useState<string>("dashboard");
  const { data: session } = useSession();

  // Core app data
  const [timeSeries, setTimeSeries] = useState<TimePoint[]>([]);
  const [distribution, setDistribution] = useState<Record<DashboardEmotion, number>>({
    joy: 0,
    sadness: 0,
    anger: 0,
    fear: 0,
    surprise: 0,
    disgust: 0,
    neutral: 0,
  });
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([]);
  const [journalEntries, setJournalEntries] = useState<{ id: string; text: string; imageUrl?: string; timestamp: Date }[]>([]);
  const [journalText, setJournalText] = useState("");
  const [journalImageUrl, setJournalImageUrl] = useState<string | null>(null);
  const journalFileRef = useRef<HTMLInputElement>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [journalView, setJournalView] = useState<"day" | "week" | "month" | "year">("day");
  const entriesByDay = useMemo(() => {
    const groups: Record<string, { id: string; text: string; imageUrl?: string; timestamp: Date }[]> = {};
    for (const j of journalEntries) {
      const d = j.timestamp instanceof Date ? j.timestamp : new Date(j.timestamp);
      const key = formatDayKey(d);
      (groups[key] ||= []).push(j);
    }
    return Object.entries(groups).sort((a, b) => (a[0] < b[0] ? 1 : -1)); // newest day first
  }, [journalEntries]);
  const recentDayGroups = useMemo(() => {
    const now = new Date();
    const range = journalView === "week" ? 7 : journalView === "month" ? 30 : journalView === "year" ? 365 : Infinity;
    if (range === Infinity) return entriesByDay;
    return entriesByDay.filter(([k]) => {
      const d = new Date(k);
      const diff = Math.floor((+now - +d) / (1000 * 60 * 60 * 24));
      return diff <= range;
    });
  }, [entriesByDay, journalView]);

  // Build continuous day keys (today forward for next pages)
  const dayKeys = useMemo(() => {
    const today = new Date();
    const start = new Date(formatDayKey(today));
    const HORIZON_DAYS = 60; // show ~2 months forward for blank pages
    const keys: string[] = [];
    for (let i = 0; i <= HORIZON_DAYS; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      keys.push(formatDayKey(d));
    }
    // Ensure all existing keys are present
    entriesByDay.forEach(([k]) => {
      if (!keys.includes(k)) keys.push(k);
    });
    // ascending chronological, with today first index 0
    return keys.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
  }, [entriesByDay]);

  // Spreads: [left,right]; first spread is [cover, firstDay]
  const spreads = useMemo(() => {
    const arr: Array<[string | null, string | null]> = [];
    const list = dayKeys;
    if (!list.length) return [[null, formatDayKey(new Date())]] as Array<[string | null, string | null]>;
    arr.push([null, list[0]]);
    for (let i = 1; i < list.length; i += 2) {
      arr.push([list[i] ?? null, list[i + 1] ?? null]);
    }
    return arr;
  }, [dayKeys]);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});

  const getExistingText = useCallback(
    (day: string) => {
      const group = entriesByDay.find(([k]) => k === day)?.[1] ?? [];
      return group.map((e) => e.text).join("\n\n");
    },
    [entriesByDay]
  );

  const saveDay = useCallback(
    (day: string) => {
      const text = (drafts[day] ?? getExistingText(day)).trim();
      if (!text) return;
      setJournalEntries((prev) => {
        const filtered = prev.filter(
          (e) => formatDayKey(e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp)) !== day
        );
        const noon = new Date(`${day}T12:00:00`);
        return [{ id: String(Date.now()), text, timestamp: noon }, ...filtered];
      });
      setSavedMap((m) => ({ ...m, [day]: true }));
      setTimeout(() => setSavedMap((m) => ({ ...m, [day]: false })), 1200);
    },
    [drafts, getExistingText]
  );

  const deleteDay = useCallback((day: string) => {
    setJournalEntries((prev) =>
      prev.filter((e) => formatDayKey(e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp)) !== day)
    );
    setDrafts((d) => {
      const nd = { ...d };
      delete nd[day];
      return nd;
    });
  }, []);

  const nextPage = useCallback(() => setPageIndex((i) => Math.min(i + 1, Math.max(0, spreads.length - 1))), [spreads.length]);
  const prevPage = useCallback(() => setPageIndex((i) => Math.max(i - 1, 0)), []);
  const deleteEntry = useCallback((id: string) => {
    setJournalEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Layout refs for smooth navigation
  const topRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const handleNavigate = useCallback((key: string) => {
    setActiveKey(key);
    if (key === "dashboard") {
      dashboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleSave = useCallback(
    (payload: { file: File | null; imageUrl: string | null; scores: AnalyzerScores; note?: string }) => {
      const now = new Date();

      // Convert analyzer scores to dashboard domain
      const converted: Record<DashboardEmotion, number> = {
        joy: 0,
        sadness: 0,
        anger: 0,
        fear: 0,
        surprise: 0,
        disgust: 0,
        neutral: 0,
      };
      (Object.keys(payload.scores) as AnalyzerEmotion[]).forEach((k) => {
        const mapped = analyzerToDashboardMap[k];
        converted[mapped] += Math.max(0, Math.min(1, payload.scores[k] ?? 0));
      });

      // Update time series (store all emotion scores at this timestamp)
      setTimeSeries((prev) => [
        ...prev,
        {
          date: now,
          scores: converted,
        },
      ]);

      // Update distribution as cumulative sum of intensities
      setDistribution((prev) => {
        const next = { ...prev };
        (Object.keys(converted) as DashboardEmotion[]).forEach((e) => {
          next[e] = (next[e] ?? 0) + converted[e];
        });
        return next;
      });

      // Update heatmap (average intensity across emotions for the day)
      setHeatmap((prev) => {
        const byKey = new Map<string, { date: Date; total: number; count: number }>();
        // Seed with existing
        prev.forEach((d) => {
          const k = formatDayKey(d.date instanceof Date ? d.date : new Date(d.date));
          const dateObj = d.date instanceof Date ? d.date : new Date(d.date);
          byKey.set(k, { date: dateObj, total: d.score, count: 1 });
        });
        // Add new
        const kNow = formatDayKey(now);
        const mean =
          (Object.values(converted).reduce((a, b) => a + b, 0) / Math.max(1, Object.values(converted).length)) || 0;
        const existing = byKey.get(kNow);
        if (existing) {
          // average the day with the new sample
          const totalCombined = existing.total * existing.count + mean;
          const countCombined = existing.count + 1;
          byKey.set(kNow, { date: existing.date, total: totalCombined / countCombined, count: countCombined });
        } else {
          byKey.set(kNow, { date: new Date(kNow), total: mean, count: 1 });
        }
        // Return normalized array
        return Array.from(byKey.values())
          .map((v) => ({ date: v.date, score: Math.max(0, Math.min(1, v.total)) }))
          .sort((a, b) => +new Date(a.date) - +new Date(b.date));
      });

      // Determine top emotions for recent item
      const topEmotions = (Object.entries(converted) as [DashboardEmotion, number][])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([emotion, score]) => ({ emotion, score }));

      // Update recent analyses
      setRecentAnalyses((prev) => [
        {
          id: String(Date.now()),
          imageUrl:
            payload.imageUrl ||
            "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=400&auto=format&fit=crop",
          timestamp: now,
          topEmotions,
        },
        ...prev,
      ]);

      // Append to Journal if a note was provided with the photo
      if (payload.note && payload.note.trim()) {
        setJournalEntries((prev) => [
          { id: String(Date.now()), text: payload.note!.trim(), imageUrl: payload.imageUrl || undefined, timestamp: now },
          ...prev,
        ]);
      }
    },
    []
  );

  const summary: SummaryMetrics = useMemo(() => {
    const totalAnalyses = timeSeries.length;

    // Dominant emotion overall by summed intensity
    const sum: Record<DashboardEmotion, number> = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      disgust: 0,
      neutral: 0,
    };
    timeSeries.forEach((p) => {
      (Object.keys(p.scores) as DashboardEmotion[]).forEach((e) => {
        sum[e] += p.scores[e] ?? 0;
      });
    });
    const dominantEmotion =
      (Object.entries(sum) as [DashboardEmotion, number][])
        .sort((a, b) => b[1] - a[1])
        .map(([e]) => e)[0] || null;

    // Stability: 100 - scaled standard deviation of average intensity over time
    const avgs = timeSeries.map((p) => {
      const vals = Object.values(p.scores ?? {});
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });
    const mean = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : 0;
    const variance =
      avgs.length > 1 ? avgs.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (avgs.length - 1) : 0;
    const std = Math.sqrt(variance);
    const stabilityScore = Math.max(0, Math.min(100, Math.round(100 - std * 100))); // heuristic

    // Change percent: compare average of last 7 vs previous 7
    const last14 = timeSeries.slice(-14);
    const last7 = last14.slice(-7);
    const prev7 = last14.slice(0, Math.max(0, last14.length - 7));
    const avgBlock = (arr: TimePoint[]) => {
      if (!arr.length) return 0;
      const vals = arr.map((p) => {
        const v = Object.values(p.scores ?? {});
        return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
      });
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      return m;
    };
    const a1 = avgBlock(prev7);
    const a2 = avgBlock(last7);
    const changePct = a1 === 0 ? (a2 > 0 ? 100 : 0) : ((a2 - a1) / a1) * 100;

    // Most frequent emotions by top-1 occurrences
    const countTop: Record<DashboardEmotion, number> = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      disgust: 0,
      neutral: 0,
    };
    timeSeries.forEach((p) => {
      const top = (Object.entries(p.scores) as [DashboardEmotion, number][])
        .sort((a, b) => b[1] - a[1])[0];
      if (top) countTop[top[0]] += 1;
    });
    const mostFrequentEmotions = (Object.entries(countTop) as [DashboardEmotion, number][])
      .filter(([, c]) => c > 0)
      .map(([emotion, count]) => ({ emotion, count }));

    return {
      totalAnalyses,
      dominantEmotion,
      stabilityScore,
      changePct,
      mostFrequentEmotions,
    };
  }, [timeSeries]);

  const handleDrillDown = useCallback((payload: { type: "date" | "emotion"; value: string }) => {
    // Simple UX: scroll to upload on date drill-down to encourage adding context; keep dashboard for emotion
    if (payload.type === "date") {
      uploadRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const onSelectJournalFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setJournalImageUrl((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
    e.target.value = "";
  }, []);

  const removeJournalImage = useCallback(() => {
    setJournalImageUrl((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const addJournalEntry = useCallback(() => {
    const text = journalText.trim();
    if (!text && !journalImageUrl) return;
    const now = new Date();
    setJournalEntries((prev) => [
      { id: String(Date.now()), text, imageUrl: journalImageUrl || undefined, timestamp: now },
      ...prev,
    ]);
    setJournalText("");
    setJournalImageUrl((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
  }, [journalText, journalImageUrl]);

  return (
    <div ref={topRef} className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:py-6">
        <NavigationHeader
          className="sticky top-3 z-30"
          user={{
            name: session?.user?.name ?? undefined,
            email: session?.user?.email ?? undefined,
            avatarUrl: session?.user?.image ?? undefined,
          }}
          activeKey={activeKey}
          onNavigate={handleNavigate}
          unreadCount={2}
        />
      </div>

      <main className="mx-auto max-w-7xl px-4 pb-24">
        {/* Hero / Intro */}
        <section className="mb-6 sm:mb-8">
          <div className="rounded-2xl border bg-card px-4 py-5 sm:px-6 sm:py-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-heading tracking-tight">SentiView</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  SentiView analyzes emotions from your photos and tracks trends over time — privacy-first insights for your well-being.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {summary.totalAnalyses > 0 ? `${summary.totalAnalyses} analyses recorded` : "No data yet"}
              </div>
            </div>
          </div>
        </section>

        {/* Analyzer */}
        <section ref={uploadRef} className="mb-8 sm:mb-10">
          <EmotionUploadAnalyzer
            className="rounded-2xl"
            onSave={(p) => {
              // Integrate analyzer results into the app dataset
              handleSave(p);
              // After save, scroll to dashboard to view insights
              setTimeout(() => {
                dashboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                setActiveKey("dashboard");
              }, 200);
            }}
          />
        </section>

        {/* Journal */}
        <section className="mb-8 sm:mb-10">
          <div className="rounded-2xl border bg-card px-4 py-5 sm:px-6 sm:py-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-heading">Journal</h2>
                <p className="mt-1 text-sm text-muted-foreground">Write a short note about your day or feelings. Optionally attach a photo.</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setJournalOpen((v) => !v)}>
                {journalOpen ? "Close notebook" : "Open notebook"}
              </Button>
            </div>

            {!journalOpen ? (
              <button
                type="button"
                onClick={() => setJournalOpen(true)}
                className="mt-4 w-full rounded-xl border bg-gradient-to-br from-[color:var(--color-chart-2)] to-[color:var(--color-chart-5)] p-10 text-left shadow-sm hover:shadow transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold text-foreground">My Notebook</div>
                    <div className="text-sm text-muted-foreground">Click to open</div>
                  </div>
                  <div className="h-12 w-8 rounded bg-[color:var(--color-primary)]/10 border border-[color:var(--color-border)]" />
                </div>
              </button>
            ) : (
              <div className="mt-4 space-y-6">
                {/* Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex rounded-lg border bg-background p-1">
                    <button
                      type="button"
                      onClick={() => setJournalView("day")}
                      className={`px-3 py-1.5 text-sm rounded-md ${journalView === "day" ? "bg-[color:var(--color-chart-3)] text-white" : "text-foreground hover:bg-[color:var(--color-accent)]"}`}
                    >
                      Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setJournalView("week")}
                      className={`px-3 py-1.5 text-sm rounded-md ${journalView === "week" ? "bg-[color:var(--color-chart-3)] text-white" : "text-foreground hover:bg-[color:var(--color-accent)]"}`}
                    >
                      Week
                    </button>
                    <button
                      type="button"
                      onClick={() => setJournalView("month")}
                      className={`px-3 py-1.5 text-sm rounded-md ${journalView === "month" ? "bg-[color:var(--color-chart-3)] text-white" : "text-foreground hover:bg-[color:var(--color-accent)]"}`}
                    >
                      Month
                    </button>
                    <button
                      type="button"
                      onClick={() => setJournalView("year")}
                      className={`px-3 py-1.5 text-sm rounded-md ${journalView === "year" ? "bg-[color:var(--color-chart-3)] text-white" : "text-foreground hover:bg-[color:var(--color-accent)]"}`}
                    >
                      Year
                    </button>
                  </div>

                  {journalView === "day" ? (
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="secondary" onClick={prevPage} disabled={pageIndex === 0}>
                        Previous page
                      </Button>
                      <div className="text-xs text-muted-foreground">
                        {pageIndex + 1} / {spreads.length}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={nextPage}
                        disabled={pageIndex >= spreads.length - 1}
                      >
                        Next page
                      </Button>
                    </div>
                  ) : null}
                </div>

                {/* New entry composer */}
                {journalView !== "day" && (
                  <div className="rounded-xl border bg-background p-3 sm:p-4">
                    <textarea
                      value={journalText}
                      onChange={(e) => setJournalText(e.target.value)}
                      placeholder="How are you feeling today?"
                      className="w-full min-h-28 rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                    />
                    {journalImageUrl ? (
                      <div className="relative mt-3 inline-block">
                        <img src={journalImageUrl} alt="Attached" className="h-28 w-auto rounded-md border" />
                        <Button type="button" variant="ghost" size="sm" className="absolute -top-2 -right-2 bg-card/80" onClick={removeJournalImage}>Remove</Button>
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button type="button" variant="secondary" onClick={() => journalFileRef.current?.click()}>Attach photo</Button>
                      <input ref={journalFileRef} type="file" accept="image/*" onChange={onSelectJournalFile} className="sr-only" />
                      <Button type="button" onClick={addJournalEntry} disabled={!journalText.trim() && !journalImageUrl}>Save entry</Button>
                    </div>
                  </div>
                )}

                {/* Notebook pages */}
                {journalView === "day" ? (
                  (() => {
                    const [leftDay, rightDay] = spreads[pageIndex] || [null, null];
                    const renderCover = () => (
                      <div className="relative h-[520px] rounded-xl border bg-gradient-to-br from-[color:var(--color-chart-2)] to-[color:var(--color-chart-5)] shadow-sm">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4),transparent_40%)]" />
                        <div className="absolute bottom-6 left-6">
                          <div className="text-lg font-semibold">My Notebook</div>
                          <div className="text-sm text-[color:var(--color-sidebar-foreground)]">Personal journal</div>
                        </div>
                      </div>
                    );
                    const renderPage = (day: string | null, side: "left" | "right") => {
                      if (!day) return renderCover();
                      const value = drafts[day] ?? getExistingText(day);
                      const dateLabel = new Date(day).toLocaleDateString();
                      return (
                        <div className="relative h-[520px] rounded-xl border bg-card shadow-sm">
                          {/* lined paper handled on the textarea itself for perfect alignment */}
                          <div className="relative h-full flex flex-col">
                            <div className="flex items-center justify-between px-4 pt-3 pb-2">
                              <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] px-2.5 py-1 text-[11px] text-[color:var(--color-accent-foreground)]">{dateLabel}</span>
                              <div className="flex items-center gap-1">
                                {savedMap[day] && <Check className="h-4 w-4 text-green-600" />}
                                <Button type="button" size="sm" variant="secondary" onClick={() => saveDay(day)}>
                                  Save
                                </Button>
                                <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => deleteDay(day)}>
                                  Delete
                                </Button>
                              </div>
                            </div>
                            <div className="px-4 pb-4 flex-1">
                              <textarea
                                value={value}
                                onChange={(e) => setDrafts((d) => ({ ...d, [day]: e.target.value }))}
                                placeholder="Start typing..."
                                className="h-full w-full resize-none rounded-md border bg-transparent p-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] leading-[28px] [background-image:repeating-linear-gradient(180deg,transparent,transparent_27px,rgba(0,0,0,0.06)_28px)] [background-size:100%_28px] [background-position:0_0.75rem]"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
                        {/* center spine and rings */}
                        <div className="absolute inset-y-0 left-1/2 w-2 -translate-x-1/2 bg-[color:var(--color-border)]" />
                        <div className="absolute inset-y-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6">
                          {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="h-4 w-4 rounded-full border-2 border-[color:var(--color-border)] bg-background shadow" />
                          ))}
                        </div>
                        <div className="relative grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6">
                          {renderPage(leftDay, "left")}
                          {renderPage(rightDay, "right")}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  // Zoomed overview grid for week/month/year
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {recentDayGroups.length === 0 ? (
                      <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">No entries in selected range.</div>
                    ) : (
                      recentDayGroups.map(([day, entries], idx) => (
                        <details
                          key={day}
                          className="group relative overflow-hidden rounded-xl border bg-card p-4 text-left shadow-sm open:shadow transition-shadow"
                        >
                          <summary className="cursor-pointer list-none">
                            <div className="mb-2 text-xs text-muted-foreground">{new Date(day).toLocaleDateString()}</div>
                            <div className="text-sm text-foreground line-clamp-2 whitespace-pre-wrap">
                              {(entries.map((e) => e.text).join("\n\n").trim() || "(No text)").slice(0, 140)}{(entries.map((e)=>e.text).join("\n\n").trim().length ?? 0) > 140 ? "…" : ""}
                            </div>
                          </summary>
                          <div className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {entries.map((e) => e.text).join("\n\n") || "(No text)"}
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setJournalView("day");
                                const found = dayKeys.indexOf(day);
                                if (found === 0) setPageIndex(0);
                                else setPageIndex(1 + Math.floor((found - 1) / 2));
                              }}
                            >
                              Open day
                            </Button>
                          </div>
                          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(180deg,transparent,transparent_28px,rgba(79,124,255,0.08)_29px)]" />
                        </details>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Dashboard */}
        <section ref={dashboardRef} className="space-y-4">
          <EmotionAnalyticsDashboard
            timeSeries={timeSeries}
            distribution={distribution}
            heatmap={heatmap}
            summary={summary}
            recentAnalyses={recentAnalyses}
            defaultRange="month"
            defaultEmotionFilter="all"
            onDrillDown={handleDrillDown}
          />
        </section>
      </main>
    </div>
  );
}