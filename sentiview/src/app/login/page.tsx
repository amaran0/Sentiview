import { LoginForm } from "@/components/auth/LoginForm";

export default function Page() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoginForm />
      </div>
    </main>
  );
}