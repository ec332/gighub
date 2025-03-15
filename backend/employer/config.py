from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL_EMPLOYER", "postgresql://localhost/mydatabase")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
