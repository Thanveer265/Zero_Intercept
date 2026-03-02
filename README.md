# 🏥 MEDIX 
**AI-Driven Hospital Operational Intelligence & Strategic Decision Platform**

An enterprise-grade, AI-powered hospital operations monitoring and strategic decision-support system. It features a powerful **FastAPI** backend integrated with **MongoDB Atlas**, and a stunning **React/Vite** frontend with a **3D Digital Twin** of the hospital.

![MEDIX Logo](./frontend/public/MEDIX-Photoroom.png)

## 🚀 Live Demo
- **Frontend Vercel Deployment:** [https://medix-3xfsls30o-tharankeswarans-projects.vercel.app](https://medix-3xfsls30o-tharankeswarans-projects.vercel.app)
- **Backend API Docs (Swagger):** `<your-vercel-backend-url>/docs`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python, FastAPI, Pydantic, Uvicorn |
| **Database** | MongoDB Atlas (Motor/PyMongo) |
| **AI/ML** | Google Gemini 1.5 Pro |
| **Frontend** | React (Vite), Tailwind CSS v4, Recharts, Framer Motion, Lucide React, Axios |
| **3D Engine** | React Three Fiber (R3F), Drei, Rapier (Physics) |
| **Hosting** | Vercel (Serverless Functions) |

---

## ✨ Key Features

| Module | Description |
|--------|-------------|
| **Executive Dashboard** | Real-time KPIs, hospital health index, and dynamic trend indicators. |
| **Workload Analytics** | Department & staff workload distribution, hourly heatmaps, and weekly trends. |
| **3D Digital Twin** | First-person interactive 3D replica of the hospital with live data overlays. |
| **Interactive Portals** | Dedicated dashboards for **Admins**, **Doctors**, **Nurses**, and **Patients**. |
| **AI Assistant** | Natural language interface powered by Gemini 1.5 Pro to query hospital data. |
| **Predictive Insights** | Burnout prediction, surge detection, and resource forecasting. |
| **Simulation Lab** | Interactive staffing simulation with immediate outcome prediction. |
| **Optimization Engine** | Optimal staffing allocation and automated resource recommendations. |
| **Risk & Alerts** | Real-time SLA breach, staff burnout, and patient surge alerts. |

---

## 💻 Local Development Setup

### 1. Backend Setup

```bash
cd backend
# Create and activate virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create a .env file in the backend directory
# Example: MONGO_URI=mongodb+srv://... GEMINI_API_KEY=...

# Run the FastAPI server
python main.py
```
> The backend runs locally at: **http://localhost:8000**

### 2. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Run the Vite development server
npm run dev
```
> The frontend runs locally at: **http://localhost:5173**

---

## 👥 Meet the Team

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/Thanveer265">
        <img src="https://github.com/Thanveer265.png" width="100px;" alt="Thanveer265"/>
        <br /><sub><b>Thanveer T</b></sub>
      </a>
      <br />Frontend Development
    </td>
  <tr>
    <td align="center">
      <a href="https://github.com/Akshaykumar-B">
        <img src="https://github.com/Akshaykumar-B.png" width="100px;" alt="Thanveer265"/>
        <br /><sub><b>Akshaykumar-B</b></sub>
      </a>
      <br /> supporter 
    </td>
    <td align="center">
      <a href="https://github.com/MR-WHOAMEYE">
        <img src="https://github.com/MR-WHOAMEYE.png" width="100px;" alt="MR-WHOAMEYE"/>
        <br /><sub><b>MR-WHOAMEYE</b></sub>
      </a>
      <br />Backend & deployment
    </td>
    <td align="center">
      <a href="https://github.com/mohan-kumar-12">
        <img src="https://github.com/mohan-kumar-12.png" width="100px;" alt="mohan-kumar-12"/>
        <br /><sub><b>mohan-kumar-12</b></sub>
      </a>
      <br />Project Integration
    </td>
  </tr>
</table>

---

## 📁 Project Structure

```text
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── mongo.py             # Centralized MongoDB Atlas Connection
│   ├── requirements.txt
│   ├── vercel.json          # Serverless deployment config
│   └── routers/             # API Endpoints (auth, workload, digital_twin, etc.)
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI elements (Charts, 3D Canvas, etc.)
│   │   ├── pages/           # Route views (Dashboard, Simulation, Portals)
│   │   ├── services/        # Axios API clients
│   │   └── App.jsx          # React Router setup
│   ├── vercel.json          # Frontend proxy configuration
│   └── index.html
└── README.md
```

---
*Built with ❤️ for improved healthcare operations and patient outcomes.*
