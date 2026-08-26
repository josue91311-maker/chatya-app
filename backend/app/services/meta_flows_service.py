import json
import uuid
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.company import Company
from app.models.config import CompanyConfig, PaymentMethod
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.customer import Customer
from app.models.inventory import InventoryMovement
from app.services.meta_whatsapp_service import send_text_message

def generate_flow_definition() -> Dict[str, Any]:
    """
    Returns the official Meta WhatsApp Flow JSON definition (Flows 3.1).
    This JSON can be directly published in Meta's WhatsApp Flow Builder.
    """
    return {
        "version": "3.1",
        "screens": [
            {
                "id": "CATALOG_SCREEN",
                "title": "Selecciona tus Productos",
                "layout": {
                    "type": "SingleColumnLayout",
                    "children": [
                        {
                            "type": "TextHeading",
                            "text": "🛒 Catálogo de Productos"
                        },
                        {
                            "type": "TextBody",
                            "text": "Elige el producto que deseas pedir y la cantidad:"
                        },
                        {
                            "type": "Dropdown",
                            "name": "selected_product_id",
                            "label": "Producto",
                            "required": True,
                            "data-source": "${data.products}"
                        },
                        {
                            "type": "TextInput",
                            "name": "quantity",
                            "label": "Cantidad (Unidades)",
                            "input-type": "number",
                            "required": True,
                            "helper-text": "Ejemplo: 1, 2, 3..."
                        },
                        {
                            "type": "Footer",
                            "label": "Continuar a Entrega ➔",
                            "on-click-action": {
                                "name": "navigate",
                                "next": {
                                    "type": "screen",
                                    "name": "DELIVERY_SCREEN"
                                },
                                "payload": {
                                    "selected_product_id": "${form.selected_product_id}",
                                    "quantity": "${form.quantity}"
                                }
                            }
                        }
                    ]
                }
            },
            {
                "id": "DELIVERY_SCREEN",
                "title": "Datos de Entrega y Pago",
                "layout": {
                    "type": "SingleColumnLayout",
                    "children": [
                        {
                            "type": "TextHeading",
                            "text": "📍 Entrega y Pago"
                        },
                        {
                            "type": "RadioButtonsGroup",
                            "name": "delivery_type",
                            "label": "Método de Entrega",
                            "required": True,
                            "data-source": [
                                {"id": "delivery", "title": "🚚 Envío a Domicilio (Delivery)"},
                                {"id": "pickup", "title": "🏪 Recojo en Tienda"}
                            ]
                        },
                        {
                            "type": "TextInput",
                            "name": "customer_name",
                            "label": "Tu Nombre Completo",
                            "required": True
                        },
                        {
                            "type": "TextInput",
                            "name": "delivery_address",
                            "label": "Dirección de Entrega y Distrito",
                            "required": False,
                            "helper-text": "Av., Calle, Número y Distrito"
                        },
                        {
                            "type": "RadioButtonsGroup",
                            "name": "payment_method",
                            "label": "Forma de Pago",
                            "required": True,
                            "data-source": [
                                {"id": "Yape / Plin", "title": "📱 Yape / Plin"},
                                {"id": "Transferencia BCP", "title": "🏦 Transferencia Bancaria"},
                                {"id": "Efectivo", "title": "💵 Efectivo contra entrega"}
                            ]
                        },
                        {
                            "type": "RadioButtonsGroup",
                            "name": "receipt_type",
                            "label": "Tipo de Comprobante",
                            "required": True,
                            "data-source": [
                                {"id": "boleta", "title": "🧾 Boleta de Venta"},
                                {"id": "factura", "title": "📄 Factura (RUC)"},
                                {"id": "none", "title": "❌ Sin comprobante"}
                            ]
                        },
                        {
                            "type": "TextInput",
                            "name": "tax_id",
                            "label": "DNI o RUC (si solicitas comprobante)",
                            "required": False
                        },
                        {
                            "type": "Footer",
                            "label": "✅ Confirmar y Enviar Pedido",
                            "on-click-action": {
                                "name": "complete",
                                "payload": {
                                    "selected_product_id": "${data.selected_product_id}",
                                    "quantity": "${data.quantity}",
                                    "customer_name": "${form.customer_name}",
                                    "delivery_type": "${form.delivery_type}",
                                    "delivery_address": "${form.delivery_address}",
                                    "payment_method": "${form.payment_method}",
                                    "receipt_type": "${form.receipt_type}",
                                    "tax_id": "${form.tax_id}"
                                }
                            }
                        }
                    ]
                }
            }
        ]
    }


def get_flow_products_data_source(db: Session, company_id: int = 1) -> List[Dict[str, str]]:
    """Fetches active products for the Flow dropdown."""
    products = db.query(Product).filter(
        Product.company_id == company_id,
        Product.is_active == True
    ).order_by(Product.sort_order.asc(), Product.name.asc()).all()

    items = []
    for p in products:
        items.append({
            "id": str(p.id),
            "title": f"{p.name} — S/ {p.price:.2f}",
            "description": f"Stock disp: {p.stock} | {p.unit_name or 'UNID'}"
        })
    return items


async def process_flow_completion(payload: Dict[str, Any], sender_phone: str, db: Session):
    """
    Processes the data submitted by a customer from WhatsApp Flow.
    Creates the Order, updates Kardex Stock, and sends confirmation back in the chat.
    """
    clean_phone = sender_phone.replace("+", "").replace(" ", "").replace("-", "")
    
    # Get Company
    company = db.query(Company).first()
    company_id = company.id if company else 1
    company_name = company.name if company else "Mi Tienda"

    # Extract Flow Fields
    prod_id = int(payload.get("selected_product_id", 0))
    quantity = max(1, int(payload.get("quantity", 1)))
    customer_name = payload.get("customer_name", "").strip() or f"Cliente {clean_phone[-4:]}"
    delivery_type = payload.get("delivery_type", "delivery")
    delivery_address = payload.get("delivery_address", "")
    payment_method = payload.get("payment_method", "Yape / Plin")
    receipt_type = payload.get("receipt_type", "none")
    tax_id = payload.get("tax_id", "").strip()

    # Product check
    product = db.query(Product).filter(Product.id == prod_id).first()
    if not product:
        await send_text_message(sender_phone, "⚠️ Hubo un detalle al procesar el producto seleccionado. Por favor escríbenos para ayudarte.")
        return

    # Calculate Prices
    unit_price = float(product.price or 0.0)
    subtotal = unit_price * quantity
    delivery_cost = 5.0 if delivery_type == "delivery" else 0.0
    total = subtotal + delivery_cost

    # Customer Lookup or Create
    customer = db.query(Customer).filter(
        Customer.company_id == company_id,
        Customer.whatsapp_number == clean_phone
    ).first()
    if not customer:
        customer = Customer(
            company_id=company_id,
            full_name=customer_name,
            whatsapp_number=clean_phone,
            total_orders=1,
            total_spent=total
        )
        db.add(customer)
        db.flush()
    else:
        customer.total_orders = (customer.total_orders or 0) + 1
        customer.total_spent = (customer.total_spent or 0.0) + total

    # Order Code Generation
    last_order = db.query(Order).filter(Order.company_id == company_id).order_by(Order.id.desc()).first()
    next_num = (last_order.id + 1) if last_order else 1
    order_code = f"PED-{next_num:06d}"
    tracking_token = str(uuid.uuid4())

    # Create Order
    order = Order(
        company_id=company_id,
        customer_id=customer.id,
        order_code=order_code,
        tracking_token=tracking_token,
        status="Pendiente",
        delivery_method=delivery_type,
        payment_method=payment_method,
        receipt_type=receipt_type,
        receipt_data=json.dumps({"dni_ruc": tax_id}) if tax_id else None,
        subtotal=subtotal,
        delivery_cost=delivery_cost,
        total=total,
        customer_name=customer_name,
        whatsapp_number=clean_phone,
        delivery_address=delivery_address if delivery_type == "delivery" else "Recojo en local",
        notes="Pedido realizado nativamente desde WhatsApp Flow 📱",
    )
    db.add(order)
    db.flush()

    # Add Order Item
    order_item = OrderItem(
        order_id=order.id,
        product_id=product.id,
        product_name=product.name,
        product_sku=product.sku,
        quantity=quantity,
        unit_price=unit_price,
        total_price=subtotal,
    )
    db.add(order_item)

    # Deduct Physical Stock in Kardex
    prev_stock = product.stock or 0
    product.stock = max(0, prev_stock - quantity)
    db.add(InventoryMovement(
        company_id=company_id,
        product_id=product.id,
        movement_type="SALIDA",
        quantity=quantity,
        previous_stock=prev_stock,
        new_stock=product.stock,
        reason=f"Venta WhatsApp Flow #{order_code}",
        user_name="WhatsApp Flow Bot"
    ))

    # Order History
    db.add(OrderStatusHistory(
        order_id=order.id,
        status="Pendiente",
        note="Pedido recibido desde WhatsApp Flow",
        changed_by=None
    ))

    db.commit()

    # Send Rich Confirmation Message in the Chat
    confirmation_text = (
        f"🎉 *¡Pedido Recibido con Éxito!* 🎉\n\n"
        f"📋 *Código de Pedido:* `{order_code}`\n"
        f"👤 *Cliente:* {customer_name}\n"
        f"🛍️ *Detalle:* {quantity}× {product.name} (S/ {unit_price:.2f})\n"
        f"💰 *Subtotal:* S/ {subtotal:.2f}\n"
        f"{f'🚚 *Delivery:* S/ {delivery_cost:.2f}\n' if delivery_cost > 0 else ''}"
        f"💳 *TOTAL A PAGAR:* *S/ {total:.2f}*\n\n"
        f"💳 *Forma de Pago:* {payment_method}\n"
        f"📍 *Entrega:* {delivery_address if delivery_type == 'delivery' else 'Recojo en tienda'}\n\n"
        f"🔍 *Seguimiento en vivo:*\nhttps://chatya-app.vercel.app/seguimiento/{tracking_token}\n\n"
        f"✅ *Tu pedido está siendo preparado por el equipo de {company_name}.* ¡Muchas gracias por tu compra!"
    )

    await send_text_message(sender_phone, confirmation_text)
