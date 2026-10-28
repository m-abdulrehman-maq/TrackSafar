print("STARTING SCRIPT", flush=True)
import asyncio
print("IMPORTED ASYNCIO", flush=True)
import aiosqlite
print("IMPORTED AIOSQLITE", flush=True)

async def test_aiosqlite():
    print("Testing raw aiosqlite...", flush=True)
    async with aiosqlite.connect("backend/tracksafar_dev.db") as db:
        print("Connected raw aiosqlite!", flush=True)
        cursor = await db.execute("SELECT count(*) FROM profiles")
        row = await cursor.fetchone()
        print("Profiles count:", row[0], flush=True)

asyncio.run(test_aiosqlite())
print("FINISHED SCRIPT", flush=True)

