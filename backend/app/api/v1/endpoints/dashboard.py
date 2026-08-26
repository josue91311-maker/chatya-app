from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.order import Order, OrderItem
from app.models.customer import Customer
from app.models.product import Product

router = APIRouter()

EXCLUDED_STATUSES = ["Anulado", "Cancelado", "anulado", "cancelado"]


@router.get("/summary")
def get_summary(db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    cid = current_user.company_id
    today = date.today()
    month_start = today.replace(day=1)

    # Today sales
    today_orders = db.query(Order).filter(
        Order.company_id == cid,
        ~Order.status.in_(EXCLUDED_STATUSES),
        func.date(Order.created_at) == today,
    ).all()
    today_sales = sum(o.total for o in today_orders)

    # Month sales
    month_orders = db.query(Order).filter(
        Order.company_id == cid,
        ~Order.status.in_(EXCLUDED_STATUSES),
        Order.created_at >= datetime.combine(month_start, datetime.min.time()),
    ).all()
    month_sales = sum(o.total for o in month_orders)

    # Pending orders
    pending = db.query(Order).filter(
        Order.company_id == cid,
        func.lower(Order.status).in_(["pendiente", "pending"]),
    ).count()

    # Total customers
    total_customers = db.query(Customer).filter(Customer.company_id == cid).count()

    # Total products
    total_products = db.query(Product).filter(
        Product.company_id == cid, Product.is_active == True
    ).count()

    # Avg order
    all_orders = db.query(Order).filter(
        Order.company_id == cid,
        ~Order.status.in_(EXCLUDED_STATUSES),
    ).all()
    avg_order = (sum(o.total for o in all_orders) / len(all_orders)) if all_orders else 0

    return {
        "success": True,
        "data": {
            "today_sales": round(today_sales, 2),
            "month_sales": round(month_sales, 2),
            "pending_orders": pending,
            "total_customers": total_customers,
            "total_products": total_products,
            "avg_order": round(avg_order, 2),
            "today_orders_count": len(today_orders),
        }
    }


@router.get("/sales-chart")
def get_sales_chart(
    period: str = Query("week", regex="^(week|month)$"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    cid = current_user.company_id
    today = date.today()
    day_names = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

    num_days = 7 if period == "week" else 30
    start_date = today - timedelta(days=num_days - 1)

    # Query all valid orders in the date range
    orders = (
        db.query(Order)
        .filter(
            Order.company_id == cid,
            ~Order.status.in_(EXCLUDED_STATUSES),
            func.date(Order.created_at) >= start_date,
            func.date(Order.created_at) <= today,
        )
        .all()
    )

    # Group sales and order count by date string YYYY-MM-DD
    sales_by_date = {}
    count_by_date = {}
    for o in orders:
        if o.created_at:
            d_str = o.created_at.strftime("%Y-%m-%d")
            sales_by_date[d_str] = sales_by_date.get(d_str, 0.0) + (o.total or 0.0)
            count_by_date[d_str] = count_by_date.get(d_str, 0) + 1

    # Generate continuous daily series
    chart_data = []
    for i in range(num_days):
        current_d = start_date + timedelta(days=i)
        d_str = current_d.strftime("%Y-%m-%d")
        weekday_idx = current_d.weekday()  # 0 = Monday, 6 = Sunday

        if period == "week":
            label = f"{day_names[weekday_idx]} {current_d.day}"
        else:
            label = f"{current_d.day}/{current_d.month}"

        chart_data.append({
            "name": label,
            "full_date": d_str,
            "ventas": round(sales_by_date.get(d_str, 0.0), 2),
            "pedidos": count_by_date.get(d_str, 0),
        })

    return {"success": True, "data": chart_data}


@router.get("/top-products")
def get_top_products(db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    cid = current_user.company_id
    results = (
        db.query(
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("total_qty"),
            func.sum(OrderItem.total_price).label("total_revenue"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .filter(
            Order.company_id == cid,
            ~Order.status.in_(EXCLUDED_STATUSES),
        )
        .group_by(OrderItem.product_name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
        .all()
    )
    data = [
        {
            "name": r.product_name,
            "quantity": r.total_qty or 0,
            "revenue": round(r.total_revenue or 0.0, 2),
        }
        for r in results
    ]
    return {"success": True, "data": data}


@router.get("/recent-orders")
def get_recent_orders(db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    cid = current_user.company_id
    orders = (
        db.query(Order)
        .filter(Order.company_id == cid)
        .order_by(Order.created_at.desc())
        .limit(5)
        .all()
    )
    data = [
        {
            "id": o.id,
            "order_code": o.order_code,
            "customer_name": o.customer_name,
            "total": round(o.total or 0.0, 2),
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in orders
    ]
    return {"success": True, "data": data}
