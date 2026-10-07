FROM python:3.12-slim
WORKDIR /service
ENV PIP_NO_CACHE_DIR=1 PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py .
EXPOSE 8503
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8503"]
