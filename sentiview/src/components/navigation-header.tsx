"use client";

import * as React from "react";
import {
  Menu,
  LayoutDashboard,
  LayoutTemplate,
  Settings2,
  SquareMenu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type NavItem = {
  key: string;
  label: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type User = {
  name?: string;
  email?: string;
  avatarUrl?: string;
};

export interface NavigationHeaderProps {
  className?: string;
  style?: React.CSSProperties;
  user?: User;
  navItems?: NavItem[];
  activeKey?: string;
  onNavigate?: (key: string) => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  unreadCount?: number;
  compact?: boolean;
}

const defaultItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "profile", label: "Profile", icon: LayoutTemplate },
];

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function NavigationHeader({
  className,
  style,
  user,
  navItems = defaultItems,
  activeKey,
  onNavigate,
  onOpenNotifications,
  onOpenSettings,
  unreadCount = 0,
  compact = false,
}: NavigationHeaderProps) {
  const initials = React.useMemo(() => getInitials(user?.name), [user?.name]);
  const router = useRouter();
  const [openSupport, setOpenSupport] = React.useState(false);
  const [openNotifications, setOpenNotifications] = React.useState(false);
  const [openPrivacy, setOpenPrivacy] = React.useState(false);
  const [localAvatar, setLocalAvatar] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    try {
      const uid = (user as any)?.id || "guest";
      const key = `prefs:${uid}`;
      const prefs = JSON.parse(localStorage.getItem(key) || "{}");
      const a1 = prefs?.avatarUrl as string | undefined;
      const a2 = localStorage.getItem("avatarUrl") || undefined;
      setLocalAvatar(a1 || a2 || undefined);
    } catch {}
  }, [user]);

  const handleSignOut = React.useCallback(async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error(error.code);
      return;
    }
    localStorage.removeItem("bearer_token");
    router.push("/");
  }, [router]);

  return (
    <header
      className={cn(
        "w-full bg-card text-foreground border border-border/60 rounded-xl",
        "shadow-sm",
        "backdrop-blur supports-[backdrop-filter]:bg-card/95",
        className
      )}
      style={style}
      role="banner"
    >
      <div className={cn("flex items-center w-full max-w-full", compact ? "px-3 py-2" : "px-4 py-3")}>
        {/* Left: Branding */}
        <Link href="/" className="min-w-0 group" aria-label="SentiView home">
          <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-accent/60 to-secondary/80 ring-1 ring-border px-2.5 py-1">
            <div aria-hidden="true" className="h-8 w-8 rounded-md bg-secondary ring-1 ring-border flex items-center justify-center">
              <span className="text-primary font-semibold text-sm">SV</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-heading font-semibold text-sm sm:text-base tracking-[-0.01em] truncate">
                SentiView
              </span>
              <span className="text-[11px] sm:text-xs text-muted-foreground leading-none">Emotion Insights</span>
            </div>
          </div>
        </Link>

        {/* Center: Primary navigation (desktop) */}
        <nav className="ml-4 hidden md:flex items-center gap-1" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;
            return (
              <Button
                key={item.key}
                type="button"
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "h-9 px-3 rounded-md",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  if (item.key === "profile") {
                    router.push("/settings");
                  } else if (item.key === "dashboard") {
                    onNavigate?.(item.key);
                  } else if (onNavigate) {
                    onNavigate(item.key);
                  }
                }}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                {Icon ? <Icon className="mr-2 h-4 w-4" aria-hidden="true" /> : null}
                <span className="text-sm">{item.label}</span>
              </Button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* Mobile nav (collapsed to menu) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="md:hidden h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={8} className="w-56 bg-popover">
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Navigate</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeKey === item.key;
                return (
                  <DropdownMenuItem
                    key={item.key}
                    onClick={() => {
                      if (item.key === "profile") {
                        router.push("/settings");
                      } else if (item.key === "dashboard") {
                        onNavigate?.(item.key);
                      } else if (onNavigate) {
                        onNavigate(item.key);
                      }
                    }}
                    className={cn("cursor-pointer", isActive && "bg-secondary/60")}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {Icon ? <Icon className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" /> : null}
                    <span className="min-w-0 truncate">{item.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu open={openNotifications} onOpenChange={setOpenNotifications}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="relative h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                aria-label="Open notifications"
                onClick={() => setOpenNotifications(true)}
              >
                <SquareMenu className="h-5 w-5" aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span
                    aria-label={`${unreadCount} unread notifications`}
                    className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-chart-3 text-white text-[10px] leading-none px-1 ring-2 ring-card"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-72 bg-popover">
              <DropdownMenuLabel className="text-sm">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="py-2 px-2">
                <p className="text-sm text-muted-foreground">
                  You&apos;re all caught up. New updates will appear here.
                </p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Divider */}
          <Separator orientation="vertical" className="hidden sm:block h-6" />

          {/* Settings */}
          <DropdownMenu open={openPrivacy} onOpenChange={setOpenPrivacy}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="hidden sm:inline-flex h-9 px-2 text-muted-foreground hover:text-foreground"
                aria-label="Open settings"
                onClick={() => setOpenPrivacy(true)}
              >
                <Settings2 className="h-5 w-5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-56 bg-popover">
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/settings")}>Preferences</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setOpenNotifications(true)}>Notifications</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setOpenPrivacy(true)}>Data & privacy</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-9 pl-1 pr-2 sm:pr-3 gap-2"
                aria-label="Open account menu"
              >
                <Avatar className="h-7 w-7 ring-1 ring-border">
                  <AvatarImage
                    src={user?.avatarUrl || localAvatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"}
                    alt={user?.name ? `${user.name} avatar` : "User avatar"}
                  />
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium max-w-[12rem] truncate">{user?.name || "Guest"}</span>
                  <span className="text-[11px] text-muted-foreground max-w-[12rem] truncate">
                    {user?.email || "Not signed in"}
                  </span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-64 bg-popover">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 ring-1 ring-border">
                    <AvatarImage
                      src={user?.avatarUrl || localAvatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"}
                      alt={user?.name ? `${user.name} avatar` : "User avatar"}
                    />
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{user?.name || "Guest"}</div>
                    <div className="text-xs text-muted-foreground truncate">{user?.email || "Not signed in"}</div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => router.push("/settings")}
              >
                Profile & Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setOpenSupport(true)}>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={handleSignOut}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Support Dialog */}
      <Dialog open={openSupport} onOpenChange={setOpenSupport}>
        <DialogContent className="bg-popover">
          <DialogHeader>
            <DialogTitle>Contact Support</DialogTitle>
            <DialogDescription>Send us an email and we'll get back to you.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget as HTMLFormElement;
              const email = (form.elements.namedItem("email") as HTMLInputElement)?.value || "";
              const message = (form.elements.namedItem("message") as HTMLInputElement)?.value || "";
              const subject = encodeURIComponent("SentiView Support");
              const body = encodeURIComponent(message);
              const href = `mailto:${email || "support@senti.view"}?subject=${subject}&body=${body}`;
              const a = document.createElement("a");
              a.href = href;
              a.click();
              setOpenSupport(false);
            }}
          >
            <div className="space-y-2">
              <label className="text-sm" htmlFor="email">Your email</label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm" htmlFor="message">Message</label>
              <Input id="message" name="message" placeholder="How can we help?" />
            </div>
            <DialogFooter>
              <Button type="submit">Send Email</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Privacy Dialog */}
      <Dialog open={openPrivacy} onOpenChange={setOpenPrivacy}>
        <DialogContent className="bg-popover">
          <DialogHeader>
            <DialogTitle>Data & Privacy</DialogTitle>
            <DialogDescription>Manage analytics sharing and data exports.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">Control how your data is used. You can also download your data.</p>
            <div className="flex gap-2">
              <Button asChild variant="secondary">
                <a href="/api/download" rel="noopener noreferrer">Download data</a>
              </Button>
              <Button variant="destructive" onClick={() => {
                localStorage.clear();
                toast.success("Local data cleared");
              }}>Clear local data</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={openNotifications} onOpenChange={setOpenNotifications}>
        <DialogContent className="bg-popover">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
            <DialogDescription>Set how you want to be notified.</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">Email notifications can be configured in Preferences.</div>
        </DialogContent>
      </Dialog>
    </header>
  );
}