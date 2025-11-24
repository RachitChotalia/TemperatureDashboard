from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://temperature-dashboard-eosin.vercel.app/"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


if not MONGO_URI:
    print("Error: MONGO_URI not found in .env file")
    client = None
    collection = None
else:
    try:
        client = AsyncIOMotorClient(MONGO_URI)
        
        db = client.Temperature_Sensing       
        collection = db.mlx90614_readings_test 
        
        print(f"✅ Connected to Database: Temperature_Sensing")
        print(f"✅ Connected to Collection: mlx90614_readings_test")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")

def reading_helper(reading) -> dict:
    return {
        "_id": str(reading["_id"]),
        "timestamp": reading.get("timestamp"),
        "sensors": reading.get("sensors", [])
    }


@app.get("/")
async def root():
    return {"message": "IoT Backend is running!"}

@app.get("/api/readings")
async def get_readings():
    if collection is None:
        return []
    readings = []

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