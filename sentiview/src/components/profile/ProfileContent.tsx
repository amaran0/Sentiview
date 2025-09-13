"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";

export const ProfileContent = () => {
  const { data: session, isPending, refetch } = useSession();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);

  const applyTheme = (dark: boolean) => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  };

  useEffect(() => {
    if (!session?.user) return;
    const key = `prefs:${session.user.id}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const prefs = JSON.parse(raw) as { theme?: "light" | "dark" };
        if (prefs.theme) {
          const isDark = prefs.theme === "dark";
          setDarkMode(isDark);
          applyTheme(isDark);
        }
      }
    } catch {}
  }, [session?.user]);

  const persistPrefs = (next: Partial<{ theme: "light" | "dark" }>) => {
    if (!session?.user) return;
    const key = `prefs:${session.user.id}`;
    let current: Record<string, unknown> = {};
    try {
      current = JSON.parse(localStorage.getItem(key) || "{}");
    } catch {}
    localStorage.setItem(key, JSON.stringify({ ...current, ...next }));
  };

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error(error.code);
    } else {
      localStorage.removeItem("bearer_token");
      refetch();
      router.push("/");
    }
  };

  if (isPending) {
    return (
      <div className="container py-12">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-48 bg-muted rounded" />
              <div className="h-20 w-20 bg-muted rounded-full mx-auto" />
              <div className="h-6 w-64 bg-muted rounded mx-auto" />
              <div className="h-4 w-48 bg-muted rounded mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="container py-12">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Please{" "}
              <a href="/login" className="text-primary hover:underline">
                sign in
              </a>{" "}
              to view your profile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const user = session.user;

  return (
    <div className="container py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Your Profile</CardTitle>
            <Button variant="ghost" onClick={() => router.push("/")}>Exit</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Account Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Account</h3>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.image || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <p className="font-semibold text-lg">
                  {user.name || "No name provided"}
                </p>
                <p className="text-muted-foreground">{user.email}</p>
                <p className="text-sm text-muted-foreground">
                  User ID: {user.id}
                </p>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Security</h3>
            <p className="text-sm text-muted-foreground">
              Your account is protected with modern security measures. Sign out when finished to keep your data safe.
            </p>
          </div>

          {/* Preferences Section - Dark Mode */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Preferences</h3>
            <div className="flex items-center justify-between">
              <span className="flex flex-col">
                <span>Dark mode</span>
                <span className="text-sm text-muted-foreground">Switch to dark theme for better night viewing</span>
              </span>
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

          {/* Actions Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Actions</h3>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};