# 🚀 Push to GitHub - Quick Guide

## Step 1: Create a New Repository on GitHub

1. Go to https://github.com/new
2. **Repository name**: `memoria` (or `aipm`)
3. **Description**: AI Conversation Memory System - Search, visualize, and organize your ChatGPT conversations
4. **Visibility**: Choose Public or Private
5. ⚠️ **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click **"Create repository"**

## Step 2: Push Your Code

After creating the repo, run these commands:

```bash
cd /home/gok2/EPFL/aipm

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/memoria.git

# Push to GitHub
git push -u origin main
```

## Step 3: Add Collaborators

### Method A: Via GitHub Web Interface
1. Go to your repo: `https://github.com/YOUR_USERNAME/memoria`
2. Click **Settings** tab
3. Click **Collaborators** (left sidebar)
4. Click **Add people**
5. Enter your friends' GitHub usernames or emails:
   - Vittoria Meroni
   - Ching-Chi Chou
   - Ilias Merigh
6. They'll receive an invitation email

### Method B: Via Team (for Organizations)
If you want to create an organization:
1. Go to https://github.com/organizations/new
2. Create organization (free for public repos)
3. Add members to the organization
4. Transfer the repo to the organization

## Current Git Status

✅ Repository initialized
✅ All files committed (36 files, 9423 lines)
✅ Branch renamed to `main`
✅ Ready to push!

## Example Commands (Replace YOUR_USERNAME)

```bash
# Add remote
git remote add origin https://github.com/YOUR_USERNAME/memoria.git

# Verify remote
git remote -v

# Push to GitHub
git push -u origin main

# For subsequent pushes
git push
```

## Need to Make Changes?

```bash
# After editing files
git add .
git commit -m "Your commit message"
git push
```

## 📧 Collaborator GitHub Usernames

You'll need your team's GitHub usernames to add them. Ask them for:
- Vittoria Meroni → GitHub username
- Ching-Chi Chou → GitHub username  
- Ilias Merigh → GitHub username

Then add via Settings → Collaborators on GitHub!

---

**Your repo is ready to push!** Just create it on GitHub and run the commands above. 🎉
