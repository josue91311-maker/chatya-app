import sqlite3

conn = sqlite3.connect('chatya.db')
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE company_configs ADD COLUMN delivery_mode VARCHAR DEFAULT 'fixed';")
    print("Columna delivery_mode agregada.")
except Exception as e:
    print("delivery_mode:", e)

try:
    cursor.execute("ALTER TABLE company_configs ADD COLUMN covered_districts VARCHAR;")
    print("Columna covered_districts agregada.")
except Exception as e:
    print("covered_districts:", e)

try:
    cursor.execute("ALTER TABLE company_configs ADD COLUMN show_estimated_time BOOLEAN DEFAULT 0;")
    print("Columna show_estimated_time agregada.")
except Exception as e:
    print("show_estimated_time:", e)

conn.commit()
conn.close()
print("✅ Migración de company_configs ejecutada correctamente.")
