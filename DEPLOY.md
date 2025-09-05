# Railway Deployment Guide

## Quick Deploy to Railway

1. **Connect GitHub repo** to Railway
2. **Set environment variables:**
   ```
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://your-atlas-connection
   PORT=3001
   BASE_URL=https://your-app.railway.app
   ```
3. **Deploy automatically** on git push

## Alternative: One-Click Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/nodejs)

## Environment Variables Needed:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/plugins
PORT=3001
BASE_URL=https://your-app.railway.app
```

## MongoDB Setup Options:

### Option 1: MongoDB Atlas (Recommended)
- Free tier: 512MB storage
- Global clusters
- Automatic backups
- Set `MONGODB_URI` to Atlas connection string

### Option 2: Railway PostgreSQL
- If you want to switch from MongoDB
- $5/month for managed database
- Better Railway integration

## Custom Domain Setup:

1. Add domain in Railway dashboard
2. Update DNS CNAME to Railway
3. Automatic SSL certificate

## Monitoring & Logs:

- Railway provides real-time logs
- Built-in metrics dashboard
- Error tracking included
