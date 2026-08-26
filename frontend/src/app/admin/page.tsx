'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign, ShoppingBag, Users, TrendingUp,
  Package, ChevronRight, Clock, CheckCircle2, AlertCircle, Loader2,
  Calendar, RefreshCw, BarChart3,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function authHeader(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('chatya_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const STATUS_BADGES: Record<string, string> = {
  pendiente: 'bg-amber-50 text-amber-800 border-amber-200',
  recibido: 'bg-blue-50 text-blue-800 border-blue-200',
  preparando: 'bg-orange-50 text-orange-800 border-orange-200',
  'en camino': 'bg-indigo-50 text-indigo-800 border-indigo-200',
  entregado: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  pagado: 'bg-purple-50 text-purple-800 border-purple-200',
  anulado: 'bg-red-50 text-red-800 border-red-200',
  cancelado: 'bg-red-50 text-red-800 border-red-200',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    today_sales: 0,
    month_sales: 0,
    pending_orders: 0,
    total_customers: 0,
    total_products: 0,
    avg_order: 0,
    today_orders_count: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month'>('week');
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [companySlug, setCompanySlug] = useState('demo');

  useEffect(() => {
    const slug = localStorage.getItem('chatya_company_slug') || 'demo';
    setCompanySlug(slug);
    fetchDashboard();
  }, []);

  useEffect(() => {
    fetchChart(chartPeriod);
  }, [chartPeriod]);

  const fetchChart = async (period: 'week' | 'month') => {
    try {
      setChartLoading(true);
      const headers = authHeader();
      const res = await fetch(`${API}/api/v1/dashboard/sales-chart?period=${period}`, { headers });
      if (res.ok) {
        const d = await res.json();
        setChartData(d.data || []);
      }
    } catch (e) {
      console.error('Error fetching chart data:', e);
    } finally {
      setChartLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const headers = authHeader();

      const [summaryRes, ordersRes, productsRes] = await Promise.all([
        fetch(`${API}/api/v1/dashboard/summary`, { headers }).catch(() => null),
        fetch(`${API}/api/v1/dashboard/recent-orders`, { headers }).catch(() => null),
        fetch(`${API}/api/v1/dashboard/top-products`, { headers }).catch(() => null),
      ]);

      if (summaryRes?.ok) {
        const d = await summaryRes.json();
        setStats(d.data || d);
      }
      if (ordersRes?.ok) {
        const d = await ordersRes.json();
        setRecentOrders(d.data || d || []);
      }
      if (productsRes?.ok) {
        const d = await productsRes.json();
        setTopProducts(d.data || d || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalPeriodSales = chartData.reduce((acc, curr) => acc + (curr.ventas || 0), 0);
  const totalPeriodOrders = chartData.reduce((acc, curr) => acc + (curr.pedidos || 0), 0);

  const statCards = [
    {
      title: 'Ventas de Hoy',
      value: `S/ ${(stats.today_sales || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-slate-900',
      bg: 'bg-slate-100',
      sub: `${stats.today_orders_count || 0} pedido(s) hoy`,
    },
    {
      title: 'Ventas del Mes',
      value: `S/ ${(stats.month_sales || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      sub: 'acumulado mensual',
    },
    {
      title: 'Pedidos Pendientes',
      value: `${stats.pending_orders || 0}`,
      icon: ShoppingBag,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      sub: 'por despachar',
    },
    {
      title: 'Clientes Registrados',
      value: `${stats.total_customers || 0}`,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      sub: 'base de clientes',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
          <p className="text-gray-500 text-sm mt-0.5">Resumen de ventas y pedidos en tiempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchDashboard(); fetchChart(chartPeriod); }}
            className="btn-outline text-xs px-3.5 py-2 font-bold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
          <Link
            href={`/${companySlug}?preview=true`}
            target="_blank"
            className="btn-dark text-xs px-4 py-2 font-bold flex items-center gap-1.5"
          >
            Ver Tienda Online →
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5">
              <div className="skeleton h-4 w-20 mb-3 rounded" />
              <div className="skeleton h-8 w-28 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.title} className="card p-5 border border-gray-200 shadow-sm flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-gray-500 text-xs font-semibold">{s.title}</p>
                <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">{s.value}</p>
                <p className="text-gray-400 text-xs mt-0.5">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Real Sales Chart */}
        <div className="lg:col-span-2 card p-5 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-800" />
                Ventas Reales — {chartPeriod === 'week' ? 'Últimos 7 Días' : 'Últimos 30 Días'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Total acumulado en el período: <strong className="text-slate-900 font-bold">S/ {totalPeriodSales.toFixed(2)}</strong> ({totalPeriodOrders} pedidos)
              </p>
            </div>

            {/* Period selector tabs */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1 text-xs">
              <button
                onClick={() => setChartPeriod('week')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  chartPeriod === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                7 Días
              </button>
              <button
                onClick={() => setChartPeriod('month')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  chartPeriod === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                30 Días
              </button>
            </div>
          </div>

          <div className="h-64 pt-2">
            {chartLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-800" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                <Calendar className="w-8 h-8 text-gray-300 mb-2" />
                No hay ventas registradas en este período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={chartPeriod === 'week' ? 32 : 12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `S/${val}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1">
                            <p className="font-bold text-slate-200">{label} ({data.full_date})</p>
                            <p className="text-emerald-400 font-extrabold text-sm">
                              Ventas: S/ {Number(data.ventas || 0).toFixed(2)}
                            </p>
                            <p className="text-slate-400">
                              Pedidos: {data.pedidos}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={{ fill: '#F8FAFC' }}
                  />
                  <Bar dataKey="ventas" fill="#0F172A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick Actions & Top Products */}
        <div className="space-y-5">
          {/* Quick Actions */}
          <div className="card p-5 border border-gray-200 shadow-sm space-y-3">
            <h2 className="font-bold text-gray-900 text-sm">Acciones Rápidas</h2>
            <div className="space-y-2">
              {[
                { label: 'Gestionar Pedidos', href: '/admin/pedidos', icon: ShoppingBag, color: 'text-amber-700 bg-amber-50' },
                { label: 'Catálogo de Productos', href: '/admin/productos', icon: Package, color: 'text-slate-800 bg-slate-100' },
                { label: 'Base de Clientes', href: '/admin/clientes', icon: Users, color: 'text-blue-700 bg-blue-50' },
                { label: 'Configuración y Comprobantes', href: '/admin/configuracion', icon: TrendingUp, color: 'text-emerald-700 bg-emerald-50' },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${a.color}`}>
                      <a.icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-gray-800">{a.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Top Products */}
          {topProducts.length > 0 && (
            <div className="card p-5 border border-gray-200 shadow-sm space-y-3">
              <h2 className="font-bold text-gray-900 text-sm">Productos Más Vendidos</h2>
              <div className="divide-y divide-gray-100">
                {topProducts.map((p, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-900 truncate">{p.name}</p>
                      <p className="text-[11px] text-gray-400">{p.quantity} unid. vendidas</p>
                    </div>
                    <span className="font-black text-slate-900 flex-shrink-0">
                      S/ {Number(p.revenue || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="card overflow-hidden border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Últimos Pedidos Registrados</h2>
            <p className="text-xs text-gray-500">Pedidos más recientes recibidos en la plataforma</p>
          </div>
          <Link href="/admin/pedidos" className="text-slate-900 text-xs font-bold hover:underline">
            Ver todos los pedidos →
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-800 mx-auto" />
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="p-10 text-center">
            <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-700 font-bold text-sm">Aún no hay pedidos registrados</p>
            <p className="text-gray-400 text-xs mt-1">Los pedidos que tus clientes hagan aparecerán aquí automáticamente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-left">Código</th>
                  <th className="py-3 px-4 text-left">Cliente</th>
                  <th className="py-3 px-4 text-left">Monto Total</th>
                  <th className="py-3 px-4 text-left">Estado</th>
                  <th className="py-3 px-4 text-left">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.map((order: any) => {
                  const statusKey = order.status?.toLowerCase() || 'pendiente';
                  const badgeStyle = STATUS_BADGES[statusKey] || 'bg-gray-100 text-gray-800';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <Link href="/admin/pedidos" className="hover:underline">
                          {order.order_code}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-800">{order.customer_name}</td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        S/ {Number(order.total || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${badgeStyle}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-[11px]">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleString('es-PE', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
