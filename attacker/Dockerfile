FROM python:3.11-slim
WORKDIR /app
RUN pip install requests
COPY ../shared /app/shared
COPY attacker.py /app/
CMD ["python", "attacker.py"]
