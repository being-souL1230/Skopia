import AuthForm from "@/components/AuthForm";
import Wordmark from "@/components/Wordmark";

export default async function Register({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Wordmark />
      <h1 className="mt-10 text-3xl font-extrabold tracking-tight">Create your workspace.</h1>
      <p className="mb-8 mt-2 text-mute">Two sample reports are added so you can explore immediately.</p>
      <AuthForm mode="register" oauthError={error} />
    </main>
  );
}
