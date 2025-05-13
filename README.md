# Sudoku Web Game

A simple Sudoku game in the browser using Flask (backend) and React (frontend).

## Run Instructions

### 1. Start the Flask backend

```bash
cd backend
pip install -r requirements.txt
flask --app app run
````

### 2. Start the React frontend

```bash
cd frontend
npm install
npm start
```

* Frontend runs at `http://localhost:3000`
* Backend runs at `http://localhost:5000`

---

## Run with Docker Compose

Make sure you have **Docker** and **Docker Compose** installed.

### 1. Build and start the containers

```bash
docker compose up --build
```

### 2. Access the app

* Frontend: `http://localhost:3000`
* Backend API: `http://localhost:5000`
