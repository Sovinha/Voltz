FROM python:3.10-slim

WORKDIR /app



COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app files
COPY . .


# Run database seed on startup if db does not exist, then start server
EXPOSE 5000

CMD ["gunicorn", "--workers", "2", "--threads", "2", "--timeout", "120", "--bind", "0.0.0.0:5000", "app:app"]
