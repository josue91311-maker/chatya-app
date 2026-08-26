import httpx
from typing import Optional, List, Dict, Any
from app.core.config import settings

META_GRAPH_URL = "https://graph.facebook.com/v20.0"

def get_headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}",
        "Content-Type": "application/json",
    }

async def send_text_message(to_phone: str, text: str) -> Optional[Dict[str, Any]]:
    """Send a basic WhatsApp text message via Meta Cloud API."""
    if not settings.WHATSAPP_API_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
        print("⚠️ Meta WhatsApp credentials not set. Message simulation:", text)
        return None

    clean_phone = to_phone.replace("+", "").replace(" ", "").replace("-", "")
    url = f"{META_GRAPH_URL}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": clean_phone,
        "type": "text",
        "text": {"preview_url": False, "body": text},
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.post(url, headers=get_headers(), json=payload)
            return res.json()
        except Exception as e:
            print(f"❌ Error sending WhatsApp message: {e}")
            return None


async def send_flow_message(
    to_phone: str,
    header_text: str,
    body_text: str,
    footer_text: str = "ChatYa • Comercio Conversacional",
    flow_id: Optional[str] = None,
    flow_cta: str = "🛍️ Ver Catálogo y Pedir",
    flow_token: str = "catalog_flow_token",
) -> Optional[Dict[str, Any]]:
    """
    Send an interactive WhatsApp Flow message.
    Clicking the button opens the native WhatsApp Flow screen directly inside WhatsApp.
    """
    active_flow_id = flow_id or settings.WHATSAPP_FLOW_ID
    if not settings.WHATSAPP_API_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
        print(f"⚠️ Meta WhatsApp Flow message simulation to {to_phone}")
        return None

    clean_phone = to_phone.replace("+", "").replace(" ", "").replace("-", "")
    url = f"{META_GRAPH_URL}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": clean_phone,
        "type": "interactive",
        "interactive": {
            "type": "flow",
            "header": {"type": "text", "text": header_text},
            "body": {"text": body_text},
            "footer": {"text": footer_text},
            "action": {
                "name": "flow",
                "parameters": {
                    "flow_message_version": "3",
                    "flow_token": flow_token,
                    "flow_id": active_flow_id,
                    "flow_cta": flow_cta,
                    "flow_action": "navigate",
                    "mode": "draft",
                    "flow_action_payload": {
                        "screen": "CATALOG_SCREEN",
                        "data": {}
                    }
                }
            }
        }
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.post(url, headers=get_headers(), json=payload)
            return res.json()
        except Exception as e:
            print(f"❌ Error sending WhatsApp Flow message: {e}")
            return None


async def send_interactive_menu(
    to_phone: str,
    body_text: str,
    flow_cta: str = "🛍️ Abrir Tienda Nativa"
) -> Optional[Dict[str, Any]]:
    """
    Send the primary welcome menu with the native Flow button.
    """
    header = "¡Bienvenido a nuestra Tienda! 🛒"
    footer = "Toca el botón para comprar sin salir de WhatsApp"
    
    if settings.WHATSAPP_FLOW_ID:
        return await send_flow_message(
            to_phone=to_phone,
            header_text=header,
            body_text=body_text,
            footer_text=footer,
            flow_cta=flow_cta,
        )
    else:
        # Fallback text message if Flow ID is not set yet
        text = f"*{header}*\n\n{body_text}\n\n👉 Puedes ver nuestros productos o escribirnos para ayudarte."
        return await send_text_message(to_phone, text)
