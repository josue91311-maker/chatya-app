# 🚀 ChatYa — Plataforma SaaS de Ventas por WhatsApp

<p align="center">
  <img src="./docs/logo.png" alt="ChatYa Logo" width="200"/>
</p>

**ChatYa** permite a cualquier negocio vender por WhatsApp sin usar la API oficial. El cliente recibe un enlace, lo abre dentro de WhatsApp, hace su pedido y solo presiona "Enviar".

---

## 📦 Estructura del Proyecto

```
ChatYa/
├── backend/          # FastAPI + SQLAlchemy (Python)
├── frontend/         # Next.js 14 + TypeScript + Tailwind
├── start.bat         # ▶️  Inicia todo con doble clic (Windows)
├── start-backend.bat # Solo backend
├── start-frontend.bat# Solo frontend
└── README.md
```

---

## ⚡ Inicio Rápido (Desarrollo Local)

### Prerequisitos
- [Python 3.11+](https://python.org) (verificar: `python --version`)
- [Node.js 18+](https://nodejs.org) (verificar: `node --version`)
- **No necesitas PostgreSQL** — usa SQLite por defecto ✅

### 1️⃣ Iniciar con un doble clic

```
Doble clic en: start.bat
```

Esto instala dependencias y arranca backend + frontend automáticamente.

### 2️⃣ O iniciar manualmente

**Backend:**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python seed_data.py      # Crea datos de demo
uvicorn main:app --reload --port 8000
```

**Frontend (otra terminal):**
```powershell
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

---

## 🌐 URLs de Desarrollo

| Servicio | URL | Descripción |
|---|---|---|
| 🛍️ **Tienda Demo** | http://localhost:3000/demo | Tienda del cliente |
| 🖥️ **Portal Admin** | http://localhost:3000/admin | Panel administrativo |
| 📦 **API Docs** | http://localhost:8000/docs | Swagger / OpenAPI |
| 🔍 **API Redoc** | http://localhost:8000/redoc | Documentación alternativa |

### Credenciales de Demo
| Campo | Valor |
|---|---|
| Email | `admin@chatya.com` |
| Contraseña | `chatya123` |

---

## 🧪 Probar sin WhatsApp

Agrega `?preview=true` al URL de la tienda:

```
http://localhost:3000/demo?preview=true
```

En modo preview, al confirmar el pedido, verás el mensaje de WhatsApp en pantalla en lugar de abrirse la app. Perfecto para testear todo el flujo.

---

## 🚀 Pasar a Producción

### 1. Configurar base de datos PostgreSQL

En `backend/.env`:
```env
# Cambiar esto:
DATABASE_URL=sqlite:///./chatya.db

# Por esto:
DATABASE_URL=postgresql://usuario:contraseña@host:5432/chatya
```

### 2. Ejecutar migraciones
```bash
cd backend
alembic upgrade head
```

### 3. Configurar dominio en frontend

En `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://api.tudominio.com/api/v1
```

### 4. Build de producción
```bash
cd frontend
npm run build
npm start
```

### 5. Con Docker (recomendado)
```bash
docker-compose up -d
```

---

## 🏢 Agregar una Nueva Empresa

1. Ir al portal admin: `/admin`
2. En Configuración → Crear empresa
3. Completar: nombre, slug, teléfono WhatsApp, logo, colores
4. Compartir el link de tienda: `https://tudominio.com/{slug}`

---

## 📱 Flujo del Cliente

```
1. Empresa envía link por WhatsApp
       ↓
2. Cliente abre link (dentro del WebView de WhatsApp)
       ↓
3. Ve la tienda: productos, categorías, promociones
       ↓
4. Agrega productos al carrito
       ↓
5. Completa checkout: nombre, WhatsApp, entrega, pago
       ↓
6. Confirma el pedido → sistema lo guarda
       ↓
7. Se abre WhatsApp con mensaje prellenado
       ↓
8. Cliente presiona "Enviar" ✅
       ↓
9. Empresa recibe el pedido en el portal admin
```

---

## 🎨 Paleta de Colores ChatYa

| Color | HEX | Uso |
|---|---|---|
| Violeta Primary | `#7C3AED` | Botones, acentos |
| Violeta Dark | `#5B21B6` | Hover, gradientes |
| Mint Accent | `#10FFAB` | Éxito, destacados |
| WhatsApp | `#25D366` | Botón de WhatsApp |
| Background | `#0D0B1E` | Fondo principal |
| Surface | `#161228` | Superficies |
| Card | `#1E1635` | Tarjetas |

---

## 📊 Variables de Entorno

### Backend (`backend/.env`)
```env
DATABASE_URL=sqlite:///./chatya.db
SECRET_KEY=cambia-esto-en-produccion-minimo-32-caracteres
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30
UPLOAD_DIR=./uploads
FRONTEND_URL=http://localhost:3000
APP_NAME=ChatYa
DEBUG=true
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## 🔮 Integración Futura con WhatsApp Business API

El código está preparado para integración opcional. Cuando estés listo:

1. En `backend/app/services/whatsapp_service.py` existe el hook `send_notification_via_api()`
2. Agregar credenciales en `.env`: `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_ID`
3. Habilitar en la configuración de empresa: "Notificaciones automáticas"

---

## 🛠️ Tecnologías

| Capa | Tecnología |
|---|---|
| Backend | FastAPI, SQLAlchemy 2.x, Pydantic v2 |
| Base de datos | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT (python-jose) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Estado | Zustand |
| Gráficas | Recharts |
| Animaciones | Framer Motion |
| Iconos | Lucide React |

---

## 📞 Soporte

- **Documentación API**: http://localhost:8000/docs
- **Issues**: Revisar logs en `backend/logs/` y consola del frontend

---

*Hecho con ❤️ — ChatYa v1.0*
