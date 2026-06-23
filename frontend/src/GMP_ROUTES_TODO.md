# GMP Module — Routes to Add to App.jsx

Add the following imports and routes to `/home/user/contentcred-crm/frontend/src/App.jsx`.

## Step 1 — Add imports at the top of App.jsx

```jsx
import GMPLayout from "./pages/gmp/GMPLayout";
import GMPDashboard from "./pages/gmp/Dashboard";
import Materials from "./pages/gmp/Materials";
import Batches from "./pages/gmp/Batches";
import QualityControl from "./pages/gmp/QualityControl";
import Packaging from "./pages/gmp/Packaging";
import Reports from "./pages/gmp/Reports";
```

## Step 2 — Add this route block inside your <Routes> element

```jsx
<Route path="/gmp" element={<GMPLayout />}>
  <Route index element={<Navigate to="/gmp/dashboard" replace />} />
  <Route path="dashboard" element={<GMPDashboard />} />
  <Route path="materials" element={<Materials />} />
  <Route path="batches" element={<Batches />} />
  <Route path="qc" element={<QualityControl />} />
  <Route path="packaging" element={<Packaging />} />
  <Route path="reports" element={<Reports />} />
</Route>
```

Make sure `Navigate` is imported from `react-router-dom` if not already:
```jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
```

## Step 3 — Access the module

Navigate to `/gmp/dashboard` in the browser. The module uses the same JWT auth
system as the MediThread Sales CRM — log in via `/med/login` first (uses the
same `med_token` in localStorage).

## Backend note

The GMP router is already registered in `backend/main.py`. The four new database
tables (`gmp_raw_materials`, `gmp_production_batches`, `gmp_qc_tests`,
`gmp_packaging_records`) are created automatically on server start via
`Base.metadata.create_all`.
