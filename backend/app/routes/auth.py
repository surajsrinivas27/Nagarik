from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from uuid import uuid4
from app.db.mongo import get_database
from app.models.user import UserCreate, UserLogin, UserResponse, Token
from app.utils.security import get_password_hash, verify_password, create_access_token, get_current_user_optional

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# In-memory user store fallback if Mongo Atlas is offline during testing
in_memory_users = {}

@router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    db = get_database()
    email_clean = user_data.email.lower().strip()
    
    password_hash = get_password_hash(user_data.password)
    user_id = f"usr_{uuid4().hex[:12]}"
    new_user = {
        "_id": user_id,
        "name": user_data.name,
        "email": email_clean,
        "password_hash": password_hash,
        "role": user_data.role,
        "department": user_data.department if user_data.role == "official" else None,
        "preferred_language": user_data.preferred_language,
        "created_at": datetime.utcnow()
    }

    if db is not None:
        try:
            existing = await db.users.find_one({"email": email_clean})
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User with this email already exists"
                )
            await db.users.insert_one(new_user)
        except HTTPException:
            raise
        except Exception as e:
            # Fallback to memory
            if email_clean in in_memory_users:
                raise HTTPException(status_code=400, detail="User with this email already exists")
            in_memory_users[email_clean] = new_user
    else:
        if email_clean in in_memory_users:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        in_memory_users[email_clean] = new_user

    user_resp = UserResponse(
        id=user_id,
        name=new_user["name"],
        email=new_user["email"],
        role=new_user["role"],
        department=new_user["department"],
        preferred_language=new_user["preferred_language"],
        created_at=new_user["created_at"]
    )
    
    token_data = {
        "sub": user_id,
        "email": new_user["email"],
        "role": new_user["role"],
        "department": new_user["department"],
        "preferred_language": new_user["preferred_language"]
    }
    access_token = create_access_token(token_data)
    return Token(access_token=access_token, token_type="bearer", user=user_resp)

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    db = get_database()
    email_clean = credentials.email.lower().strip()
    user = None

    if db is not None:
        try:
            user = await db.users.find_one({"email": email_clean})
        except Exception:
            user = in_memory_users.get(email_clean)
    else:
        user = in_memory_users.get(email_clean)

    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    user_resp = UserResponse(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        role=user["role"],
        department=user.get("department"),
        preferred_language=user.get("preferred_language", "en"),
        created_at=user.get("created_at", datetime.utcnow())
    )

    token_data = {
        "sub": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "department": user.get("department"),
        "preferred_language": user.get("preferred_language", "en")
    }
    access_token = create_access_token(token_data)
    return Token(access_token=access_token, token_type="bearer", user=user_resp)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return UserResponse(
        id=current_user["sub"],
        name=current_user.get("name", "User"),
        email=current_user["email"],
        role=current_user["role"],
        department=current_user.get("department"),
        preferred_language=current_user.get("preferred_language", "en"),
        created_at=datetime.utcnow()
    )
