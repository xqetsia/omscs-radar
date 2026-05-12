# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# Stage 1: builder
# -----------------------------------------------------------------------------
# Install Python deps in a throwaway image that has build tools. The compiled
# wheels we end up with are then copied into a slim runtime image (stage 2),
# keeping the final image small.
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS builder

# Tell Python to not buffer stdout (so logs show up immediately) and skip
# the .pyc cache (the image is read-only at runtime anyway).
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Copy only the dependency manifests first. Docker caches each layer; if the
# manifests don't change, the entire `pip install` layer is reused on rebuild.
# We have two of them because backend depends on the scraper.
COPY scraper/pyproject.toml ./scraper/pyproject.toml
COPY backend/pyproject.toml ./backend/pyproject.toml

# Now copy the actual source code. Done after the manifests so that ordinary
# source edits don't bust the dependency-install cache.
COPY scraper/src ./scraper/src
COPY backend/src ./backend/src

# Install scraper first (backend depends on it), then backend.
RUN pip install ./scraper && pip install ./backend


# -----------------------------------------------------------------------------
# Stage 2: runtime
# -----------------------------------------------------------------------------
# Slim image with just Python + the installed packages. No build tools, no
# package caches, no source files we don't need.
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Create a non-root user to run the app. Defense in depth: if the app is
# compromised, the attacker is sandboxed in an unprivileged account.
RUN useradd --create-home --shell /bin/bash app
WORKDIR /home/app

# Copy the installed Python packages from the builder stage.
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

USER app

# The PORT env var lets the hosting platform (Railway, Fly, etc) choose the port.
# Default to 8000 for local docker runs.
ENV PORT=8000
EXPOSE 8000

# `sh -c` so we can substitute $PORT at runtime.
CMD ["sh", "-c", "uvicorn backend.app:app --host 0.0.0.0 --port ${PORT}"]