# AI-Driven Hospital Operational Intelligence & Strategic Decision Platform

An enterprise-grade, AI-powered hospital operations monitoring and strategic decision-support system with Python/FastAPI backend and React/Vite frontend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python, FastAPI, SQLAlchemy, Pandas, NumPy, Scikit-learn, Statsmodels, TextBlob |
| **Database** | SQLite |
| **Frontend** | React (Vite), Tailwind CSS v4, Recharts, Framer Motion, Lucide React, Axios |

## Quick Start

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The backend auto-seeds the database on first run (5000+ cases, 90+ staff, 1500 appointments, 800 feedback entries).

Backend runs at: **http://localhost:8000**

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

## Features (14 Modules)

| Module | Description |
|--------|-------------|
| Executive Dashboard | KPIs, health index, trend indicators |
| Workload Analytics | Department/staff workload, heatmap, weekly trends |
| Resolution & SLA | Resolution trends, SLA compliance, efficiency ranking |
| Predictive Insights | ARIMA forecasting, burnout prediction, surge detection |
| Digital Twin | Department state visualization, dependency graph |
| Simulation Lab | Interactive staffing simulation with outcome prediction |
| Optimization Engine | Optimal staffing allocation, resource recommendations |
| Risk & Alerts | Real-time SLA breach, burnout, and surge alerts |
| Sentiment Intelligence | NLP-based patient feedback analysis |
| Strategic Planning | Pandemic/surge/shortage scenario simulation |
| Financial Insights | Revenue loss, delay costs, budget forecasting |
| AI Assistant | Natural language query interface |
| Reports | Auto-generated reports with PDF/CSV export |
| Settings | Platform configuration |

## API Endpoints

All endpoints documented at: **http://localhost:8000/docs** (Swagger UI)

| Prefix | Module |
|--------|--------|
| `/api/dashboard` | Executive Dashboard |
| `/api/workload` | Workload Analytics |
| `/api/sla` | Resolution & SLA |
| `/api/predictive` | Predictive Analytics |
| `/api/root-cause` | Root Cause Analysis |
| `/api/digital-twin` | Digital Twin |
| `/api/simulation` | Simulation Lab |
| `/api/optimization` | Optimization Engine |
| `/api/sentiment` | Sentiment Intelligence |
| `/api/alerts` | Risk & Alerts |
| `/api/strategic` | Strategic Planning |
| `/api/financial` | Financial Impact |
| `/api/assistant` | AI Assistant |
| `/api/reports` | Reports |

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── database.py           # SQLAlchemy config
│   ├── models.py             # ORM models
│   ├── seed_data.py          # Synthetic data generator
│   ├── requirements.txt
│   └── routers/
│       ├── dashboard.py
│       ├── workload.py
│       ├── sla.py
│       ├── predictive.py
│       ├── root_cause.py
│       ├── digital_twin.py
│       ├── simulation.py
│       ├── optimization.py
│       ├── sentiment.py
│       ├── alerts.py
│       ├── strategic.py
│       ├── financial.py
│       ├── assistant.py
│       └── reports.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── KPICard.jsx
│   │   │   ├── PageHeader.jsx
│   │   │   ├── ChartCard.jsx
│   │   │   └── LoadingSpinner.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── WorkloadAnalytics.jsx
│   │   │   ├── ResolutionSLA.jsx
│   │   │   ├── PredictiveInsights.jsx
│   │   │   ├── DigitalTwin.jsx
│   │   │   ├── SimulationLab.jsx
│   │   │   ├── OptimizationEngine.jsx
│   │   │   ├── RiskAlerts.jsx
│   │   │   ├── Sentiment.jsx
│   │   │   ├── StrategicPlanning.jsx
│   │   │   ├── FinancialInsights.jsx
│   │   │   ├── AIAssistant.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── Settings.jsx
│   │   └── services/
│   │       └── api.js
│   └── index.html
└── README.md
```
