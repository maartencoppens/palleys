import Button from "@/components/design/Button";
import { getMessages } from "@/core/locale/server";

export default async function NotFound() {
  const { notFound: m } = await getMessages();
  return (
    <main className="flex min-h-svh items-center justify-center bg-page section-x">
      <div className="flex max-w-xl flex-col items-center gap-5 text-center">
        <h1 className="font-display text-4xl font-bold text-medium-green md:text-5xl">{m.title}</h1>
        <p className="text-lg text-text-primary">{m.text}</p>
        <Button variant="primary" href="/">
          {m.cta}
        </Button>
      </div>
    </main>
  );
}
