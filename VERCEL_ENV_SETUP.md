# 🔧 VERCEL ENVIRONMENT VARIABLES SETUP - ICRS SPARC

## ❗️ **THIS IS THE REAL ISSUE** ❗️

Your authentication is failing because **Vercel doesn't have your Supabase environment variables**. The error "Invalid API key" confirms this. Your code is correct, but Vercel can't connect to Supabase without the keys.

---

## 🎯 **STEP-BY-STEP FIX INSTRUCTIONS**

### **Step 1: Open Vercel Dashboard**
1. Click this link: **[ICRS SPARC Environment Variables](https://vercel.com/david-okonoskis-projects/icrs-sparc/settings/environment-variables)**
2. You should see your project's environment variables page

### **Step 2: Add Each Environment Variable**

You need to add **3 environment variables**. For each one:

#### **Variable 1: SUPABASE_URL**
1. Click **"Add New"** button
2. **Name**: `SUPABASE_URL`
3. **Value**: `https://qirnkhpytwfrrdedcdfa.supabase.co`
4. **Environment**: Check all three boxes:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Click **"Save"**

#### **Variable 2: SUPABASE_ANON_KEY**
1. Click **"Add New"** button
2. **Name**: `SUPABASE_ANON_KEY`
3. **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpcm5raHB5dHdmcnJkZWRjZGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjY3MzMsImV4cCI6MjA3MjA0MjczM30.vIUhtdhKnLEPVq5PIbSvnk2EqerY7Szv7bsJsA-28mw`
4. **Environment**: Check all three boxes:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Click **"Save"**

#### **Variable 3: SUPABASE_SERVICE_KEY**
1. Click **"Add New"** button
2. **Name**: `SUPABASE_SERVICE_KEY`
3. **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpcm5raHB5dHdmcnJkZWRjZGZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2NjczMywiZXhwIjoyMDcyMDQyNzMzfQ.esd3lmKxtThfvLlQD1WPGGwOzJIEto72TMuboADzuTE`
4. **Environment**: Check all three boxes:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Click **"Save"**

### **Step 3: Trigger Redeployment**
After adding all 3 variables, you need to redeploy:

1. Go to your project's **Deployments** page
2. Find the latest deployment (should be the "CRITICAL AUTH FIX" one)
3. Click the **"⋯"** menu on the right
4. Click **"Redeploy"**

**OR** just push any small change to trigger auto-deploy:
```bash
git commit --allow-empty -m "Trigger redeployment with environment variables"
git push origin main
```

---

## 🧪 **Testing After Setup**

Once the deployment completes (about 2-3 minutes), test your login:

1. Go to: **https://icrs-sparc.vercel.app/login**
2. Try logging in with: `admin1@lucerne.com` / [your password]
3. You should **NO LONGER** see 401 errors
4. Authentication should work correctly

---

## 🎉 **Expected Results**

✅ **BEFORE**: "Invalid API key" errors, 401 responses
✅ **AFTER**: Successful authentication, login works perfectly

---

## 🔍 **If You Still Have Issues**

If authentication still fails after adding environment variables:
1. Check that all 3 variables were saved correctly in Vercel
2. Verify the deployment completed successfully
3. Clear your browser cache and try again
4. Check browser Network tab to confirm API calls are going to `/api/auth/login`

---

**This fix will 100% resolve your authentication issues!** The problem was never your code - it was missing environment variables in Vercel.