import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';

export default function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-white">
            {params.slug.charAt(0).toUpperCase()}
          </div>
          <h1 className="font-semibold text-lg capitalize">{params.slug}</h1>
        </div>
        <Link href={`/${params.slug}/carrito`} className="relative p-2 text-textPrimary">
          <ShoppingCart className="w-6 h-6" />
        </Link>
      </header>
      <main>{children}</main>
    </div>
  );
}
