from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from database import get_db
from models import MedLead, SalesVisit, SalesOrder, SalesUser
from routers.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/med", tags=["medical-crm"])

class LeadCreate(BaseModel):
    hospital_name: str
    contact_person: str = ""
    designation: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    hospital_type: str = ""
    specialty: str = ""
    bed_count: int = 0
    monthly_suture_usage: str = ""
    current_supplier: str = ""
    products_interested: str = ""
    status: str = "New"
    priority: str = "Medium"
    notes: str = ""

class LeadUpdate(LeadCreate):
    hospital_name: Optional[str] = None

class VisitCreate(BaseModel):
    lead_id: int
    visit_date: datetime
    purpose: str = ""
    outcome: str = ""
    next_followup: Optional[datetime] = None
    notes: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_state: str = ""

class OrderCreate(BaseModel):
    lead_id: int
    invoice_number: str = ""
    product_details: str = ""
    total_amount: float = 0.0
    status: str = "Pending"
    payment_status: str = "Unpaid"
    notes: str = ""

@router.post("/leads")
def create_lead(body: LeadCreate, db: Session = Depends(get_db), current_user: SalesUser = Depends(get_current_user)):
    lead = MedLead(**body.model_dump(), rep_id=current_user.id)
    db.add(lead); db.commit(); db.refresh(lead)
    return lead

@router.get("/leads")
def list_leads(state: Optional[str]=None, status: Optional[str]=None, priority: Optional[str]=None,
              search: Optional[str]=None, rep_id: Optional[int]=None, skip: int=0, limit: int=100,
              db: Session=Depends(get_db), current_user: SalesUser=Depends(get_current_user)):
    q = db.query(MedLead)
    if current_user.role != "admin": q = q.filter(MedLead.rep_id == current_user.id)
    elif rep_id: q = q.filter(MedLead.rep_id == rep_id)
    if state: q = q.filter(MedLead.state == state)
    if status: q = q.filter(MedLead.status == status)
    if priority: q = q.filter(MedLead.priority == priority)
    if search: q = q.filter(MedLead.hospital_name.ilike(f"%{search}%"))
    total = q.count()
    return {"total": total, "leads": q.order_by(MedLead.created_at.desc()).offset(skip).limit(limit).all()}

@router.get("/leads/{lead_id}")
def get_lead(lead_id: int, db: Session=Depends(get_db), current_user: SalesUser=Depends(get_current_user)):
    lead = db.query(MedLead).filter(MedLead.id == lead_id).first()
    if not lead: raise HTTPException(status_code=404, detail="Lead not found")
    if current_user.role != "admin" and lead.rep_id != current_user.id: raise HTTPException(status_code=403, detail="Access denied")
    return lead

@router.put("/leads/{lead_id}")
def update_lead(lead_id: int, body: LeadUpdate, db: Session=Depends(get_db), current_user: SalesUser=Depends(get_current_user)):
    lead = db.query(MedLead).filter(MedLead.id == lead_id).first()
    if not lead: raise HTTPException(status_code=404, detail="Lead not found")
    if current_user.role != "admin" and lead.rep_id != current_user.id: raise HTTPException(status_code=403, detail="Access denied")
    for k, v in body.model_dump(exclude_none=True).items(): setattr(lead, k, v)
    lead.updated_at = datetime.now(timezone.utc); db.commit(); db.refresh(lead)
    return lead

@router.delete("/leads/{lead_id}")
def delete_lead(lead_id: int, db: Session=Depends(get_db), _: SalesUser=Depends(require_admin)):
    lead = db.query(MedLead).filter(MedLead.id == lead_id).first()
    if not lead: raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead); db.commit()
    return {"message": "Deleted"}

@router.post("/visits")
def create_visit(body: VisitCreate, db: Session=Depends(get_db), current_user: SalesUser=Depends(get_current_user)):
    visit = SalesVisit(**body.model_dump(), rep_id=current_user.id)
    db.add(visit); db.commit(); db.refresh(visit)
    return visit

@router.get("/visits")
def list_visits(lead_id: Optional[int]=None, rep_id: Optional[int]=None,
               db: Session=Depends(get_db), current_user: SalesUser=Depends(get_current_user)):
    q = db.query(SalesVisit)
    if current_user.role != "admin": q = q.filter(SalesVisit.rep_id == current_user.id)
    elif rep_id: q = q.filter(SalesVisit.rep_id == rep_id)
    if lead_id: q = q.filter(SalesVisit.lead_id == lead_id)
    return q.order_by(SalesVisit.visit_date.desc()).all()

@router.post("/orders")
def create_order(body: OrderCreate, db: Session=Depends(get_db), current_user: SalesUser=Depends(get_current_user)):
    order = SalesOrder(**body.model_dump(), rep_id=current_user.id)
    db.add(order)
    lead = db.query(MedLead).filter(MedLead.id == body.lead_id).first()
    if lead: lead.status = "Order Placed"
    db.commit(); db.refresh(order)
    return order

@router.get("/orders")
def list_orders(lead_id: Optional[int]=None, rep_id: Optional[int]=None,
               db: Session=Depends(get_db), current_user: SalesUser=Depends(get_current_user)):
    q = db.query(SalesOrder)
    if current_user.role != "admin": q = q.filter(SalesOrder.rep_id == current_user.id)
    elif rep_id: q = q.filter(SalesOrder.rep_id == rep_id)
    if lead_id: q = q.filter(SalesOrder.lead_id == lead_id)
    return q.order_by(SalesOrder.order_date.desc()).all()

@router.put("/orders/{order_id}")
def update_order(order_id: int, body: dict, db: Session=Depends(get_db), _: SalesUser=Depends(get_current_user)):
    order = db.query(SalesOrder).filter(SalesOrder.id == order_id).first()
    if not order: raise HTTPException(status_code=404, detail="Order not found")
    for k, v in body.items():
        if hasattr(order, k): setattr(order, k, v)
    order.updated_at = datetime.now(timezone.utc); db.commit(); db.refresh(order)
    return order

@router.get("/reports/summary")
def sales_summary(db: Session=Depends(get_db), _: SalesUser=Depends(require_admin)):
    return {
        "total_leads": db.query(func.count(MedLead.id)).scalar(),
        "total_orders": db.query(func.count(SalesOrder.id)).scalar(),
        "total_revenue": float(db.query(func.sum(SalesOrder.total_amount)).scalar() or 0),
        "total_visits": db.query(func.count(SalesVisit.id)).scalar(),
        "total_reps": db.query(func.count(SalesUser.id)).filter(SalesUser.role=="sales_rep").scalar(),
        "leads_by_status": [{"status": s, "count": c} for s, c in db.query(MedLead.status, func.count(MedLead.id)).group_by(MedLead.status).all()],
        "leads_by_state": [{"state": s or "Unknown", "count": c} for s, c in db.query(MedLead.state, func.count(MedLead.id)).group_by(MedLead.state).order_by(func.count(MedLead.id).desc()).limit(10).all()],
        "revenue_by_rep": [{"rep": r, "revenue": float(v or 0)} for r, v in db.query(SalesUser.name, func.sum(SalesOrder.total_amount)).join(SalesOrder, SalesUser.id==SalesOrder.rep_id).group_by(SalesUser.name).all()],
    }

@router.get("/reports/rep/{rep_id}")
def rep_report(rep_id: int, db: Session=Depends(get_db), current_user: SalesUser=Depends(get_current_user)):
    if current_user.role != "admin" and current_user.id != rep_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return {
        "rep_id": rep_id,
        "total_leads": db.query(func.count(MedLead.id)).filter(MedLead.rep_id==rep_id).scalar(),
        "total_visits": db.query(func.count(SalesVisit.id)).filter(SalesVisit.rep_id==rep_id).scalar(),
        "total_orders": db.query(func.count(SalesOrder.id)).filter(SalesOrder.rep_id==rep_id).scalar(),
        "total_revenue": float(db.query(func.sum(SalesOrder.total_amount)).filter(SalesOrder.rep_id==rep_id).scalar() or 0),
        "recent_visits": db.query(SalesVisit).filter(SalesVisit.rep_id==rep_id).order_by(SalesVisit.visit_date.desc()).limit(10).all(),
    }
