FROM python:3.11-slim
WORKDIR /app
RUN pip install requests
COPY ../shared /app/shared
COPY alice.py /app/
CMD ["python", "alice.py"]
