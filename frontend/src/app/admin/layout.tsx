'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ShoppingBag, Package, Tag, Users,
  Settings, LogOut, ChevronLeft, ChevronRight, Menu, X,
  Store, BarChart2, Percent, Bell, ExternalLink, Bookmark,
  Boxes, Calculator, ShieldCheck, UserCheck, Lock, AlertTriangle,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  allowedRoles: string[]; // ['admin', 'ventas', 'logistica']
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',     href: '/admin',               icon: LayoutDashboard, allowedRoles: ['admin', 'ventas'] },
  { label: 'Pedidos',       href: '/admin/pedidos',        icon: ShoppingBag,     allowedRoles: ['admin', 'ventas'] },
  { label: 'Clientes',      href: '/admin/clientes',       icon: Users,           allowedRoles: ['admin', 'ventas'] },
  { label: 'Productos',     href: '/admin/productos',      icon: Package,         allowedRoles: ['admin', 'logistica'] },
  { label: 'Categorías',    href: '/admin/categorias',     icon: Tag,             allowedRoles: ['admin', 'logistica'] },
  { label: 'Marcas',        href: '/admin/marcas',         icon: Bookmark,        allowedRoles: ['admin', 'logistica'] },
  { label: 'Inventario',    href: '/admin/inventario',     icon: Boxes,           allowedRoles: ['admin', 'logistica'] },
  { label: 'Precios',       href: '/admin/precios',        icon: Calculator,      allowedRoles: ['admin', 'logistica'] },
  { label: 'Promociones',   href: '/admin/promociones',    icon: Percent,         allowedRoles: ['admin'] },
  { label: 'Gestión Usuarios', href: '/admin/usuarios',    icon: ShieldCheck,     allowedRoles: ['admin'] },
  { label: 'Configuración', href: '/admin/configuracion',  icon: Settings,        allowedRoles: ['admin'] },
];

const ROLE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  admin: { label: 'Administrador', color: 'bg-violet-600 text-white', icon: '👑' },
  ventas: { label: 'Ventas', color: 'bg-emerald-600 text-white', icon: '🛒' },
  vendedor: { label: 'Ventas', color: 'bg-emerald-600 text-white', icon: '🛒' },
  logistica: { label: 'Logística', color: 'bg-blue-600 text-white', icon: '📦' },
  operador: { label: 'Logística', color: 'bg-blue-600 text-white', icon: '📦' },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [companyName, setCompanyName] = useState('ChatYa Admin');
  const [companySlug, setCompanySlug] = useState('demo');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Auth guard & User role loading
  useEffect(() => {
    if (pathname === '/admin/login') {
      setLoadingUser(false);
      return;
    }

    const token = localStorage.getItem('chatya_token');
    if (!token) {
      router.replace('/admin/login');
      return;
    }

    const userRaw = localStorage.getItem('chatya_user');
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        setCurrentUser(u);
      } catch (e) {
        console.error(e);
      }
    }

    const slug = localStorage.getItem('chatya_company_slug') || 'demo';
    const name = localStorage.getItem('chatya_company_name') || 'Mi Empresa';
    setCompanySlug(slug);
    setCompanyName(name);
    setLoadingUser(false);
  }, [pathname, router]);

  if (pathname === '/admin/login') return <>{children}</>;

  const handleLogout = () => {
    localStorage.removeItem('chatya_token');
    localStorage.removeItem('chatya_user');
    localStorage.removeItem('chatya_company_slug');
    router.replace('/admin/login');
  };

  const userRole = (currentUser?.role || 'admin').toLowerCase();
  const roleInfo = ROLE_LABELS[userRole] || { label: userRole, color: 'bg-gray-600 text-white', icon: '👤' };

  // Filter navigation items based on current user role
  const visibleNav = ALL_NAV_ITEMS.filter((item) => item.allowedRoles.includes(userRole));

  // Determine if current route is allowed for this user
  const currentNavConfig = ALL_NAV_ITEMS.find((n) =>
    n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href)
  );

  const isAccessDenied = currentNavConfig && !currentNavConfig.allowedRoles.includes(userRole);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#111827]">
      {/* Logo & Company */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0 shadow-md">
          <span className="text-white font-black text-sm">CY</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-white font-bold text-base leading-tight">ChatYa</div>
            <div className="text-gray-400 text-xs truncate">{companyName}</div>
          </div>
        )}
      </div>

      {/* User Role Badge in Sidebar */}
      {!collapsed && currentUser && (
        <div className="mx-3 mt-3 p-2.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-white font-bold text-xs truncate">{currentUser.full_name || currentUser.email}</p>
            <p className="text-[10px] text-gray-400 truncate">{currentUser.email}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 ${roleInfo.color}`}>
            <span>{roleInfo.icon}</span> {roleInfo.label}
          </span>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map(({ label, href, icon: Icon }) => {
          const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`admin-nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: store link + collapse */}
      <div className="px-3 pb-4 space-y-1 border-t border-white/10 pt-3">
        {/* Tienda virtual preview (visible to admin and ventas) */}
        {(userRole === 'admin' || userRole === 'ventas') && (
          <Link
            href={`/${companySlug}?preview=true`}
            target="_blank"
            className={`admin-nav-item ${collapsed ? 'justify-center px-2' : ''}`}
            title="Ver tienda"
          >
            <Store className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <span className="flex-1 flex items-center justify-between">
                Ver tienda <ExternalLink className="w-3 h-3" />
              </span>
            )}
          </Link>
        )}
        <button
          onClick={handleLogout}
          className={`admin-nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 ${collapsed ? 'justify-center px-2' : ''}`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#111827] transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}
      >
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 top-20 -translate-x-0 bg-[#111827] border border-white/10 rounded-r-lg p-1 text-gray-400 hover:text-white hidden lg:flex"
          style={{ left: collapsed ? '52px' : '228px', transition: 'left 0.3s' }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 bg-[#111827] h-full"><SidebarContent /></div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            {/* Breadcrumb */}
            <div className="text-sm font-bold text-gray-700">
              {ALL_NAV_ITEMS.find((n) => (n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href)))?.label || 'Panel de Administración'}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User Profile Badge */}
            {currentUser && (
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-2xl border border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {currentUser.full_name || currentUser.email}
                  </div>
                  <div className="text-[10px] text-gray-500">{currentUser.email}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-sm ${roleInfo.color}`}>
                  <span>{roleInfo.icon}</span> {roleInfo.label}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Page Content with Role Guard */}
        <main className="flex-1 p-5 lg:p-7 overflow-y-auto">
          {isAccessDenied ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 card border-2 border-dashed border-red-200 rounded-3xl">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-4 shadow-sm">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Acceso Restringido</h2>
              <p className="text-sm text-gray-500 max-w-md mb-6">
                Tu perfil actual (<strong>{roleInfo.label}</strong>) no cuenta con permisos para acceder a esta sección.
              </p>
              <div className="flex gap-3">
                {userRole === 'ventas' && (
                  <Link href="/admin/pedidos" className="btn-dark px-5 py-2.5 text-xs font-bold">
                    Ir a Pedidos
                  </Link>
                )}
                {userRole === 'logistica' && (
                  <Link href="/admin/productos" className="btn-dark px-5 py-2.5 text-xs font-bold">
                    Ir a Productos
                  </Link>
                )}
                {userRole === 'admin' && (
                  <Link href="/admin" className="btn-dark px-5 py-2.5 text-xs font-bold">
                    Ir al Dashboard
                  </Link>
                )}
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
