import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex flex-col">
        <h1 className="text-6xl font-bold text-primary mb-4">ChatYa</h1>
        <p className="text-xl text-textSecondary mb-8 text-center">
          Plataforma de comercio por WhatsApp
        </p>
        <div className="flex gap-4">
          <Link href="/demo-store" className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded transition-colors">
            Ver Tienda Demo
          </Link>
          <Link href="/admin/login" className="bg-surface border border-border hover:bg-card text-white font-bold py-2 px-4 rounded transition-colors">
            Portal Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
