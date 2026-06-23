# MediThread Accounting Module — Routes & Integration TODO

## Status: COMPLETE ✓

All accounting routes, pages, and backend endpoints have been created.

---

## Frontend Routes (`/acc/*`)

| Route | Component | Status |
|---|---|---|
| `/acc/dashboard` | `pages/acc/Dashboard.jsx` | ✓ Done |
| `/acc/parties` | `pages/acc/Parties.jsx` | ✓ Done |
| `/acc/invoices` | `pages/acc/Invoices.jsx` | ✓ Done |
| `/acc/purchases` | `pages/acc/Purchases.jsx` | ✓ Done |
| `/acc/payments` | `pages/acc/Payments.jsx` | ✓ Done |
| `/acc/ledger` | `pages/acc/Ledger.jsx` | ✓ Done |
| `/acc/gst` | `pages/acc/GSTReports.jsx` | ✓ Done |

Layout: `pages/acc/AccLayout.jsx` (purple-700 sidebar, NavLink active states)

---

## Backend API Endpoints (`/api/acc/...`)

Router: `backend/routers/accounting.py`
Registered in: `backend/main.py`

### Parties
- `GET    /api/acc/parties` — list (supports `search`, `party_type` filters)
- `POST   /api/acc/parties` — create
- `PUT    /api/acc/parties/{id}` — update
- `DELETE /api/acc/parties/{id}` — delete (admin)

### Invoices
- `GET    /api/acc/invoices` — list (filters: `payment_status`, `party_id`)
- `GET    /api/acc/invoices/{id}` — detail with party info
- `POST   /api/acc/invoices` — create (auto-generates invoice number, computes GST)
- `PUT    /api/acc/invoices/{id}` — update
- `DELETE /api/acc/invoices/{id}` — delete

### Purchase Orders
- `GET    /api/acc/purchases` — list (filter: `status`)
- `GET    /api/acc/purchases/{id}` — detail
- `POST   /api/acc/purchases` — create (auto-generates PO number)
- `PUT    /api/acc/purchases/{id}` — update status / line items
- `DELETE /api/acc/purchases/{id}` — delete

### Payments
- `GET    /api/acc/payments` — list (filter: `party_id`)
- `GET    /api/acc/payments/{id}` — detail
- `POST   /api/acc/payments` — record payment (auto-updates invoice payment_status)
- `DELETE /api/acc/payments/{id}` — delete

### Ledger
- `GET    /api/acc/ledger/{party_id}` — full running ledger for a party

### GST Reports
- `GET    /api/acc/gst/summary?month=&year=` — output vs input GST, net payable
- `GET    /api/acc/gst/gstr1?month=&year=` — GSTR-1: B2B, B2C, HSN summary
- `GET    /api/acc/gst/gstr3b?month=&year=` — GSTR-3B format summary

### Dashboard
- `GET    /api/acc/dashboard` — receivables, payables, monthly revenue, GST this month

---

## Database Models (in `backend/models.py`)

| Model | Table | Notes |
|---|---|---|
| `Party` | `acc_parties` | Customer / Supplier, GSTIN, state for GST routing |
| `AccInvoice` | `acc_invoices` | Line items as JSON, CGST/SGST/IGST split |
| `AccPurchase` | `acc_purchases` | Draft → Approved → Received workflow |
| `AccPayment` | `acc_payments` | Cash/NEFT/UPI/Cheque, auto-updates invoice status |

---

## GST Logic

- **Intra-state** (party.state == COMPANY_STATE "Maharashtra"): CGST + SGST split
- **Inter-state**: IGST only
- **GST Rates**: 0%, 5%, 12%, 18%, 28% (selectable per line item)
- **HSN Codes**: stored per line item for GSTR-1 HSN summary

---

## Remaining Tasks / Enhancements

- [ ] Print / PDF export for invoices (use browser print or react-pdf)
- [ ] Bulk import parties from CSV
- [ ] Email invoice to party (integrate with email service)
- [ ] GSTR-3B full computation with ITC set-off
- [ ] Journal entries / manual adjustments
- [ ] Financial year selector for reports (April–March)
- [ ] Role-based access: restrict delete to admin only
