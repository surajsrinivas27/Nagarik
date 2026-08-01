import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

logger = logging.getLogger("nagrik.db")

class MongoDB:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_container = MongoDB()

async def connect_to_mongo():
    try:
        logger.info(f"Connecting to MongoDB Atlas...")
        db_container.client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000
        )
        db_container.db = db_container.client.get_database("nagrik_ai")
        # Quick ping test
        await db_container.client.admin.command('ping')
        logger.info("Successfully connected to MongoDB Atlas!")

        # Create indexes
        complaints_col = db_container.db.get_collection("complaints")
        await complaints_col.create_index([("location", "2dsphere")])
        await complaints_col.create_index([("department", 1), ("status", 1), ("urgency", 1)])
        await complaints_col.create_index([("complaint_code", 1)], unique=True)
        
        users_col = db_container.db.get_collection("users")
        await users_col.create_index([("email", 1)], unique=True)

        logger.info("MongoDB indexes verified/created successfully.")
    except Exception as e:
        logger.warning(f"MongoDB connection warning/error: {str(e)}. System running in fallback mode if Atlas is unreachable.")

async def close_mongo_connection():
    if db_container.client:
        db_container.client.close()
        logger.info("MongoDB connection closed.")

def get_database() -> AsyncIOMotorDatabase:
    return db_container.db
