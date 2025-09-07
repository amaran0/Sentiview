# Sentiview
## Build Status: Building

## Overview

Sentiview is a full-stack, cloud-deployed web application that helps users monitor their emotional well-being over time. It leverages deep learning and computer vision to classify emotions (happy, sad, angry, surprised, disgusted, fearful, neutral) from uploaded selfies and stores predictions in a secure PostgreSQL database. Users can view emotion trends through an intuitive dashboard, reflecting their mood patterns over time.

This project demonstrates expertise in:

 - Machine Learning & Computer Vision

 - Full-Stack Web Development

 - Cloud Computing & Deployment

 - MLOps & Containerization

 - Agile/DevOps Engineering Practices

## Key Features
### Emotion Detection

Fine-tuned ResNet50 deep learning model (trained on FER2013, ~35k labeled images).

Preprocessing pipeline built with OpenCV and torchvision.

### Cloud-Based Architecture

PostgreSQL (AWS RDS) stores user data, predictions, and timestamps.

AWS S3 for model weight and static asset storage.

Backend (FastAPI) and Frontend (Next.js) hosted in the cloud for global accessibility.

### Containerization & CI/CD

Fully Dockerized backend and model service for reproducibility.

GitHub Actions pipeline for automated testing, building, and deployment.

### Interactive Dashboard

Visualizations for weekly, monthly, and lifetime mood analytics.

Built with Chart.js/Recharts for professional-grade data visualization.

## Tech Stack

**Machine Learning:**	PyTorch, torchvision (ResNet), OpenCV, scikit-learn, NumPy, pandas

**Data Storage:** PostgreSQL, SQLAlchemy ORM

**Backend:**	FastAPI, Python 3.10, Uvicorn, Pydantic

**Frontend:**	Next.js, React, TailwindCSS, Chart.js/Recharts

**Containerization:**	Docker, Docker Compose

**Cloud Deployment:**	Render / Railway / Vercel

**CI/CD:**	GitHub Actions

**Agile Practices:**	Scrum, Git branching workflows (feature branches, PRs)


## Architecture Overview

Here’s how Sentiview’s components communicate:

**1. Frontend:**

User uploads an image through the web app.

Frontend sends the image to the backend API.

**2. Backend:**

Receives and preprocesses the image.

Sends the image to the ML model for inference.

**3. ML Model:**

ResNet50 model predicts the user’s emotion.

Sends prediction back to the backend.

**4. Database:**

Backend stores prediction, timestamp, and user info.

Provides historical data for dashboard charts.

**5. Cloud Hosting:**

Backend and model run in Docker containers on AWS EC2.

Model weights and assets are stored in AWS S3.

**6. CI/CD Pipeline:**

GitHub Actions runs tests, builds Docker images, and deploys changes automatically.

## User Experience

1. Open the Sentiview web app.

2. Upload a selfie or select a previously uploaded image.

3. Receive a real-time emotion prediction.

4. View analytics dashboards with historical trends over days, weeks, and months.

## Contact

**Email:** maran0@purdue.edu, aggar149@purdue.edu
**Linked-in:** https://www.linkedin.com/in/arya-maran, https://www.linkedin.com/in/aksh-aggarwal/