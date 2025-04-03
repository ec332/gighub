docker build -t gighub-chatgpt .

docker run -p 5700:5700 --env-file .env  --name gighub-chatgpt gighub-chatgpt