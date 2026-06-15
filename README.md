# **Shiv Furniture Works ERP** 🪵🛋️⚡

> A modern, robust, and state-of-the-art Mini Enterprise Resource Planning (ERP) system tailored for furniture manufacturing, inventory orchestration, and automated procurement.

---

### 🚀 Key Features

*   📊 **Executive Dashboard**: Live telemetry tracking revenue metrics, outstanding order backlogs, inventory health, and recent operations.
*   📦 **Inventory Orchestration & Stock Ledger**: Complete real-time stock levels (On Hand, Reserved, Available) with full audit trails of every item movement.
*   🏷️ **Product Management**: SKU indexing, category sorting, reorder thresholds, pricing, and default vendor mapping.
*   📐 **Bill of Materials (BOM)**: Comprehensive recipes linking finished products to components (materials) and routing operations (cutting, assembly, finishing, duration, and work centers).
*   ⚙️ **Manufacturing Orders (MO)**: Automatic multiplication of raw material requirements based on target quantity, reservation of component stock, routing process logs, and finished product stock incrementation on completion.
*   🛒 **Procurement & Purchase Orders (PO)**: Vendor profiles, active buying lists, and stock receiving checks.
*   💰 **Sales Order Dispatch (SO)**: Automatic invoice generator with conflict-retry logic, Make-to-Order (MTO) shortfall auto-procurement, and full or partial shipping logs.
*   🛡️ **Role-Based Access Control (RBAC)**: Specialized dashboards/privileges for Administrator, Sales, Purchase, Manufacturing, and Product Manager roles.
*   📝 **Audit Log Compliance**: Transparent database logs recording every critical action (Creates, Updates, Deletes, Approvals).

---

### 🛠️ Technology Stack

| Layer | Technologies Used | Key Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS v4, React Icons, React Hot Toast | Responsive, sleek, and high-performance UI. |
| **Backend** | Node.js, Express, Prisma ORM | Secure, type-safe API routes and schema orchestration. |
| **Database** | Neon Serverless PostgreSQL | Cloud SQL storage supporting concurrent transactions. |
| **Security** | JWT, BcryptJS | Secure session authorization and hashed credential protection. |

---

### 📐 System Flow & Logic

```mermaid
graph TD
    A[Sales Order Created] --> B{Strategy: MTS or MTO?}
    B -- MTS (Make-to-Stock) --> C[Check Stock]
    C -- Sufficient --> D[Reserve Stock & Ship]
    C -- Insufficient --> E[Block Confirmation / Reorder]
    
    B -- MTO (Make-to-Order) --> F[Trigger Automated Procurement]
    F -- Raw Materials --> G[Purchase Order Created]
    F -- Finished Product --> H[Manufacturing Order Created]
    
    H --> I[Fetch BoM Recipe]
    I --> J[Reserve Component Stock]
    J --> K[Process Work Orders]
    K --> L[Complete Manufacturing]
    L --> M[Increment Finished Stock & Deliver]
```

---

### 📦 Setup & Installation

#### Prerequisites
- Node.js (v18+)
- PostgreSQL Database URL (e.g. Neon Postgres)

#### 1. Clone the repository
```bash
git clone https://github.com/HimanshuRaje/SHIV-Furniture-Mini-ERP-system.git
cd SHIV-Furniture-Mini-ERP-system
```

#### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
PORT=5000
DATABASE_URL="postgresql://user:password@hostname/dbname?sslmode=require&pgbouncer=true&connect_timeout=30"
JWT_SECRET="your_jwt_signing_key_here"
```

Apply migrations and seed the database:
```bash
npx prisma db push
npx prisma db seed
```

Start backend dev server:
```bash
npm run dev
```

#### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

The application will now be running locally at `http://localhost:5173`.

---

### 🔐 Seeding Credentials
You can log in with any of these preloaded user accounts to test role-based privileges:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin@shiverp.com` | `admin123` |
| **Sales Manager** | `sales@shiverp.com` | `sales123` |
| **Procurement Head** | `purchase@shiverp.com` | `purchase123` |
| **Manufacturing (Arjun)** | `mfg@shiverp.com` | `mfg123` |
| **Manufacturing (Ravi)** | `mfg2@shiverp.com` | `mfg456` |
| **Business Owner** | `owner@shiverp.com` | `owner123` |
| **Product Manager** | `prodmanager@shiverp.com` | `prod123` |

---

### 📄 License
Licensed under the [MIT License](LICENSE).
