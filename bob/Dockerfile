FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
RUN pip install requests
COPY shared /app/shared
COPY bob/bob.py /app/
CMD ["python", "bob.py"]
