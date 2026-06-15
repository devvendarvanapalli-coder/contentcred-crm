from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from database import get_db
from models import SalesUser

SECRET_KEY = "medithread-crm-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
router = APIRouter(prefix="/api/auth", tags=["auth"])


class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserCreate(BaseModel):
    name: str
    email: str
    phone: str = ""
    password: str
    role: str = "sales_rep"
    territory: str = ""

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    role: str
    territory: str
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True


def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)
def hash_password(password): return pwd_context.hash(password)

def create_access_token(data, expires_delta=None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> SalesUser:
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None: raise exc
    except JWTError:
        raise exc
    user = db.query(SalesUser).filter(SalesUser.id == user_id).first()
    if not user or not user.is_active: raise exc
    return user

def require_admin(current_user: SalesUser = Depends(get_current_user)) -> SalesUser:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(SalesUser).filter(SalesUser.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    token = create_access_token({"sub": user.id, "role": user.role}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": token, "token_type": "bearer",
            "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "territory": user.territory}}

@router.post("/register", response_model=UserOut)
def register(body: UserCreate, db: Session = Depends(get_db), current_user: SalesUser = Depends(require_admin)):
    if db.query(SalesUser).filter(SalesUser.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = SalesUser(name=body.name, email=body.email, phone=body.phone,
                     password_hash=hash_password(body.password), role=body.role, territory=body.territory)
    db.add(user); db.commit(); db.refresh(user)
    return user

@router.get("/me", response_model=UserOut)
def me(current_user: SalesUser = Depends(get_current_user)): return current_user

@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: SalesUser = Depends(require_admin)):
    return db.query(SalesUser).order_by(SalesUser.name).all()

@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, body: dict, db: Session = Depends(get_db), _: SalesUser = Depends(require_admin)):
    user = db.query(SalesUser).filter(SalesUser.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    for field in ["name", "phone", "territory", "is_active", "role"]:
        if field in body: setattr(user, field, body[field])
    db.commit(); db.refresh(user)
    return user

@router.post("/create-admin")
def create_admin(body: UserCreate, db: Session = Depends(get_db)):
    if db.query(SalesUser).filter(SalesUser.role == "admin").count() > 0:
        raise HTTPException(status_code=400, detail="Admin already exists")
    user = SalesUser(name=body.name, email=body.email, phone=body.phone,
                     password_hash=hash_password(body.password), role="admin", territory=body.territory)
    db.add(user); db.commit(); db.refresh(user)
    return {"message": "Admin created", "id": user.id}
