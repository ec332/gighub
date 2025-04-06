cd error
docker compose up --build

cd wallet, pendingapproval, notification, job_record, escrow, employer, compliance
docker compose up --build

cd chatgpt
docker build -t gighub-chatgpt .
docker run -p 5700:5700 --env-file .env  --name gighub-chatgpt gighub-chatgpt

**Verify 9 services are running on Docker**

cd CPublishJob
python app.py

cd CMatchJob
python match_job.py

cd CAcceptJob
python accept_job.py

cd CCompleteJob
python app.py

cd CApproveJob
python app.py

cd root
npm run dev