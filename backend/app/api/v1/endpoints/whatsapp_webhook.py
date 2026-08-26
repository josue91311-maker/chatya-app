import json
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.services.meta_whatsapp_service import send_interactive_menu, send_text_message
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
                    text_body = msg.get("text", {}).get("body", "").strip()
                    welcome_msg = (
                        "¡Hola! 👋 Gracias por comunicarte con nosotros.\n\n"
                        "Puedes explorar todos nuestros productos, precios y realizar tu pedido directamente aquí sin salir de WhatsApp."
                    )
                    background_tasks.add_task(
                        send_interactive_menu,
                        to_phone=sender_phone,
                        body_text=welcome_msg,
                        flow_cta="🛍️ Abrir Catálogo y Pedir"
                    )

                # Case 2: Interactive Flow Completion (nfm_reply)
                elif msg_type == "interactive":
                    interactive = msg.get("interactive", {})
                    i_type = interactive.get("type")

                    if i_type == "nfm_reply":
                        # This is the submitted WhatsApp Flow data!
                        nfm_reply = interactive.get("nfm_reply", {})
                        response_json_str = nfm_reply.get("response_json", "{}")
                        try:
                            flow_payload = json.loads(response_json_str)
                        except Exception:
                            flow_payload = {}

                        # Process Order, Stock Kardex and Confirm
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


@router.post("/flow-endpoint")
async def meta_flow_data_exchange(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Data exchange endpoint called dynamically by WhatsApp Flows
    to load real-time products, categories, and stock into the native Flow screen.
    """
    try:
        body = await request.json()
    except Exception:
        body = {}

    action = body.get("action")
    screen = body.get("screen")

    # When opening the catalog screen, return active products
    products_list = get_flow_products_data_source(db)

    return {
        "version": "3.1",
        "screen": screen or "CATALOG_SCREEN",
        "data": {
            "products": products_list
        }
    }
