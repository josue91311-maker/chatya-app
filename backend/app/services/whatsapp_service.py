import urllib.parse
from app.core.config import settings

def generate_whatsapp_message(
    order_code: str,
    customer_name: str,
    items: list,
    currency: str,
    subtotal: float,
    discount_amount: float,
    delivery_cost: float,
    total: float,
    payment_method: str,
    delivery_method: str,
    address: str = None,
    district: str = None,
    tracking_token: str = None,
    whatsapp_number: str = None
) -> str:
    items_list = ""
    for item in items:
        item_tot = float(item.get('total_price') if item.get('total_price') is not None else (float(item.get('unit_price', 0)) * item.get('quantity', 1)))
        items_list += f"• {item['quantity']}x {item['product_name']} ({currency}{item_tot:.2f})\n"
    
    discount_line = f"🎁 Descuento: -{currency}{discount_amount:.2f}\n" if discount_amount > 0 else ""
    dist_str = f" ({district})" if district else ""
    address_line = f"📍 Dirección: {address}{dist_str}\n" if delivery_method == "delivery" and address else ""
    tracking_line = f"📌 Seguir mi pedido: http://localhost:3000/seguimiento/{tracking_token}\n" if tracking_token else ""

    clean_phone = (whatsapp_number or "").replace("+", "").replace(" ", "")

    message = f"""Hola! Quiero confirmar mi pedido 🛒

📋 *Pedido:* {order_code}
👤 *Nombre:* {customer_name}
📱 *Teléfono:* {whatsapp_number or '—'}

🛍️ *Productos:*
{items_list}
💰 *Subtotal:* {currency}{subtotal:.2f}
{discount_line}🚚 *Delivery:* {currency}{delivery_cost:.2f}
💳 *Total:* {currency}{total:.2f}

💳 *Forma de pago:* {payment_method}
🚚 *Entrega:* {delivery_method}
{address_line}{tracking_line}
[Ref: PEDIDO-{order_code} | TEL-{clean_phone}]"""
    return message

def generate_whatsapp_url(phone: str, message: str) -> str:
    clean_phone = "".join(filter(str.isdigit, phone or ""))
    encoded_message = urllib.parse.quote(message)
    return f"https://wa.me/{clean_phone}?text={encoded_message}"

def generate_tracking_url(tracking_token: str) -> str:
    return f"http://localhost:3000/seguimiento/{tracking_token}"
