# 1. Use a lightweight Python base (Slim version)
FROM python:3.10-slim

# 2. Set working directory
WORKDIR /app

# 3. Install system dependencies required for PDF parsing and OCR
# We clean up the list immediately to save space
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 4. CRITICAL STEP: Install CPU-ONLY PyTorch
# We do this BEFORE requirements.txt. 
# This prevents docling from downloading the massive GPU version (5GB+).
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu --no-cache-dir

# 5. Copy your requirements file
COPY auto-labor-compliance-agent/requirements.txt requirements.txt

# 6. Install dependencies (including docling)
# The --no-cache-dir flag is VITAL to stop pip from saving 2GB of cache files
RUN pip install -r requirements.txt --no-cache-dir

# 7. Copy the rest of the application
COPY . .

# 8. Define the start command
# (We point to your backend folder)
CMD ["python", "auto-labor-compliance-agent/main.py"]