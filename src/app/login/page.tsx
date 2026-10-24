import LoginForm from "./LoginForm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await getSession();
  if (session.userId) redirect("/dashboard");
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 p-4">
      <div className="w-full max-w-sm card p-6">
        <div className="text-center mb-6">
          <div className="text-xl font-bold text-brand-700">Prince Brass Trading Co.</div>
          <div className="text-xs text-gray-500 mt-1">Shop Management System</div>
        </div>
        <LoginForm />
        <div className="text-xs text-gray-500 mt-4 text-center">
          First time? Default login: <code className="font-mono">admin / admin123</code>
        </div>
      </div>
    </div>
  );
}
