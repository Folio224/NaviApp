# ── Stage 1: Builder ──────────────────────────────────────────────────────────
# Install dependencies in a separate stage to keep the final image lean.
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build tools needed for some packages (e.g. grpcio, argon2-cffi)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy only the installed packages from the builder stage
COPY --from=builder /install /usr/local

# Copy application source code
COPY app.py auth.py database.py models.py schemas.py ./
COPY static/ ./static/
COPY templates/ ./templates/

# Create the temp_uploads directory (used by /api/summarize)
RUN mkdir -p temp_uploads

# ── Environment ───────────────────────────────────────────────────────────────
# Do NOT bake secrets into the image.
# Pass GEMINI_API_KEY and SECRET_KEY at runtime via --env-file or DO env vars.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# ── Port ──────────────────────────────────────────────────────────────────────
EXPOSE 8000

# ── Entrypoint ────────────────────────────────────────────────────────────────
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--proxy-headers", "--forwarded-allow-ips=*"]
