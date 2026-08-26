import sqlite3

conn = sqlite3.connect('chatya.db')
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE products ADD COLUMN allow_unit_selection BOOLEAN DEFAULT 1;")
    print("Columna allow_unit_selection agregada a products.")
except Exception as e:
    print("allow_unit_selection:", e)

conn.commit()
conn.close()
print("✅ Migración completada.")
