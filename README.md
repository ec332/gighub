# Gighub System Setup Instructions

This README outlines the steps to build and run the Gighub project, including starting all services, running Docker containers, and executing backend scripts.

---

## 🔧 Step-by-Step Setup

### 1. Start Core Services in different terminals

```bash
cd backend/error
docker compose up --build

cd backend/wallet
docker compose up --build

cd backend/pendingapproval
docker compose up --build

cd backend/notification
docker compose up --build

cd backend/job_record
docker compose up --build

cd backend/escrow
docker compose up --build

cd backend/employer
docker compose up --build

cd backend/compliance
docker compose up --build

cd backend/chatgpt
docker build -t gighub-chatgpt .
docker run -p 5700:5700 --env-file .env --name gighub-chatgpt gighub-chatgpt

# Publish Job
cd backend/CPublishJob
python app.py

# Match Job
cd backend/CMatchJob
python match_job.py

# Accept Job
cd backend/CAcceptJob
python accept_job.py

# Complete Job
cd backend/CCompleteJob
python app.py

# Approve Job
cd backend/CApproveJob
python app.py

# Frontend: from root folder
npm run dev

✅ Final Checklist
 All 9 Docker services are running

 Python microservices are running

 Frontend is running on localhost:3000



