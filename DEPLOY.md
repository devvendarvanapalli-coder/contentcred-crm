# Deploying ContentCred CRM to DigitalOcean

**Cost:** ~$12/month | **Time:** ~30 minutes

---

## Step 1 — Create a Droplet

1. Go to [digitalocean.com](https://digitalocean.com) and sign up / log in
2. Click **Create → Droplets**
3. Choose these settings:
   - **Region:** pick the one closest to you
   - **OS:** Ubuntu 24.04 LTS
   - **Plan:** Basic → Regular → **$12/mo** (1 vCPU, 2GB RAM, 50GB SSD)
   - **Authentication:** SSH Key (recommended) or Password
4. Click **Create Droplet**
5. Copy your Droplet's **IP address** — you'll need it throughout

---

## Step 2 — SSH Into Your Server

```bash
ssh root@YOUR_DROPLET_IP
```

---

## Step 3 — Install Docker & Docker Compose

```bash
# Update packages
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt install docker-compose-plugin -y

# Verify both work
docker --version
docker compose version
```

---

## Step 4 — Upload Your Project

On your **local machine** (not the server), run:

```bash
# From inside your contentcred-crm folder
scp -r . root@YOUR_DROPLET_IP:/root/contentcred-crm
```

Or if you have it on GitHub:

```bash
# On the server
apt install git -y
git clone https://github.com/YOUR_USERNAME/contentcred-crm.git /root/contentcred-crm
```

---

## Step 5 — Create Your `.env` File

On the server:

```bash
cd /root/contentcred-crm
cp .env.example .env
nano .env
```

Fill in every value. The key ones:

```env
# Your Droplet's IP address
API_BASE_URL=http://YOUR_DROPLET_IP:8001

# Gmail — generate an App Password at myaccount.google.com/apppasswords
GMAIL_ADDRESS=team.contentcred@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Your Calendly link
CALENDLY_LINK=https://calendly.com/contentcred-strategy/content-distribution-strategy-call

# Leave DATABASE_URL as-is — it points to the Docker postgres container
DATABASE_URL=postgresql://contentcred:contentcred123@db:5432/contentcred_crm
```

Save with `Ctrl+O`, exit with `Ctrl+X`.

---

## Step 6 — Build and Start Everything

```bash
cd /root/contentcred-crm
docker compose up -d --build
```

This will:
- Build the backend and frontend Docker images
- Start Postgres, the FastAPI backend, and the React frontend
- Run everything in the background (`-d`)

Check it's all running:

```bash
docker compose ps
```

You should see 3 services all showing **Up**.

---

## Step 7 — Open the Firewall

```bash
ufw allow 22    # SSH
ufw allow 8001  # Backend API
ufw allow 3001  # Frontend
ufw enable
```

---

## Step 8 — Visit Your CRM

Open your browser and go to:

```
http://YOUR_DROPLET_IP:3001
```

Your CRM dashboard should load. The API is at:

```
http://YOUR_DROPLET_IP:8001/docs
```

---

## Step 9 — Keep It Running After Reboots

```bash
# Tell Docker to restart containers automatically if the server reboots
docker compose down
docker compose up -d --restart always
```

Or set Docker to start on boot:

```bash
systemctl enable docker
```

---

## Useful Commands

```bash
# View live logs
docker compose logs -f

# View logs for just the backend
docker compose logs -f backend

# Restart everything
docker compose restart

# Stop everything
docker compose down

# Pull latest code from GitHub and redeploy
git pull && docker compose up -d --build
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Can't connect to the site | Check `ufw status` — ports 3001 and 8001 must be allowed |
| Backend crashes on start | Run `docker compose logs backend` to see the error |
| Emails not sending | Check `GMAIL_APP_PASSWORD` in `.env` — must be an App Password, not your regular Gmail password |
| Database errors | Run `docker compose restart db` then `docker compose restart backend` |
| Out of disk space | Run `docker system prune -f` to clean unused images |

---

## Optional — Point a Domain at Your CRM

If you have a domain (e.g. `crm.contentcred.com`):

1. In your domain registrar's DNS settings, add an **A record**:
   - Name: `crm`
   - Value: `YOUR_DROPLET_IP`
2. Wait 5–10 minutes for DNS to propagate
3. Access your CRM at `http://crm.contentcred.com:3001`

To remove the port from the URL, install Nginx as a reverse proxy — ask Claude to set that up when you're ready.
