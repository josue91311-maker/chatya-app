import sqlite3

conn = sqlite3.connect('chatya.db')
cursor = conn.cursor()

# Ensure table exists
cursor.execute("""
CREATE TABLE IF NOT EXISTS product_unit_factors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER REFERENCES products(id),
    unit_name VARCHAR,
    factor FLOAT DEFAULT 1.0,
    price FLOAT DEFAULT 0.0,
    cost_price FLOAT DEFAULT 0.0,
    sku VARCHAR,
    is_base BOOLEAN DEFAULT 0,
    for_sale BOOLEAN DEFAULT 1,
    for_purchase BOOLEAN DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    sort_order INTEGER DEFAULT 0
);
""")

# Try adding columns if table already existed without them
for col, col_type in [("for_sale", "BOOLEAN DEFAULT 1"), ("for_purchase", "BOOLEAN DEFAULT 1")]:
    try:
        cursor.execute(f"ALTER TABLE product_unit_factors ADD COLUMN {col} {col_type};")
        print(f"Columna {col} agregada a product_unit_factors.")
    except Exception as e:
        print(f"{col}:", e)

conn.commit()
conn.close()
print("✅ Migración de product_unit_factors completada.")
