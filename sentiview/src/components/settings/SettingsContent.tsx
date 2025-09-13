"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const SettingsContent = () => {
  const { data: session, isPending } = useSession();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [shareAnalytics, setShareAnalytics] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  // Apply theme class to <html>
  const applyTheme = (dark: boolean) => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  };

  // Load preferences when session available
  useEffect(() => {
    if (!session?.user) return;
    const key = `prefs:${session.user.id}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const prefs = JSON.parse(raw) as { emailNotifications?: boolean; theme?: "light" | "dark"; shareAnalytics?: boolean; avatarUrl?: string };
        if (typeof prefs.emailNotifications === "boolean") setEmailNotifications(prefs.emailNotifications);
        if (typeof prefs.shareAnalytics === "boolean") setShareAnalytics(prefs.shareAnalytics);
        if (typeof prefs.avatarUrl === "string") setAvatarUrl(prefs.avatarUrl);
        if (prefs.theme) {
          const isDark = prefs.theme === "dark";
          setDarkMode(isDark);
          applyTheme(isDark);
        }
      } catch {}
    }
  }, [session?.user]);

  // Persist preferences helper
  const persistPrefs = (next: Partial<{ emailNotifications: boolean; theme: "light" | "dark"; shareAnalytics: boolean; avatarUrl: string }>) => {
    if (!session?.user) return;
    const key = `prefs:${session.user.id}`;
    const current = (() => {
      try {
        return JSON.parse(localStorage.getItem(key) || "{}");
      } catch {
        return {};
      }
    })();
    const merged = { ...current, ...next };
    localStorage.setItem(key, JSON.stringify(merged));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    persistPrefs({ emailNotifications, theme: darkMode ? "dark" : "light", shareAnalytics, avatarUrl });
    toast.success("Settings saved");
  };

  const handleAvatarChange = async (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      setAvatarUrl(url);
      persistPrefs({ avatarUrl: url });
      // legacy key for header fallback
      localStorage.setItem("avatarUrl", url);
      toast.success("Profile photo updated");
    };
    reader.readAsDataURL(file);
  };

  const requestCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Immediately stop tracks to release camera
      stream.getTracks().forEach((t) => t.stop());
      toast.success("Camera access granted");
    } catch (err: any) {
      toast.error("Camera access denied");
    }
  };

  if (isPending) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                <div className="h-10 bg-muted rounded-md animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                <div className="h-10 bg-muted rounded-md animate-pulse" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-10 bg-muted rounded-full animate-pulse" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-10 bg-muted rounded-full animate-pulse" />
                </div>
              </div>
              <div className="h-10 w-24 bg-muted rounded-md animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Please log in to access your settings.</p>
              <Button asChild>
                <Link href="/login">Go to Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-heading font-bold">Profile & Settings</h1>
          <Button asChild variant="ghost">
            <Link href="/">Exit</Link>
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-1 ring-border">
                  <AvatarImage src={avatarUrl || session.user.image || ""} />
                  <AvatarFallback>{(session.user.name || "U").slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Label htmlFor="avatar">Profile photo</Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleAvatarChange(e.target.files?.[0])}
                  />
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  defaultValue={session.user.name || ""}
                  className="transition-all duration-200 focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={session.user.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-heading font-semibold">Preferences</h3>
                
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
                    <span>Email notifications</span>
                    <span className="text-sm text-muted-foreground font-normal">
                      Receive updates about your emotional well-being reports
                    </span>
                  </Label>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={(v) => {
                      setEmailNotifications(!!v);
                      persistPrefs({ emailNotifications: !!v });
                    }}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="share-analytics" className="flex flex-col space-y-1">
                    <span>Share anonymous analytics</span>
                    <span className="text-sm text-muted-foreground font-normal">
                      Help improve SentiView by sharing usage metrics
                    </span>
                  </Label>
                  <Switch
                    id="share-analytics"
                    checked={shareAnalytics}
                    onCheckedChange={(v) => {
                      const val = !!v;
                      setShareAnalytics(val);
                      persistPrefs({ shareAnalytics: val });
                    }}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="dark-mode" className="flex flex-col space-y-1">
                    <span>Dark mode</span>
                    <span className="text-sm text-muted-foreground font-normal">
                      Switch to dark theme for better night viewing
                    </span>
                  </Label>
                  <Switch
                    id="dark-mode"
                    checked={darkMode}
                    onCheckedChange={(v) => {
                      const next = !!v;
                      setDarkMode(next);
                      applyTheme(next);
                      persistPrefs({ theme: next ? "dark" : "light" });
                    }}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={requestCameraAccess}>
                  Request Camera Access
                </Button>
                <Button 
                  type="submit" 
                  className="transition-all duration-200 hover:scale-105 hover:shadow-lg"
                >
                  Save Settings
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Data & Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Manage your data. You can download or clear local data.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <a href="/api/download" rel="noopener noreferrer">Download data</a>
              </Button>
              <Button variant="destructive" onClick={() => { localStorage.clear(); toast.success("Local data cleared"); }}>
                Clear local data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};