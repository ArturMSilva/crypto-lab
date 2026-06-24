FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
RUN pip install requests
COPY shared /app/shared
COPY attacker/attacker.py /app/
CMD ["python", "attacker.py"]
