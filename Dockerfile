# 1. Use the official lightweight Python image
FROM python:3.10-slim

# 2. Set the working directory container
WORKDIR /app

# 3. Install system dependencies (Fixed for Debian Bookworm)
# We replace 'libgl1-mesa-glx' with 'libgl1' and 'libglx-mesa0'
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1 \
    libglx-mesa0 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 4. PRE-INSTALL PYTORCH (CPU VERSION)
# This is the "Magic Step" that keeps your app under 4GB.
# We install this BEFORE requirements.txt so Docling sees it exists and doesn't download the GPU version.
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu --no-cache-dir

# 5. Copy requirements and install dependencies
COPY auto-labor-compliance-agent/requirements.txt requirements.txt
RUN pip install -r requirements.txt --no-cache-dir

# 6. Copy the application code
COPY . .

# 7. Start the application
# We point directly to your python executable
CMD ["python", "auto-labor-compliance-agent/main.py"]