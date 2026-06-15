from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import GPSLog, SalesUser
from routers.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/gps", tags=["gps"])

class GPSPing(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    state: str = ""
    city: str = ""
    address: str = ""

@router.post("/ping")
def ping_location(body: GPSPing, db: Session = Depends(get_db), current_user: SalesUser = Depends(get_current_user)):
    log = GPSLog(rep_id=current_user.id, latitude=body.latitude, longitude=body.longitude,
                 accuracy=body.accuracy, state=body.state, city=body.city, address=body.address)
    db.add(log); db.commit(); db.refresh(log)
    return {"message": "Location recorded", "id": log.id}

@router.get("/latest")
def latest_locations(db: Session = Depends(get_db), _: SalesUser = Depends(require_admin)):
    subq = db.query(func.max(GPSLog.id).label("max_id")).group_by(GPSLog.rep_id).subquery()
    logs = db.query(GPSLog, SalesUser.name, SalesUser.territory).join(subq, GPSLog.id == subq.c.max_id).join(SalesUser, GPSLog.rep_id == SalesUser.id).all()
    return [{"rep_id": l.GPSLog.rep_id, "rep_name": l.name, "territory": l.territory,
             "latitude": l.GPSLog.latitude, "longitude": l.GPSLog.longitude,
             "state": l.GPSLog.state, "city": l.GPSLog.city,
             "address": l.GPSLog.address, "logged_at": l.GPSLog.logged_at} for l in logs]

@router.get("/history/{rep_id}")
def rep_history(rep_id: int, limit: int = 50, db: Session = Depends(get_db), current_user: SalesUser = Depends(get_current_user)):
    if current_user.role != "admin" and current_user.id != rep_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return db.query(GPSLog).filter(GPSLog.rep_id == rep_id).order_by(GPSLog.logged_at.desc()).limit(limit).all()
