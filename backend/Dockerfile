FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (if needed for iFood scraper)
RUN playwright install-deps && playwright install chromium

COPY . .

# Run database seed on startup if db does not exist, then start server
EXPOSE 5000

CMD ["sh", "-c", "python seed_data.py && gunicorn --bind 0.0.0.0:5000 app:app"]
