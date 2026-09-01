# Django Excel Catalog Manager

A full-stack product catalog and bulk Excel import application built with **Django REST Framework** and **React + TypeScript + Vite**. 

It allows users to register, log in, preview and validate Excel spreadsheets (`.xlsx`/`.xls`), perform inline edits to fix errors directly in the table preview, and atomically commit validated rows to a private, user-scoped product catalog.

---

## Key Features

- **User Authentication:** JWT authentication (Access & Refresh tokens with SimpleJWT), user registration, login, and token blacklist logout.
- **Multi-Tenant Workspace Data Isolation:** Products and categories are strictly filtered and scoped to the logged-in user (`owner`).
- **Excel Spreadsheet Import & Preview:**
  - Drag-and-drop or browse file upload (`.xlsx`, `.xls`).
  - Parsing and row-level error validation powered by Pandas.
  - Interactive preview table highlighting rows with missing names, invalid quantities, or missing categories.
- **In-Memory Inline Table Editing:** Edit invalid fields (Name, Description, Category Path, Quantity) directly inside the preview table before importing. Re-validates instantly in real-time.
- **Hierarchical Category Resolution:** Parses category paths using `|` syntax (e.g., `Men Wear | Top | T-Shirt`) and automatically creates parent/child category relationships upon import.
- **Atomic Database Imports:** Database transactions ensure imports are transactional—all selected valid rows are created, or the batch rolls back if an error occurs.
- **Product Catalog View:** Paginated catalog view (10 items per page) with category hierarchy formatting and status notifications.

---

## Tech Stack

### Backend
- **Framework:** Django 6.1 & Django REST Framework 3.18
- **Authentication:** `djangorestframework-simplejwt` (JWT tokens)
- **Data Processing:** Pandas 3.0 & OpenPyXL 3.1
- **Database:** SQLite (Default for development, configurable for PostgreSQL/MySQL)
- **CORS Management:** `django-cors-headers`

### Frontend
- **Framework & Tooling:** React 19, TypeScript 6, Vite 8
- **Routing:** React Router 8
- **HTTP Client:** Axios 1.19 (configured with interceptors for JWT injection and auto-token refresh)
- **Styling:** Custom CSS design system featuring typography from *Instrument Sans* & *Newsreader*

---

## Project Structure

```
django-excel-app/
├── backend/
│   ├── manage.py
│   ├── db.sqlite3
│   ├── backend/             # Project settings, URL routing, WSGI/ASGI
│   ├── accounts/            # Custom User model, Register & Logout views
│   └── excel_app/           # Category & Product models, Upload Preview/Commit APIs
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── api.ts           # Axios instance with JWT interceptors
│       ├── App.tsx          # Topbar navigation & route layout
│       └── components/
│           ├── login.tsx
│           ├── register.tsx
│           ├── upload.tsx   # Excel preview & inline editing table
│           ├── catalog.tsx  # Paginated catalog display
│           └── private-route.tsx
├── requirements.txt
└── README.md
```

---

## Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** or **Bun**

---

### 1. Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   - **On Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **On macOS/Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install backend dependencies:**
   ```bash
   pip install -r ../requirements.txt
   ```

4. **Apply database migrations:**
   ```bash
   python manage.py migrate
   ```

5. **(Optional) Create a superuser to access Django Admin (`/admin/`):**
   ```bash
   python manage.py createsuperuser
   ```

6. **Start the Django development server:**
   ```bash
   python manage.py runserver
   ```
   *The backend server runs on `http://localhost:8000/`.*

---

### 2. Frontend Setup

1. **Open a new terminal and navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Start the Vite development server:**
   ```bash
   npm run dev
   # or
   bun dev
   ```
   *The frontend application runs on `http://localhost:5173/`.*

---

## Excel File Format Guide

The Excel spreadsheet should contain the following columns in the first sheet:

| Column Name | Required | Example | Description |
| :--- | :---: | :--- | :--- |
| **`name`** | **Yes** | `Graphic Crewneck Tee` | Name of the product |
| **`category`** | **Yes** | `Apparel \| Men \| Tops` | Nested categories separated by `\|` |
| **`description`** | No | `100% Cotton soft fit` | Optional product description |
| **`quantity`** | **Yes** | `45` | Positive integer representing stock count |

---

## API Endpoints Overview

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/register/` | Register new user account | No |
| `POST` | `/api/token/` | Obtain JWT access & refresh tokens | No |
| `POST` | `/api/token/refresh/` | Refresh expired access token | No |
| `POST` | `/api/logout/` | Blacklist refresh token & logout | **Yes** |
| `POST` | `/api/upload-preview/` | Upload Excel file to preview parsed rows | **Yes** |
| `POST` | `/api/upload-commit/` | Atomically save selected valid rows to DB | **Yes** |
| `GET` / `POST` | `/api/products/` | Paginated product list / Create product | **Yes** |
| `GET` / `POST` | `/api/categories/` | List or create categories | **Yes** |

---

## License

This project is open-source and available under the [MIT License](LICENSE).
