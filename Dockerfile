# 1. Use a lightweight Python base
FROM python:3.10-slim

# 2. Set working directory
WORKDIR /app

# 3. Install system dependencies
# FIX: Replaced 'libgl1-mesa-glx' (deprecated) with 'libgl1' (modern)
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 4. CRITICAL STEP: Install CPU-ONLY PyTorch
# This prevents downloading the massive 5GB GPU version
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu --no-cache-dir

# 5. Copy requirements file
COPY auto-labor-compliance-agent/requirements.txt requirements.txt

# 6. Install dependencies
# --no-cache-dir is vital to keep the image small
RUN pip install -r requirements.txt --no-cache-dir

# 7. Copy the rest of the application
COPY . .

# 8. Define the start command
CMD ["python", "auto-labor-compliance-agent/main.py"]