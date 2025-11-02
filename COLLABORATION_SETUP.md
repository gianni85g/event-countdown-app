# Complete Collaboration Setup Guide

## 📋 Overview
This guide sets up secure multi-user collaboration for Moments, where:
- Users can share moments with other users by email
- Collaborators can view and add tasks/comments to shared moments
- All data is properly isolated using Row-Level Security (RLS)

---

## 🗂️ Files to Run (in order)

### 1. `setup_collaboration.sql`
**Purpose:** Initial setup
- Adds `shared_with` column to moments table
- Creates basic RLS policies for moments viewing

### 2. `setup_collaboration_fix.sql`
**Purpose:** Complete isolation
- Adds RLS policies for tasks (preparations)
- Adds RLS policies for comments
- Ensures tasks/comments inherit access from their parent moment

---

## ✅ What Gets Fixed

| Problem | Solution |
|---------|----------|
| Tasks from non-shared moments appear for other accounts | RLS filters tasks by moment ownership + sharing |
| Collaborator tasks visible only to themselves | RLS allows access if email is in moment's `shared_with` |
| Cross-user data leakage | All queries inherit permissions from parent moment |

---

## 🧪 Testing Steps

1. **User A** logs in → creates "Trip to Rome"
2. **User A** clicks Share → adds `friend@example.com`
3. **User B** signs up with `friend@example.com`
4. **User B** logs in → sees "Trip to Rome" on dashboard ✅
5. **User B** adds a task → Both A and B see it ✅
6. **User C** logs in → sees nothing ✅

---

## 🔑 Key Technical Details

### Email Normalization
All emails are automatically normalized:
```typescript
const cleaned = emails
  .map((e) => e.trim().toLowerCase())
  .filter((e, i, arr) => e && arr.indexOf(e) === i);
```

### RLS Policy Logic
```sql
-- A user can see a task if:
auth.uid() = (SELECT user_id FROM moments WHERE id = moment_id)
OR
(auth.jwt()->>'email') = ANY (SELECT shared_with FROM moments WHERE id = moment_id)
```

### Data Inheritance
Tasks and comments automatically inherit access rules from their parent moment via `moment_id` foreign key relationship.

---

## 📝 No Code Changes Needed

The app code already:
- ✅ Sets `moment_id` correctly when creating tasks
- ✅ Normalizes emails in share function
- ✅ Uses RLS-compatible queries (no client-side filtering)

Just run the SQL files! 🚀



