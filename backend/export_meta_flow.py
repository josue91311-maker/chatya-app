"""
Export Meta WhatsApp Flow JSON definition
Run: python export_meta_flow.py
"""
import json
import os
import sys
from app.services.meta_flows_service import generate_flow_definition

def main():
    flow = generate_flow_definition()
    out_path = os.path.join(os.path.dirname(__file__), "meta_flow_catalog.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(flow, f, indent=2, ensure_ascii=False)
    print("Meta WhatsApp Flow JSON exported successfully to: " + out_path)

if __name__ == "__main__":
    main()
