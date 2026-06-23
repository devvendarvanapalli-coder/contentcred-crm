"""
GMP (Good Manufacturing Practice) router for MediThread.
Covers: Raw Materials, Production Batches, QC Tests, Packaging, Reports.
"""

from datetime import datetime, timezone
from typing import Optional
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import RawMaterial, ProductionBatch, QCTest, PackagingRecord, SalesUser
from routers.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/gmp", tags=["gmp"])


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class MaterialCreate(BaseModel):
    name: str
    material_code: str
    supplier: str = ""
    unit: str = ""
    quantity_in_stock: float = 0.0
    reorder_level: float = 0.0
    expiry_date: Optional[str] = None
    status: str = "Available"

class MaterialUpdate(MaterialCreate):
    pass

class BatchCreate(BaseModel):
    batch_number: str
    product_name: str
    product_type: str = "Absorbable"
    raw_materials_used: list = []
    quantity_produced: float = 0.0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = "In Progress"
    notes: str = ""

class BatchUpdate(BatchCreate):
    pass

class QCTestCreate(BaseModel):
    batch_id: int
    test_name: str
    test_date: Optional[str] = None
    result: str = "Pending"
    observations: str = ""
    attachments_note: str = ""

class QCTestUpdate(QCTestCreate):
    pass

class PackagingCreate(BaseModel):
    batch_id: int
    packaging_date: Optional[str] = None
    units_packaged: int = 0
    label_verified: bool = False
    sterility_checked: bool = False
    packager_name: str = ""
    status: str = "Pending"
    notes: str = ""


def parse_dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def material_out(m: RawMaterial) -> dict:
    return {
        "id": m.id,
        "name": m.name,
        "material_code": m.material_code,
        "supplier": m.supplier,
        "unit": m.unit,
        "quantity_in_stock": m.quantity_in_stock,
        "reorder_level": m.reorder_level,
        "expiry_date": m.expiry_date.isoformat() if m.expiry_date else None,
        "status": m.status,
        "created_by": m.created_by,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def batch_out(b: ProductionBatch) -> dict:
    return {
        "id": b.id,
        "batch_number": b.batch_number,
        "product_name": b.product_name,
        "product_type": b.product_type,
        "raw_materials_used": json.loads(b.raw_materials_used or "[]"),
        "quantity_produced": b.quantity_produced,
        "start_date": b.start_date.isoformat() if b.start_date else None,
        "end_date": b.end_date.isoformat() if b.end_date else None,
        "status": b.status,
        "notes": b.notes,
        "created_by": b.created_by,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


def qc_out(q: QCTest) -> dict:
    return {
        "id": q.id,
        "batch_id": q.batch_id,
        "test_name": q.test_name,
        "test_date": q.test_date.isoformat() if q.test_date else None,
        "result": q.result,
        "tested_by": q.tested_by,
        "observations": q.observations,
        "attachments_note": q.attachments_note,
        "created_at": q.created_at.isoformat() if q.created_at else None,
    }


def pkg_out(p: PackagingRecord) -> dict:
    return {
        "id": p.id,
        "batch_id": p.batch_id,
        "packaging_date": p.packaging_date.isoformat() if p.packaging_date else None,
        "units_packaged": p.units_packaged,
        "label_verified": p.label_verified,
        "sterility_checked": p.sterility_checked,
        "packager_name": p.packager_name,
        "status": p.status,
        "notes": p.notes,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


# ── Raw Materials ─────────────────────────────────────────────────────────────

@router.get("/materials")
def list_materials(
    search: str = Query(""),
    status: str = Query(""),
    db: Session = Depends(get_db),
    current_user: SalesUser = Depends(get_current_user),
):
    q = db.query(RawMaterial)
    if current_user.role != "admin":
        q = q.filter(RawMaterial.created_by == current_user.id)
    if search:
        like = f"%{search}%"
        q = q.filter(
            RawMaterial.name.ilike(like) | RawMaterial.material_code.ilike(like) | RawMaterial.supplier.ilike(like)
        )
    if status:
        q = q.filter(RawMaterial.status == status)
    items = q.order_by(RawMaterial.created_at.desc()).all()
    return {"materials": [material_out(m) for m in items], "total": len(items)}


@router.post("/materials")
def create_material(
    body: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: SalesUser = Depends(get_current_user),
):
    existing = db.query(RawMaterial).filter(RawMaterial.material_code == body.material_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Material code already exists")
    m = RawMaterial(
        name=body.name,
        material_code=body.material_code,
        supplier=body.supplier,
        unit=body.unit,
        quantity_in_stock=body.quantity_in_stock,
        reorder_level=body.reorder_level,
        expiry_date=parse_dt(body.expiry_date),
        status=body.status,
        created_by=current_user.id,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return material_out(m)


@router.put("/materials/{material_id}")
def update_material(
    material_id: int,
    body: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: SalesUser = Depends(get_current_user),
):
    m = db.query(RawMaterial).filter(RawMaterial.id == material_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Material not found")
    if current_user.role != "admin" and m.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    m.name = body.name
    m.material_code = body.material_code
    m.supplier = body.supplier
    m.unit = body.unit
    m.quantity_in_stock = body.quantity_in_stock
    m.reorder_level = body.reorder_level
    m.expiry_date = parse_dt(body.expiry_date)
    m.status = body.status
    db.commit()
    db.refresh(m)
    return material_out(m)


# ── Production Batches ────────────────────────────────────────────────────────

@router.get("/batches")
def list_batches(
    search: str = Query(""),
    status: str = Query(""),
    product_type: str = Query(""),
    db: Session = Depends(get_db),
    current_user: SalesUser = Depends(get_current_user),
):
    q = db.query(ProductionBatch)
    if current_user.role != "admin":
        q = q.filter(ProductionBatch.created_by == current_user.id)
    if search:
        like = f"%{search}%"
        q = q.filter(
            ProductionBatch.batch_number.ilike(like) | ProductionBatch.product_name.ilike(like)
        )
    if status:
        q = q.filter(ProductionBatch.status == status)
    if product_type:
        q = q.filter(ProductionBatch.product_type == product_type)
    items = q.order_by(ProductionBatch.created_at.desc()).all()
    return {"batches": [batch_out(b) for b in items], "total": len(items)}


@router.post("/batches")
def create_batch(
    body: BatchCreate,
    db: Session = Depends(get_db),
    current_user: SalesUser = Depends(get_current_user),
):
    existing = db.query(ProductionBatch).filter(ProductionBatch.batch_number == body.batch_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Batch number already exists")
    b = ProductionBatch(
        batch_number=body.batch_number,
        product_name=body.product_name,
        product_type=body.product_type,
        raw_materials_used=json.dumps(body.raw_materials_used),
        quantity_produced=body.quantity_produced,
        start_date=parse_dt(body.start_date),
        end_date=parse_dt(body.end_date),
        status=body.status,
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return batch_out(b)


@router.put("/batches/{batch_id}")
def update_batch(
    batch_id: int,
    body: BatchUpdate,
    db: Session = Depends(get_db),
    current_user: SalesUser = Depends(get_current_user),
):
    b = db.query(ProductionBatch).filter(ProductionBatch.id == batch_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Batch not found")
    if current_user.role != "admin" and b.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    b.batch_number = body.batch_number
    b.product_name = body.product_name
    b.product_type = body.product_type
    b.raw_materials_used = json.dumps(body.raw_materials_used)
    b.quantity_produced = body.quantity_produced
    b.start_date = parse_dt(body.start_date)
    b.end_date = parse_dt(body.end_date)
    b.status = body.status
    b.notes = body.notes
    db.commit()
    db.refresh(b)
    return batch_out(b)


# ── QC Tests ──────────────────────────────────────────────────────────────────

@router.get("/qc-tests")
def list_qc_tests(
    batch_id: Optional[int] = Query(None),
    result: str = Query(""),
    db: Session = Depends(get_db),
    current_user: SalesUser = Depends(get_current_user),
):
    q = db.query(QCTest)
    if current_user.role != "admin":
        q = q.filter(QCTest.tested_by == current_user.id)
    if batch_id:
        q = q.filter(QCTest.batch_id == batch_id)
    if result:
        q = q.filter(QCTest.result == result)
    items = q.order_by(QCTest.created_at.desc()).all()
    return {"tests": [qc_out(t) for t in items], "total": len(items)}


@router.post("/qc-tests")
def create_qc_test(
    body: QCTestCreate,
    db: Session = Depends(get_db),
    current_user: SalesUser = Depends(get_current_user),
):
    batch = db.query(ProductionBatch).filter(ProductionBatch.id == body.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    t = QCTest(
        batch_id=body.batch_id,
        test_name=body.test_name,
        test_date=parse_dt(body.test_date),
        result=body.result,
        tested_by=current_user.id,
        observations=body.observations,
        attachments_note=body.attachments_note,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return qc_out(t)


@router.put("/qc-tests/{test_id}")
def update_qc_test(
    test_id: int,
    body: QCTestUpdate,
    db: Session = Depends(get_db),
    current_user: SalesUser = Depends(get_current_user),
):
    t = db.query(QCTest).filter(QCTest.id == test_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="QC test not found")
    if current_user.role != "admin" and t.tested_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    t.batch_id = body.batch_id
    t.test_name = body.test_name
    t.test_date = parse_dt(body.test_date)
    t.result = body.result
    t.observations = body.observations
    t.attachments_note = body.attachments_note
    db.commit()
    db.refresh(t)
    return qc_out(t)


# ── Packaging ─────────────────────────────────────────────────────────────────

@router.get("/packaging")
def list_packaging(
    batch_id: Optional[int] = Query(None),
    status: str = Query(""),
    db: Session = Depends(get_db),
    current_user: SalesUser = Depends(get_current_user),
):
    q = db.query(PackagingRecord)
    if batch_id:
        q = q.filter(PackagingRecord.batch_id == batch_id)
    if status:
        q = q.filter(PackagingRecord.status == status)
    items = q.order_by(PackagingRecord.created_at.desc()).all()
    # join batch info
    results = []
    for p in items:
        d = pkg_out(p)
        batch = db.query(ProductionBatch).filter(ProductionBatch.id == p.batch_id).first()
        d["batch_number"] = batch.batch_number if batch else None
        d["product_name"] = batch.product_name if batch else None
        results.append(d)
    return {"records": results, "total": len(results)}


@router.post("/packaging")
def create_packaging(
    body: PackagingCreate,
    db: Session = Depends(get_db),
    current_user: SalesUser = Depends(get_current_user),
):
    batch = db.query(ProductionBatch).filter(ProductionBatch.id == body.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    p = PackagingRecord(
        batch_id=body.batch_id,
        packaging_date=parse_dt(body.packaging_date),
        units_packaged=body.units_packaged,
        label_verified=body.label_verified,
        sterility_checked=body.sterility_checked,
        packager_name=body.packager_name,
        status=body.status,
        notes=body.notes,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    result = pkg_out(p)
    result["batch_number"] = batch.batch_number
    result["product_name"] = batch.product_name
    return result


# ── Reports / Summary ─────────────────────────────────────────────────────────

@router.get("/reports/summary")
def gmp_summary(
    db: Session = Depends(get_db),
    current_user: SalesUser = Depends(get_current_user),
):
    # Batches
    batches_q = db.query(ProductionBatch)
    if current_user.role != "admin":
        batches_q = batches_q.filter(ProductionBatch.created_by == current_user.id)
    batches = batches_q.all()
    total_batches = len(batches)

    status_counts = {}
    for b in batches:
        status_counts[b.status] = status_counts.get(b.status, 0) + 1
    batches_by_status = [{"status": k, "count": v} for k, v in status_counts.items()]

    released_batches = [batch_out(b) for b in batches if b.status == "Released"]

    # Materials
    materials_q = db.query(RawMaterial)
    if current_user.role != "admin":
        materials_q = materials_q.filter(RawMaterial.created_by == current_user.id)
    materials = materials_q.all()
    total_materials = len(materials)
    low_stock_materials = [material_out(m) for m in materials if m.status in ("Low Stock", "Out of Stock")]

    # QC pass rate
    qc_q = db.query(QCTest)
    if current_user.role != "admin":
        qc_q = qc_q.filter(QCTest.tested_by == current_user.id)
    all_tests = qc_q.all()
    total_tests = len(all_tests)
    passed_tests = sum(1 for t in all_tests if t.result == "Pass")
    pass_rate = round((passed_tests / total_tests * 100), 1) if total_tests > 0 else 0.0

    return {
        "total_batches": total_batches,
        "batches_by_status": batches_by_status,
        "total_materials": total_materials,
        "low_stock_materials": low_stock_materials,
        "pass_rate": pass_rate,
        "total_qc_tests": total_tests,
        "recent_releases": released_batches[:10],
    }
