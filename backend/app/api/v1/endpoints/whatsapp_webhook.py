import json
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.product import Product
from app.models.order import Order
from app.services.meta_whatsapp_service import send_interactive_menu, send_text_message, send_flow_message
from app.services.meta_flows_service import generate_flow_definition, get_flow_products_data_source, process_flow_completion

router = APIRouter()


@router.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
):
    """
    Webhook verification endpoint for Meta WhatsApp Cloud API.
    Meta sends a GET request with hub.challenge to verify ownership.
    """
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        print("✅ Meta WhatsApp Webhook verified successfully!")
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification token mismatch")


async def handle_button_click(button_id: str, sender_phone: str, db: Session):
    """Processes interactive button taps inside WhatsApp."""
    clean_phone = sender_phone.replace("+", "").replace(" ", "").replace("-", "")

    if button_id == "btn_catalogo":
        # Send dynamic catalog list directly in the chat
        products = db.query(Product).filter(Product.is_active == True).limit(8).all()
        if products:
            items_str = "\n".join([f"• *{p.name}* — S/ {p.price:.2f} (Stock: {p.stock})" for p in products])
            catalog_msg = (
                "🛒 *NUESTROS PRODUCTOS DISPONIBLES:*\n\n"
                f"{items_str}\n\n"
                "👉 Para pedir, puedes escribirnos el nombre del producto o abrir la tienda interactiva:\n"
                "https://chatya-app.vercel.app/demo"
            )
        else:
            catalog_msg = "🛒 Puedes ver todo nuestro catálogo aquí:\nhttps://chatya-app.vercel.app/demo"

        await send_text_message(sender_phone, catalog_msg)

    elif button_id == "btn_pedidos":
        # Lookup user's latest order
        last_order = db.query(Order).filter(Order.whatsapp_number == clean_phone).order_by(Order.id.desc()).first()
        if last_order:
            status_msg = (
                f"📦 *Tu Último Pedido:* `{last_order.order_code}`\n"
                f"📋 *Estado:* {last_order.status}\n"
                f"💰 *Monto:* S/ {last_order.total:.2f}\n\n"
                f"🔍 *Sigue tu pedido en vivo aquí:*\nhttps://chatya-app.vercel.app/seguimiento/{last_order.tracking_token}"
            )
        else:
            status_msg = "📦 No encontramos pedidos recientes asociados a tu número de WhatsApp. ¡Anímate a realizar tu primera compra!"

        await send_text_message(sender_phone, status_msg)

    elif button_id == "btn_asesor":
        await send_text_message(
            sender_phone,
            "💬 ¡Un asesor de nuestro equipo se pondrá en contacto contigo por este chat en unos momentos! 🙌"
        )


@router.post("/webhook")
async def handle_whatsapp_events(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Inbound events handler for Meta WhatsApp Cloud API.
    Receives incoming text messages, button replies, and Flow completions.
    """
    try:
        body = await request.json()
    except Exception:
        return {"status": "ignored"}

    entry_list = body.get("entry", [])
    for entry in entry_list:
        changes = entry.get("changes", [])
        for change in changes:
            value = change.get("value", {})
            messages = value.get("messages", [])
            
            for msg in messages:
                sender_phone = msg.get("from")
                msg_type = msg.get("type")

                # Case 1: Standard incoming text message (e.g. "Hola", "Menú", "Catálogo")
                if msg_type == "text":
                    welcome_msg = (
                        "¡Hola! 👋 Gracias por comunicarte con nosotros.\n\n"
                        "¿En qué podemos ayudarte hoy? Elige una opción:"
                    )
                    background_tasks.add_task(
                        send_interactive_menu,
                        to_phone=sender_phone,
                        body_text=welcome_msg,
                        flow_cta="🛍️ Abrir Catálogo"
                    )

                # Case 2: Interactive events (Buttons or WhatsApp Flows)
                elif msg_type == "interactive":
                    interactive = msg.get("interactive", {})
                    i_type = interactive.get("type")

                    # Subcase 2A: Button click
                    if i_type == "button_reply":
                        button_id = interactive.get("button_reply", {}).get("id")
                        background_tasks.add_task(
                            handle_button_click,
                            button_id=button_id,
                            sender_phone=sender_phone,
                            db=db
                        )

                    # Subcase 2B: Native WhatsApp Flow completion (nfm_reply)
                    elif i_type == "nfm_reply":
                        nfm_reply = interactive.get("nfm_reply", {})
                        response_json_str = nfm_reply.get("response_json", "{}")
                        try:
                            flow_payload = json.loads(response_json_str)
                        except Exception:
                            flow_payload = {}

                        background_tasks.add_task(
                            process_flow_completion,
                            payload=flow_payload,
                            sender_phone=sender_phone,
                            db=db
                        )

    return {"status": "ok"}


@router.get("/flow-schema")
def get_flow_schema():
    """Returns the JSON schema to import into Meta Flow Builder."""
    return generate_flow_definition()
