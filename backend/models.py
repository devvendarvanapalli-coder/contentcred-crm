"""
ContentCred CRM — SQLAlchemy models
Includes original ContentCred models + MediThread Sales CRM models.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    Text, Float, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from database import Base
import enum


class Creator(Base):
    __tablename__ = "creators"
    id               = Column(Integer, primary_key=True, index=True)
    full_name        = Column(String(200), default="")
    email            = Column(String(200), default="", index=True)
    persona          = Column(String(50), default="")
    youtube_channel  = Column(String(300), default="")
    youtube_handle   = Column(String(100), default="")
    spotify_profile  = Column(String(300), default="")
    instagram_handle = Column(String(100), default="")
    tiktok_handle    = Column(String(100), default="")
    twitter_handle   = Column(String(100), default="")
    website          = Column(String(300), default="")
    youtube_subs     = Column(Integer, default=0)
    monthly_views    = Column(Integer, default=0)
    spotify_monthly  = Column(Integer, default=0)
    instagram_followers = Column(Integer, default=0)
    tiktok_followers = Column(Integer, default=0)
    niche            = Column(String(200), default="")
    content_type     = Column(String(100), default="")
    primary_platform = Column(String(50), default="")
    posting_frequency = Column(String(50), default="")
    source           = Column(String(50), default="")
    scraped_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status           = Column(String(50), default="New")
    notes            = Column(Text, default="")
    created_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                              onupdate=lambda: datetime.now(timezone.utc))
    enrollments      = relationship("SequenceEnrollment", back_populates="creator")
    email_logs       = relationship("EmailLog", back_populates="creator")
    dm_logs          = relationship("DmLog", back_populates="creator")


class ScraperRun(Base):
    __tablename__ = "scraper_runs"
    id               = Column(Integer, primary_key=True, index=True)
    started_at       = Column(DateTime)
    completed_at     = Column(DateTime, nullable=True)
    status           = Column(String(20), default="running")
    creators_found   = Column(Integer, default=0)
    creators_added   = Column(Integer, default=0)
    source_breakdown = Column(Text, default="{}")
    error_message    = Column(Text, nullable=True)


class SequenceEnrollment(Base):
    __tablename__ = "sequence_enrollments"
    id               = Column(Integer, primary_key=True, index=True)
    creator_id       = Column(Integer, ForeignKey("creators.id"), index=True)
    channel          = Column(String(20), default="email")
    status           = Column(String(20), default="active")
    current_step     = Column(Integer, default=0)
    next_send_at     = Column(DateTime, nullable=True)
    enrolled_at      = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                              onupdate=lambda: datetime.now(timezone.utc))
    creator          = relationship("Creator", back_populates="enrollments")


class EmailLog(Base):
    __tablename__ = "email_logs"
    id               = Column(Integer, primary_key=True, index=True)
    creator_id       = Column(Integer, ForeignKey("creators.id"), index=True)
    tracking_id      = Column(String(64), unique=True, index=True)
    step             = Column(Integer, default=0)
    subject          = Column(String(500), default="")
    sent_at          = Column(DateTime, nullable=True)
    opened           = Column(Boolean, default=False)
    opened_at        = Column(DateTime, nullable=True)
    open_count       = Column(Integer, default=0)
    replied          = Column(Boolean, default=False)
    replied_at       = Column(DateTime, nullable=True)
    bounced          = Column(Boolean, default=False)
    unsubscribed     = Column(Boolean, default=False)
    creator          = relationship("Creator", back_populates="email_logs")


class DmLog(Base):
    __tablename__ = "dm_logs"
    id               = Column(Integer, primary_key=True, index=True)
    creator_id       = Column(Integer, ForeignKey("creators.id"), index=True)
    platform         = Column(String(20), default="instagram")
    step             = Column(Integer, default=0)
    message_preview  = Column(String(300), default="")
    sent_at          = Column(DateTime, nullable=True)
    seen             = Column(Boolean, default=False)
    replied          = Column(Boolean, default=False)
    replied_at       = Column(DateTime, nullable=True)
    creator          = relationship("Creator", back_populates="dm_logs")


class UserRole(str, enum.Enum):
    admin = "admin"
    sales_rep = "sales_rep"


class SalesUser(Base):
    __tablename__ = "sales_users"
    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String(200), nullable=False)
    email        = Column(String(200), unique=True, index=True, nullable=False)
    phone        = Column(String(20), default="")
    password_hash = Column(String(256), nullable=False)
    role         = Column(String(20), default=UserRole.sales_rep)
    territory    = Column(String(200), default="")
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    leads        = relationship("MedLead", back_populates="assigned_rep")
    visits       = relationship("SalesVisit", back_populates="rep")
    gps_logs     = relationship("GPSLog", back_populates="rep")


class LeadStatus(str, enum.Enum):
    new        = "New"
    contacted  = "Contacted"
    interested = "Interested"
    demo_done  = "Demo Done"
    order_placed = "Order Placed"
    lost       = "Lost"


class MedLead(Base):
    __tablename__ = "med_leads"
    id              = Column(Integer, primary_key=True, index=True)
    rep_id          = Column(Integer, ForeignKey("sales_users.id"), index=True)
    hospital_name   = Column(String(300), nullable=False)
    contact_person  = Column(String(200), default="")
    designation     = Column(String(200), default="")
    phone           = Column(String(20), default="")
    email           = Column(String(200), default="")
    address         = Column(Text, default="")
    city            = Column(String(100), default="")
    state           = Column(String(100), default="")
    pincode         = Column(String(10), default="")
    hospital_type   = Column(String(50), default="")
    specialty       = Column(String(200), default="")
    bed_count       = Column(Integer, default=0)
    monthly_suture_usage = Column(String(100), default="")
    current_supplier = Column(String(200), default="")
    products_interested = Column(Text, default="")
    status          = Column(String(50), default=LeadStatus.new)
    priority        = Column(String(20), default="Medium")
    notes           = Column(Text, default="")
    created_at      = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at      = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                             onupdate=lambda: datetime.now(timezone.utc))
    assigned_rep    = relationship("SalesUser", back_populates="leads")
    visits          = relationship("SalesVisit", back_populates="lead")
    orders          = relationship("SalesOrder", back_populates="lead")


class SalesVisit(Base):
    __tablename__ = "sales_visits"
    id          = Column(Integer, primary_key=True, index=True)
    rep_id      = Column(Integer, ForeignKey("sales_users.id"), index=True)
    lead_id     = Column(Integer, ForeignKey("med_leads.id"), index=True)
    visit_date  = Column(DateTime, nullable=False)
    purpose     = Column(String(200), default="")
    outcome     = Column(String(200), default="")
    next_followup = Column(DateTime, nullable=True)
    notes       = Column(Text, default="")
    latitude    = Column(Float, nullable=True)
    longitude   = Column(Float, nullable=True)
    location_state = Column(String(100), default="")
    created_at  = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    rep         = relationship("SalesUser", back_populates="visits")
    lead        = relationship("MedLead", back_populates="visits")


class SalesOrder(Base):
    __tablename__ = "sales_orders"
    id             = Column(Integer, primary_key=True, index=True)
    rep_id         = Column(Integer, ForeignKey("sales_users.id"), index=True)
    lead_id        = Column(Integer, ForeignKey("med_leads.id"), index=True)
    order_date     = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    invoice_number = Column(String(100), default="")
    product_details = Column(Text, default="")
    total_amount   = Column(Float, default=0.0)
    status         = Column(String(50), default="Pending")
    payment_status = Column(String(50), default="Unpaid")
    notes          = Column(Text, default="")
    created_at     = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at     = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                            onupdate=lambda: datetime.now(timezone.utc))
    lead           = relationship("MedLead", back_populates="orders")


class GPSLog(Base):
    __tablename__ = "gps_logs"
    id          = Column(Integer, primary_key=True, index=True)
    rep_id      = Column(Integer, ForeignKey("sales_users.id"), index=True)
    latitude    = Column(Float, nullable=False)
    longitude   = Column(Float, nullable=False)
    accuracy    = Column(Float, nullable=True)
    state       = Column(String(100), default="")
    city        = Column(String(100), default="")
    address     = Column(Text, default="")
    logged_at   = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    rep         = relationship("SalesUser", back_populates="gps_logs")


# ── GMP (Good Manufacturing Practice) Models ─────────────────────────────────

class RawMaterial(Base):
    __tablename__ = "gmp_raw_materials"
    id                = Column(Integer, primary_key=True, index=True)
    name              = Column(String(300), nullable=False)
    material_code     = Column(String(100), unique=True, index=True, nullable=False)
    supplier          = Column(String(300), default="")
    unit              = Column(String(50), default="")
    quantity_in_stock = Column(Float, default=0.0)
    reorder_level     = Column(Float, default=0.0)
    expiry_date       = Column(DateTime, nullable=True)
    status            = Column(String(50), default="Available")
    created_by        = Column(Integer, ForeignKey("sales_users.id"), nullable=True)
    created_at        = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    creator           = relationship("SalesUser", foreign_keys=[created_by])


class ProductionBatch(Base):
    __tablename__ = "gmp_production_batches"
    id                  = Column(Integer, primary_key=True, index=True)
    batch_number        = Column(String(100), unique=True, index=True, nullable=False)
    product_name        = Column(String(300), nullable=False)
    product_type        = Column(String(50), default="Absorbable")
    raw_materials_used  = Column(Text, default="[]")
    quantity_produced   = Column(Float, default=0.0)
    start_date          = Column(DateTime, nullable=True)
    end_date            = Column(DateTime, nullable=True)
    status              = Column(String(50), default="In Progress")
    notes               = Column(Text, default="")
    created_by          = Column(Integer, ForeignKey("sales_users.id"), nullable=True)
    created_at          = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    creator             = relationship("SalesUser", foreign_keys=[created_by])
    qc_tests            = relationship("QCTest", back_populates="batch")
    packaging_records   = relationship("PackagingRecord", back_populates="batch")


class QCTest(Base):
    __tablename__ = "gmp_qc_tests"
    id              = Column(Integer, primary_key=True, index=True)
    batch_id        = Column(Integer, ForeignKey("gmp_production_batches.id"), index=True)
    test_name       = Column(String(300), nullable=False)
    test_date       = Column(DateTime, nullable=True)
    result          = Column(String(20), default="Pending")
    tested_by       = Column(Integer, ForeignKey("sales_users.id"), nullable=True)
    observations    = Column(Text, default="")
    attachments_note = Column(Text, default="")
    created_at      = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    batch           = relationship("ProductionBatch", back_populates="qc_tests")
    tester          = relationship("SalesUser", foreign_keys=[tested_by])


class PackagingRecord(Base):
    __tablename__ = "gmp_packaging_records"
    id               = Column(Integer, primary_key=True, index=True)
    batch_id         = Column(Integer, ForeignKey("gmp_production_batches.id"), index=True)
    packaging_date   = Column(DateTime, nullable=True)
    units_packaged   = Column(Integer, default=0)
    label_verified   = Column(Boolean, default=False)
    sterility_checked = Column(Boolean, default=False)
    packager_name    = Column(String(200), default="")
    status           = Column(String(50), default="Pending")
    notes            = Column(Text, default="")
    created_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    batch            = relationship("ProductionBatch", back_populates="packaging_records")


# ── Accounting Models ──────────────────────────────────────────────────────────

class Party(Base):
    __tablename__ = "acc_parties"
    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(300), nullable=False, index=True)
    party_type      = Column(String(20), default="Customer")  # Customer / Supplier
    gstin           = Column(String(20), default="")
    address         = Column(Text, default="")
    city            = Column(String(100), default="")
    state           = Column(String(100), default="")
    pincode         = Column(String(10), default="")
    phone           = Column(String(20), default="")
    email           = Column(String(200), default="")
    opening_balance = Column(Float, default=0.0)
    created_at      = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    invoices        = relationship("AccInvoice", back_populates="party")
    purchases       = relationship("AccPurchase", back_populates="party")
    payments        = relationship("AccPayment", back_populates="party")


class AccInvoice(Base):
    __tablename__ = "acc_invoices"
    id              = Column(Integer, primary_key=True, index=True)
    invoice_number  = Column(String(100), unique=True, index=True)
    party_id        = Column(Integer, ForeignKey("acc_parties.id"), index=True)
    invoice_date    = Column(DateTime, nullable=True)
    due_date        = Column(DateTime, nullable=True)
    line_items      = Column(Text, default="[]")  # JSON
    subtotal        = Column(Float, default=0.0)
    cgst            = Column(Float, default=0.0)
    sgst            = Column(Float, default=0.0)
    igst            = Column(Float, default=0.0)
    total_amount    = Column(Float, default=0.0)
    payment_status  = Column(String(20), default="Unpaid")  # Unpaid/Partial/Paid
    notes           = Column(Text, default="")
    created_by      = Column(Integer, ForeignKey("sales_users.id"), nullable=True)
    created_at      = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    party           = relationship("Party", back_populates="invoices")
    creator         = relationship("SalesUser", foreign_keys=[created_by])
    payments        = relationship("AccPayment", back_populates="invoice")


class AccPurchase(Base):
    __tablename__ = "acc_purchases"
    id           = Column(Integer, primary_key=True, index=True)
    po_number    = Column(String(100), unique=True, index=True)
    party_id     = Column(Integer, ForeignKey("acc_parties.id"), index=True)
    po_date      = Column(DateTime, nullable=True)
    line_items   = Column(Text, default="[]")  # JSON
    subtotal     = Column(Float, default=0.0)
    total_gst    = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    status       = Column(String(20), default="Draft")  # Draft/Approved/Received
    created_by   = Column(Integer, ForeignKey("sales_users.id"), nullable=True)
    created_at   = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    party        = relationship("Party", back_populates="purchases")
    creator      = relationship("SalesUser", foreign_keys=[created_by])


class AccPayment(Base):
    __tablename__ = "acc_payments"
    id               = Column(Integer, primary_key=True, index=True)
    party_id         = Column(Integer, ForeignKey("acc_parties.id"), index=True)
    invoice_id       = Column(Integer, ForeignKey("acc_invoices.id"), nullable=True)
    payment_date     = Column(DateTime, nullable=True)
    amount           = Column(Float, default=0.0)
    payment_mode     = Column(String(20), default="NEFT")  # Cash/NEFT/UPI/Cheque
    reference_number = Column(String(200), default="")
    notes            = Column(Text, default="")
    created_by       = Column(Integer, ForeignKey("sales_users.id"), nullable=True)
    created_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    party            = relationship("Party", back_populates="payments")
    invoice          = relationship("AccInvoice", back_populates="payments")
    creator          = relationship("SalesUser", foreign_keys=[created_by])
