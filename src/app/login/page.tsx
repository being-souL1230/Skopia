import AuthForm from "@/components/AuthForm";
import Wordmark from "@/components/Wordmark";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Wordmark />
      <h1 className="mt-10 text-3xl font-extrabold tracking-tight">Welcome back.</h1>
      <p className="mb-8 mt-2 text-mute">Sign in to review your repository health reports.</p>
      <AuthForm mode="login" oauthError={error} />
    </main>
  );
}
