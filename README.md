# Score Board Application

The Score Board Application is a web-based platform designed to facilitate scoring and ranking in competitive events. It allows judges to submit scores for performers, provides an admin interface for event management, and offers a real-time view for bystanders to monitor the scoring progress.

## Overview

This application is built using a client-server architecture:
- **Backend**: A Flask application serving RESTful APIs.
- **Frontend**: A React.js application providing interactive user interfaces.
- **Database**: MySQL database storing all the event data.

## Prerequisites

- Docker and Docker Compose installed on your machine.

## Setup Instructions

Ensure that your `docker-compose.yml` file is correctly configured with the necessary environment variables for the database connection and API base URL.

Use Docker Compose to build and run the application:

This will start the backend Flask server and the frontend React application.
```bash
docker-compose up --build
```

### Access the Application

- **Frontend**: Open your browser and navigate to `http://localhost:3000` to access the frontend application.
- **Backend**: The backend server will be running at `http://localhost:5000`.

## Docker Commands

- **Start the Application**: 
  ```bash
  docker-compose up
  ```

- **Stop the Application**: 
  ```bash
  docker-compose down
  ```

- **Rebuild the Application**: 
  ```bash
  docker-compose up --build
  ```

- **View Logs**: 
  ```bash
  docker-compose logs
  ```

