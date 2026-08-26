import sqlite3

conn = sqlite3.connect('chatya.db')
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE orders ADD COLUMN invoice_number VARCHAR;")
    print("Columna invoice_number agregada a orders.")
except Exception as e:
    print("invoice_number:", e)

conn.commit()
conn.close()
print("✅ Migración de orders completada.")
