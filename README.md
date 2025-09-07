# Sentiview

## AI-Powered Emotion Tracking Web App

Sentiview is a full-stack, cloud-deployed web application that helps users monitor their emotional well-being over time. It leverages deep learning and computer vision to classify emotions (happy, sad, angry, surprised, disgusted, fearful, neutral) from uploaded selfies and stores predictions in a secure PostgreSQL database. Users can view emotion trends through an intuitive dashboard, reflecting their mood patterns over time.

This project demonstrates expertise in:

Machine Learning & Computer Vision

Full-Stack Web Development

Cloud Computing & Deployment

MLOps & Containerization

Agile/DevOps Engineering Practices

🚀 Key Features
🔹 Emotion Detection

Fine-tuned ResNet50 deep learning model (trained on FER2013, ~35k labeled images).

Preprocessing pipeline built with OpenCV and torchvision.

🔹 Cloud-Based Architecture

PostgreSQL (AWS RDS) stores user data, predictions, and timestamps.

AWS S3 for model weight and static asset storage.

Backend (FastAPI) and Frontend (Next.js) hosted in the cloud for global accessibility.

🔹 Containerization & CI/CD

Fully Dockerized backend and model service for reproducibility.

GitHub Actions pipeline for automated testing, building, and deployment.

🔹 Interactive Dashboard

Visualizations for weekly, monthly, and lifetime mood analytics.

Built with Chart.js/Recharts for professional-grade data visualization.

🏗️ Tech Stack
Layer	Technologies Used
Machine Learning	PyTorch, torchvision, OpenCV, NumPy, pandas, scikit-learn
Data Layer	PostgreSQL (AWS RDS), AWS S3, SQLAlchemy ORM
Backend	FastAPI, Python 3.10, Uvicorn, Pydantic
Frontend	Next.js, React, TailwindCSS, Chart.js/Recharts
Containerization	Docker, Docker Compose
Cloud Deployment	AWS EC2, RDS, S3
CI/CD	GitHub Actions
DevOps/MLOps	MLflow (optional), Terraform (optional)
Agile Practices	Scrum, Git branching workflows, feature PR reviews
🏛️ Architecture Overview

Here’s how Sentiview’s components communicate:

Frontend (Next.js):

User uploads an image through the web app.

Frontend sends the image to the backend API.

Backend (FastAPI):

Receives and preprocesses the image.

Sends the image to the ML model for inference.

ML Model (PyTorch):

ResNet50 model predicts the user’s emotion.

Sends prediction back to the backend.

Database (PostgreSQL on AWS RDS):

Backend stores prediction, timestamp, and user info.

Provides historical data for dashboard charts.

Cloud Hosting (AWS):

Backend and model run in Docker containers on AWS EC2.

Model weights and assets are stored in AWS S3.

CI/CD Pipeline:

GitHub Actions runs tests, builds Docker images, and deploys changes automatically.

🖥️ User Experience

Open the Sentiview web app.

Upload a selfie or select a previously uploaded image.

Receive a real-time emotion prediction.

View analytics dashboards with historical trends over days, weeks, and months.

(Optional) Download your mood data or integrate it with other mental wellness tools.