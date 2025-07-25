# Use official Python image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip
RUN pip install -r requirements.txt
RUN pip install daphne

# Copy your Django project into the container
COPY . /app/

# Expose the port
EXPOSE 8000

# Run Daphne server
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "--verbosity", "2", "connect_conquer_backend.asgi:application"]
