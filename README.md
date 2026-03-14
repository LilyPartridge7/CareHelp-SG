# CareHelp SG

A community forum built for Singapore's VWO (Voluntary Welfare Organisation) ecosystem. Think of it like a simplified Reddit but focused on connecting volunteers, beneficiaries, and social workers in one place. People can post discussions, upvote/downvote, comment, join community groups, and more.

**Student Name:** Yoon Yati Linn

**University:** University of Information Technology 

**Live Demo:**   https://carehelp-singapore.onrender.com
(Since I am using a free render instance, it can delay requests by 50 seconds or more at first time.)

**GitHub Repo:** https://github.com/LilyPartridge7/CareHelp-SG

---

## Running it locally

There are two ways to get this up and running on your machine. Option A is faster if you just want to test it, Option B is what I used during development.

### Option A — Docker (easiest)

You'll need [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

1. Open a terminal and go into the project folder:
   ```
   cd CareHelp-SG-main
   ```

2. Build everything and start it up:
   ```
   docker-compose up --build -d
   ```
   First time takes a few minutes since it downloads images and compiles the frontend.

3. Once it's done, open your browser and go to **http://localhost:5173**

4. When you're done testing, shut it down with:
   ```
   docker-compose down
   ```

That's it. Docker handles the database, backend server, and frontend for you.

---

### Staff Account Testing (For Graders)
To test staff capabilities (such as deleting any post, pinning posts to a specific community, or pinning to your own wall), please register a new account and use the invite code **CAREHELP_2026**. This will automatically grant your account the `vwo_volunteer` staff role.

---

### Option B — Manual setup (for development)

This is what you'd use if you want to poke around the code or make changes.

**What you need installed:**
- [Go 1.24+](https://go.dev/doc/install)
- [Node.js 18+](https://nodejs.org/en)
- [PostgreSQL](https://www.postgresql.org/download/)

**Step 1 — Create the database**

Make sure PostgreSQL is running, then open a terminal:

```
psql -U postgres
```

It'll ask for your postgres password. Once you're in, create the database:

```sql
CREATE DATABASE carehelp_db;
```

Then type `\q` to exit. You don't need to create any tables — the backend does that automatically when it starts up (it runs migrations on boot).

**Step 2 — Start the backend**

Open a terminal and go to the backend folder:

```
cd CareHelp-SG-main/backend
```

Check for a `.env` file in the `backend` folder. If it is missing (as it is ignored by Git for security), copy the included `.env.example` to a new file named `.env`:

```bash
cp .env.example .env
```

Then, open `.env` and configure your credentials:
1. **JWT_SECRET**: Set any secure string for token signing.
2. **Database Credentials**: Update `DB_PASSWORD` and other settings to match your local PostgreSQL setup.
3. **Cloudinary (Optional)**: Image uploads require a Cloudinary URL. If you don't have one, the app will still run perfectly for text-based posts, but image uploads will be disabled.

Then install dependencies and run it:

```
go mod tidy
go run cmd/server/main.go
```

You should see something like "Server is running on :8080" and a message about database migrations being applied. If it crashes with a database error, double check your `.env` credentials and make sure PostgreSQL is actually running.

> **Note:** Both local and Docker setups connect to the deployed Render backend, so you'll see the same real data and posts as the live site.

**Step 3 — Start the frontend**

Open a **separate terminal** (keep the backend running in the first one):

```
cd CareHelp-SG-main/frontend
npm install
npm run dev
```

Now open **http://localhost:5173** in your browser and you should see the app.

---

## Common issues

**Port already in use** — If you get an error about ports 5432, 8080, or 5173 being taken, you probably have another app using them. Stop any local PostgreSQL service if Docker is complaining about 5432, or change the port mapping in `docker-compose.yml`.

**Backend can't connect to database** — Double check that PostgreSQL is running, that you created the `carehelp_db` database, and that the credentials in `backend/.env` are correct.

**Frontend loads but nothing works** — This usually means the backend isn't running. Check the backend terminal. Also, make sure the API URL in the frontend axios config points to `http://localhost:8080`.

**npm install fails** — Try deleting `node_modules` and `package-lock.json`, run `npm cache clean --force`, and try `npm install` again. Make sure your Node version is 18 or higher.

---

## How I used AI in this project

I mostly used AI as someone to bounce ideas off of and to do fake interviews when I couldn't find real people to ask.

- **Fake user interviews**: I didn't really have access to a lot of volunteers or social workers to talk to, so I got AI to pretend to be different kinds of users like a volunteer, a beneficiary, or a VWO staff member. Then I just asked them questions like "Would you actually use something like this?" or "What bugs you about how your VWO talks to people right now?" It gave me a better sense of what features to focus on, like letting people filter posts by topic or getting a notification when someone replies. Without this, I would've just been guessing.

- **Figuring out why Reddit is popular**: I also got AI to act as people who use Reddit a lot and asked them what makes them keep coming back. Stuff like how the upvote system works, why subreddits are better than one big feed, and how pinned posts help. I looked at HardwareZone and Facebook groups too to see what works and what doesn't. Many of my decisions, such as adding communities you can join, the voting buttons, and allowing staff to pin posts, came from these conversations.

- **Understanding VWO staff problems**: I asked AI to act as VWO coordinators and told them to describe how they handle communication today. The answers helped me think through things like why a staff member should have extra controls, why old posts should be archivable instead of deleted forever, and why pinning announcements matters.

The actual app logic, like how VWO roles get verified, the archive and soft-delete system, community subscriptions, notifications, I built all of that myself based on what I learned from the research above and the project brief.
