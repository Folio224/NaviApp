# NaviApp
# NaviApp Server Deployment Guide

This document outlines the steps to deploy the FastAPI application on a fresh Ubuntu Linux server.

## 1. Initial Server Setup
Update the server and install the required global packages:
`sudo apt update`
`sudo apt install -y docker.io nginx certbot python3-certbot-nginx fail2ban sqlite3`

## 2. Security: Fail2Ban (SSH Protection)
Create a local jail for SSH to block brute-force attacks.
`sudo nano /etc/fail2ban/jail.d/sshd.local`

**Paste the following configuration:**
[sshd]
enabled = true
port = ssh
filter = sshd
maxretry = 5
bantime = 1h
findtime = 10m

**Enable and start the service:**
`sudo systemctl restart fail2ban`
`sudo systemctl enable fail2ban`

## 3. Application Deployment (Docker)
Ensure the database file exists so Docker doesn't create a directory:
`touch /root/NaviApp/navimind.db`

Build the Docker image from the source code:
`docker build -t navimind .`

Run the container on the internal port (8000), mounting the database and injecting the AI key:
`docker run -d \`
  `--name navimind \`
  `--restart always \`
  `-p 127.0.0.1:8000:8000 \`
  `-v /root/NaviApp/navimind.db:/app/navimind.db \`
  `-e GEMINI_API_KEY="INSERT_ACTUAL_KEY_HERE" \`
  `navimind`

## 4. Reverse Proxy & Rate Limiting (Nginx)
Create the site configuration:
`sudo nano /etc/nginx/sites-available/navimind`

**Paste the following configuration:**
limit_req_zone $binary_remote_addr zone=mylimit:10m rate=2r/s;

server {
    server_name navi.yourdomain.com; # Change to actual domain

    location / {
        limit_req zone=mylimit burst=5 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

**Enable the site and restart Nginx:**
`sudo ln -s /etc/nginx/sites-available/navimind /etc/nginx/sites-enabled/`
`sudo rm /etc/nginx/sites-enabled/default`
`sudo nginx -t && sudo systemctl reload nginx`

## 5. SSL Certificate (HTTPS)
Once DNS is pointed to the server IP, generate the certificate:
`sudo certbot --nginx -d navi.yourdomain.com`