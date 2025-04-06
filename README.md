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

✅ Checklist
 All 9 Docker services are running

 Python microservices are running

 Frontend is running on localhost:3000


### SETUP DATABASE ###

**Freelancer DB**
Id = 50
Name = unemployedStudent
Email = computersciencestudent@smu.edu.sg
Gender = Male
Skills = Python, Vim, Arch Linux, Academic Weapon, Java
WalletId = 680

**Employer DB**
id = 100
name = AIStartup
email = aistartup@gmail.com
company = AIStartup
wallet_id = 320

Using this script: VV
######################################################
Go to Employer Postgres DB Container > Exec
psql -U employer_user -t employer_db

INSERT INTO employer (id, name, email, company, wallet_id)
VALUES (100, 'AIStartup', 'aistartup@gmail.com', 'AIStartup', 320)
ON CONFLICT (email)
DO UPDATE SET
  id = EXCLUDED.id,
  name = EXCLUDED.name,
  company = EXCLUDED.company,
  wallet_id = EXCLUDED.wallet_id;
######################################################


Wallet DB
WalletID = 680
Role = Freelancer
Balance = 1500 

WalletID = 320
Role = Employer
Balance = 2000

Using this script: VV
######################################################
Go to Wallet Postgres DB Container > Exec
psql -U postgres -t wallet_service

INSERT INTO wallets ("WalletID", "Role", "Balance")
VALUES (680, 'Freelancer', 1500.00);

INSERT INTO wallets ("WalletID", "Role", "Balance")
VALUES (320, 'Employer', 2000.00);
######################################################

### LOGIN DETAILS

Freelancer Login

username: computersciencestudent@smu.edu.sg
password: faang


Employer Login

username: aistartup@gmail.com
password: gptwrapper

Kafka Error Handling

######################################################
Go to error-kafka-1 Container > Exec

/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic publish-job-errors --from-beginning

/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic match-job-errors --from-beginning

/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic accept-job-errors --from-beginning

/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic complete-job-errors --from-beginning

/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic approve-job-errors --from-beginning

/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic error-logs --from-beginning

######################################################


