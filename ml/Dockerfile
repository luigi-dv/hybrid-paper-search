FROM python:3.12-slim

WORKDIR /app

# CPU-only PyTorch first. The default build includes the GPU libraries, which
# add several gigabytes that this service never uses.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Dependencies before the code: this layer is rebuilt only when
# requirements.txt changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY src ./src

EXPOSE 8001

# 0.0.0.0: inside a container, localhost would only accept calls from the
# container itself.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
