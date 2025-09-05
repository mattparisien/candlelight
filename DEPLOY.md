# Railway Deployment Guide

## Quick Deploy to Railway

1. **Connect GitHub repo** to Railway
2. **Set environment variables:**
   ```
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://your-atlas-connection
   PORT=3001
   BASE_URL=https://your-app.railway.app  # You'll get the actual URL after step 4
   ```
3. **Deploy automatically** on git push
4. **Get your app URL** from Railway dashboard (Deployments tab)
5. **Update BASE_URL** environment variable with your actual Railway URL

## Finding Your Railway App URL

After deployment, Railway provides a URL like:
```
https://sqsp-plugins-production.up.railway.app
```

**To find it:**
1. Go to Railway dashboard → Your project → Deployments tab
2. Copy the provided URL
3. Update the `BASE_URL` environment variable with this URL
4. Redeploy (Railway will auto-redeploy when you change env vars)

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
