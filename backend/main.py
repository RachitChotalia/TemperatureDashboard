from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

# 1. Load Environment Variables
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")

# 2. Initialize the App
app = FastAPI()

# 3. CORS Configuration
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Database Connection
if not MONGO_URI:
    print("Error: MONGO_URI not found in .env file")
    client = None
    collection = None
else:
    try:
        client = AsyncIOMotorClient(MONGO_URI)
        
        # --- CRITICAL FIX: YOUR ACTUAL DATABASE NAMES ---
        db = client.Temperature_Sensing       # Updated from 'test'
        collection = db.mlx90614_readings_test # Updated from 'ipd_data'
        
        print(f"✅ Connected to Database: Temperature_Sensing")
        print(f"✅ Connected to Collection: mlx90614_readings_test")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")

# --- HELPER FUNCTION ---
def reading_helper(reading) -> dict:
    return {
        "_id": str(reading["_id"]),
        "timestamp": reading.get("timestamp"),
        "sensors": reading.get("sensors", [])
    }

# --- ROUTES ---

@app.get("/")
async def root():
    return {"message": "IoT Backend is running!"}

@app.get("/api/readings")
async def get_readings():
    if collection is None:
        return []
    readings = []
    # Fetch data (sorted by ID to keep time order)
    async for reading in collection.find().sort("_id", 1).limit(5000):
        readings.append(reading_helper(reading))
    return readings

@app.post("/api/readings")
async def add_reading(reading: dict):
    if collection is None:
        return {"error": "Database not connected"}
    new_reading = await collection.insert_one(reading)
    created_reading = await collection.find_one({"_id": new_reading.inserted_id})
    return reading_helper(created_reading)