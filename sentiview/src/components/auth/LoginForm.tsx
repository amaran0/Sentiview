"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { authClient } from "@/lib/auth-client";
import { X } from "lucide-react";

export const LoginForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("registered") === "true") {
      toast.success("Account created! Please check your email to verify.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsPending(true);

    try {
      const { data, error } = await authClient.signIn.email({
        email: email.trim(),
        password: password,
        rememberMe: rememberMe,
        callbackURL: "/profile"
      });

      if (error?.code) {
        toast.error("Invalid email or password. Please make sure you have already registered an account and try again.");
        return;
      }

      router.push("/profile");
    } catch (err) {
      toast.error("Login failed. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md w-full">
      <div className="border rounded-xl bg-card p-6 shadow-sm relative">
        {/* Close button */}
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Close login"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Register here
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                disabled={isPending}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={isPending}
              />
              <Label
                htmlFor="remember-me"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Remember me
              </Label>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="w-1/2" onClick={() => router.back()} disabled={isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-1/2"
                disabled={isPending}
              >
                {isPending ? "Signing in..." : "Sign in"}
              </Button>
            </div>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Need help?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Create a new account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};