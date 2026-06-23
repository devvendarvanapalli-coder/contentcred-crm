from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database import get_db
from models import Party, AccInvoice, AccPurchase, AccPayment, SalesUser
from routers.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import json

router = APIRouter(prefix="/api/acc", tags=["accounting"])

COMPANY_STATE = "Maharashtra"


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class PartyIn(BaseModel):
    name: str
    party_type: str = "Customer"
    gstin: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    phone: str = ""
    email: str = ""
    opening_balance: float = 0.0

class InvoiceIn(BaseModel):
    invoice_number: Optional[str] = None
    party_id: int
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    line_items: list = []
    notes: str = ""

class PurchaseIn(BaseModel):
    po_number: Optional[str] = None
    party_id: int
    po_date: Optional[str] = None
    line_items: list = []
    status: str = "Draft"

class PaymentIn(BaseModel):
    party_id: int
    invoice_id: Optional[int] = None
    payment_date: Optional[str] = None
    amount: float
    payment_mode: str = "NEFT"
    reference_number: str = ""
    notes: str = ""


# ── Helpers ───────────────────────────────────────────────────────────────────

def compute_gst(line_items: list, party_state: str):
    subtotal = 0.0
    cgst = sgst = igst = 0.0
    intra_state = party_state.lower() == COMPANY_STATE.lower()
    for item in line_items:
        taxable = float(item.get("quantity", 0)) * float(item.get("rate", 0))
        rate = float(item.get("gst_rate", 0)) / 100
        subtotal += taxable
        if intra_state:
            cgst += taxable * rate / 2
            sgst += taxable * rate / 2
        else:
            igst += taxable * rate
    return round(subtotal, 2), round(cgst, 2), round(sgst, 2), round(igst, 2)

def serialize(obj):
    d = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d

def next_invoice_number(db: Session):
    count = db.query(AccInvoice).count()
    return f"INV-{datetime.now().year}-{count + 1:04d}"

def next_po_number(db: Session):
    count = db.query(AccPurchase).count()
    return f"PO-{datetime.now().year}-{count + 1:04d}"


# ── Parties ───────────────────────────────────────────────────────────────────

@router.get("/parties")
def list_parties(search: str = "", party_type: str = "",
                 db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(Party)
    if search:
        q = q.filter(Party.name.ilike(f"%{search}%") | Party.gstin.ilike(f"%{search}%"))
    if party_type:
        q = q.filter(Party.party_type == party_type)
    return [serialize(p) for p in q.order_by(Party.name).all()]

@router.post("/parties")
def create_party(data: PartyIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    p = Party(**data.dict())
    db.add(p)
    db.commit()
    db.refresh(p)
    return serialize(p)

@router.put("/parties/{party_id}")
def update_party(party_id: int, data: PartyIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    p = db.query(Party).filter(Party.id == party_id).first()
    if not p:
        raise HTTPException(404, "Party not found")
    for k, v in data.dict().items():
        setattr(p, k, v)
    db.commit()
    return serialize(p)


# ── Invoices ──────────────────────────────────────────────────────────────────

@router.get("/invoices")
def list_invoices(payment_status: str = "", party_id: int = 0,
                  db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(AccInvoice)
    if payment_status:
        q = q.filter(AccInvoice.payment_status == payment_status)
    if party_id:
        q = q.filter(AccInvoice.party_id == party_id)
    rows = q.order_by(AccInvoice.created_at.desc()).all()
    result = []
    for inv in rows:
        d = serialize(inv)
        party = db.query(Party).filter(Party.id == inv.party_id).first()
        d["party_name"] = party.name if party else ""
        d["party_state"] = party.state if party else ""
        result.append(d)
    return result

@router.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    inv = db.query(AccInvoice).filter(AccInvoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    d = serialize(inv)
    party = db.query(Party).filter(Party.id == inv.party_id).first()
    d["party_name"] = party.name if party else ""
    d["party_state"] = party.state if party else ""
    d["party_gstin"] = party.gstin if party else ""
    d["party_address"] = party.address if party else ""
    return d

@router.post("/invoices")
def create_invoice(data: InvoiceIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    party = db.query(Party).filter(Party.id == data.party_id).first()
    if not party:
        raise HTTPException(404, "Party not found")
    subtotal, cgst, sgst, igst = compute_gst(data.line_items, party.state)
    inv = AccInvoice(
        invoice_number=data.invoice_number or next_invoice_number(db),
        party_id=data.party_id,
        invoice_date=datetime.fromisoformat(data.invoice_date) if data.invoice_date else datetime.now(timezone.utc),
        due_date=datetime.fromisoformat(data.due_date) if data.due_date else None,
        line_items=json.dumps(data.line_items),
        subtotal=subtotal, cgst=cgst, sgst=sgst, igst=igst,
        total_amount=round(subtotal + cgst + sgst + igst, 2),
        notes=data.notes,
        created_by=user.id,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return serialize(inv)

@router.put("/invoices/{invoice_id}")
def update_invoice(invoice_id: int, data: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    inv = db.query(AccInvoice).filter(AccInvoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404)
    for k, v in data.items():
        if hasattr(inv, k):
            setattr(inv, k, v)
    db.commit()
    return serialize(inv)


# ── Purchases ─────────────────────────────────────────────────────────────────

@router.get("/purchases")
def list_purchases(status: str = "", db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(AccPurchase)
    if status:
        q = q.filter(AccPurchase.status == status)
    rows = q.order_by(AccPurchase.created_at.desc()).all()
    result = []
    for po in rows:
        d = serialize(po)
        party = db.query(Party).filter(Party.id == po.party_id).first()
        d["party_name"] = party.name if party else ""
        result.append(d)
    return result

@router.post("/purchases")
def create_purchase(data: PurchaseIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    party = db.query(Party).filter(Party.id == data.party_id).first()
    if not party:
        raise HTTPException(404, "Party not found")
    subtotal, cgst, sgst, igst = compute_gst(data.line_items, party.state)
    total_gst = cgst + sgst + igst
    po = AccPurchase(
        po_number=data.po_number or next_po_number(db),
        party_id=data.party_id,
        po_date=datetime.fromisoformat(data.po_date) if data.po_date else datetime.now(timezone.utc),
        line_items=json.dumps(data.line_items),
        subtotal=subtotal, total_gst=round(total_gst, 2),
        total_amount=round(subtotal + total_gst, 2),
        status=data.status, created_by=user.id,
    )
    db.add(po)
    db.commit()
    db.refresh(po)
    return serialize(po)

@router.put("/purchases/{po_id}")
def update_purchase(po_id: int, data: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    po = db.query(AccPurchase).filter(AccPurchase.id == po_id).first()
    if not po:
        raise HTTPException(404)
    for k, v in data.items():
        if hasattr(po, k):
            setattr(po, k, v)
    db.commit()
    return serialize(po)


# ── Payments ──────────────────────────────────────────────────────────────────

@router.get("/payments")
def list_payments(party_id: int = 0, db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(AccPayment)
    if party_id:
        q = q.filter(AccPayment.party_id == party_id)
    rows = q.order_by(AccPayment.created_at.desc()).all()
    result = []
    for pay in rows:
        d = serialize(pay)
        party = db.query(Party).filter(Party.id == pay.party_id).first()
        d["party_name"] = party.name if party else ""
        if pay.invoice_id:
            inv = db.query(AccInvoice).filter(AccInvoice.id == pay.invoice_id).first()
            d["invoice_number"] = inv.invoice_number if inv else ""
        else:
            d["invoice_number"] = ""
        result.append(d)
    return result

@router.post("/payments")
def create_payment(data: PaymentIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    pay = AccPayment(
        party_id=data.party_id,
        invoice_id=data.invoice_id,
        payment_date=datetime.fromisoformat(data.payment_date) if data.payment_date else datetime.now(timezone.utc),
        amount=data.amount,
        payment_mode=data.payment_mode,
        reference_number=data.reference_number,
        notes=data.notes,
        created_by=user.id,
    )
    db.add(pay)
    db.commit()
    # Update invoice payment status if linked
    if data.invoice_id:
        inv = db.query(AccInvoice).filter(AccInvoice.id == data.invoice_id).first()
        if inv:
            total_paid = db.query(func.sum(AccPayment.amount)).filter(
                AccPayment.invoice_id == data.invoice_id
            ).scalar() or 0
            if total_paid >= inv.total_amount:
                inv.payment_status = "Paid"
            elif total_paid > 0:
                inv.payment_status = "Partial"
            db.commit()
    db.refresh(pay)
    return serialize(pay)


# ── Ledger ────────────────────────────────────────────────────────────────────

@router.get("/ledger/{party_id}")
def get_ledger(party_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    party = db.query(Party).filter(Party.id == party_id).first()
    if not party:
        raise HTTPException(404)
    entries = []
    balance = party.opening_balance
    entries.append({"date": None, "description": "Opening Balance", "debit": 0, "credit": 0, "balance": balance})
    invoices = db.query(AccInvoice).filter(AccInvoice.party_id == party_id).order_by(AccInvoice.invoice_date).all()
    payments = db.query(AccPayment).filter(AccPayment.party_id == party_id).order_by(AccPayment.payment_date).all()
    txns = []
    for inv in invoices:
        txns.append({"date": inv.invoice_date, "description": f"Invoice {inv.invoice_number}", "debit": inv.total_amount, "credit": 0})
    for pay in payments:
        txns.append({"date": pay.payment_date, "description": f"Payment ({pay.payment_mode}) {pay.reference_number}", "debit": 0, "credit": pay.amount})
    txns.sort(key=lambda x: x["date"] or datetime.min)
    for t in txns:
        balance += t["debit"] - t["credit"]
        entries.append({**t, "balance": round(balance, 2), "date": t["date"].isoformat() if t["date"] else None})
    return {"party": serialize(party), "entries": entries}


# ── GST Reports ───────────────────────────────────────────────────────────────

@router.get("/gst/gstr1")
def get_gstr1(month: int = Query(default=datetime.now().month), year: int = Query(default=datetime.now().year),
              db: Session = Depends(get_db), user=Depends(get_current_user)):
    invoices = db.query(AccInvoice).filter(
        extract("month", AccInvoice.invoice_date) == month,
        extract("year", AccInvoice.invoice_date) == year,
    ).all()
    hsn_summary = {}
    b2b = []
    b2c_total = {"taxable": 0, "cgst": 0, "sgst": 0, "igst": 0, "total": 0}
    for inv in invoices:
        items = json.loads(inv.line_items or "[]")
        party = db.query(Party).filter(Party.id == inv.party_id).first()
        is_b2b = bool(party and party.gstin)
        if is_b2b:
            b2b.append({"invoice_number": inv.invoice_number, "party": party.name if party else "", "gstin": party.gstin if party else "", "date": inv.invoice_date.isoformat() if inv.invoice_date else "", "subtotal": inv.subtotal, "cgst": inv.cgst, "sgst": inv.sgst, "igst": inv.igst, "total": inv.total_amount})
        else:
            b2c_total["taxable"] += inv.subtotal
            b2c_total["cgst"] += inv.cgst
            b2c_total["sgst"] += inv.sgst
            b2c_total["igst"] += inv.igst
            b2c_total["total"] += inv.total_amount
        for item in items:
            hsn = item.get("hsn_code", "N/A")
            rate = item.get("gst_rate", 0)
            key = f"{hsn}-{rate}"
            taxable = float(item.get("quantity", 0)) * float(item.get("rate", 0))
            if key not in hsn_summary:
                hsn_summary[key] = {"hsn_code": hsn, "description": item.get("description", ""), "gst_rate": rate, "taxable_value": 0, "cgst": 0, "sgst": 0, "igst": 0}
            hsn_summary[key]["taxable_value"] += taxable
    return {"month": month, "year": year, "b2b": b2b, "b2c": b2c_total, "hsn_summary": list(hsn_summary.values())}

@router.get("/gst/summary")
def get_gst_summary(db: Session = Depends(get_db), user=Depends(get_current_user)):
    now = datetime.now()
    rows = db.query(AccInvoice).filter(
        extract("month", AccInvoice.invoice_date) == now.month,
        extract("year", AccInvoice.invoice_date) == now.year,
    ).all()
    return {
        "month": now.month, "year": now.year,
        "total_cgst": round(sum(r.cgst for r in rows), 2),
        "total_sgst": round(sum(r.sgst for r in rows), 2),
        "total_igst": round(sum(r.igst for r in rows), 2),
        "total_gst": round(sum(r.cgst + r.sgst + r.igst for r in rows), 2),
    }


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    total_receivables = db.query(func.sum(AccInvoice.total_amount)).filter(
        AccInvoice.payment_status != "Paid"
    ).scalar() or 0
    overdue = db.query(AccInvoice).filter(
        AccInvoice.payment_status != "Paid",
        AccInvoice.due_date < datetime.now(),
    ).count()
    now = datetime.now()
    monthly = []
    for i in range(5, -1, -1):
        m = (now.month - i - 1) % 12 + 1
        y = now.year if now.month - i > 0 else now.year - 1
        rev = db.query(func.sum(AccInvoice.total_amount)).filter(
            extract("month", AccInvoice.invoice_date) == m,
            extract("year", AccInvoice.invoice_date) == y,
        ).scalar() or 0
        monthly.append({"month": f"{y}-{m:02d}", "revenue": round(rev, 2)})
    gst = db.query(func.sum(AccInvoice.cgst), func.sum(AccInvoice.sgst), func.sum(AccInvoice.igst)).filter(
        extract("month", AccInvoice.invoice_date) == now.month,
        extract("year", AccInvoice.invoice_date) == now.year,
    ).first()
    recent = db.query(AccInvoice).order_by(AccInvoice.created_at.desc()).limit(5).all()
    recent_list = []
    for inv in recent:
        d = serialize(inv)
        party = db.query(Party).filter(Party.id == inv.party_id).first()
        d["party_name"] = party.name if party else ""
        recent_list.append(d)
    return {
        "total_receivables": round(total_receivables, 2),
        "overdue_invoices": overdue,
        "monthly_revenue": monthly,
        "gst_this_month": {"cgst": round(gst[0] or 0, 2), "sgst": round(gst[1] or 0, 2), "igst": round(gst[2] or 0, 2)},
        "recent_invoices": recent_list,
    }
