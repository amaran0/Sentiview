import { RegisterForm } from "@/components/auth/RegisterForm";

export default function Page(): JSX.Element {
  return (
    <div className="container max-w-7xl px-4 py-10 min-h-[60vh] flex items-center justify-center">
      <RegisterForm />
    </div>
  );
}