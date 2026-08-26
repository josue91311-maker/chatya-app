import sqlite3

conn = sqlite3.connect('chatya.db')
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE companies ADD COLUMN ruc VARCHAR;")
    print("Columna ruc agregada a companies.")
except Exception as e:
    print("ruc:", e)

conn.commit()
conn.close()
print("✅ Migración de companies completada.")
