from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.mongo import connect_to_mongo, close_mongo_connection
from app.routes.auth import router as auth_router
from app.routes.complaints import router as complaints_router
from app.routes.dashboard import router as dashboard_router
from app.routes.ws import router as ws_router

app = FastAPI(
    title="Nagrik AI Backend API",
    description="AI-Powered Citizen Grievance & Governance Platform API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

app.include_router(auth_router)
app.include_router(complaints_router)
app.include_router(dashboard_router)
app.include_router(ws_router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "Nagrik AI Backend API",
        "environment": settings.ENV
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
