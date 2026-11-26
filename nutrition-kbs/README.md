# Personalized Nutrition Guidance Knowledge-Based System

This repository contains a React/Vite frontend and an Express/MongoDB backend.

## Local setup

1. Use Node.js `>=22.12.0 <25.0.0` and start a local MongoDB instance.
2. In `backend`, copy `.env.example` to `.env` and provide the database URI, a long random JWT secret, client URL, and local cookie settings. `USDA_API_KEY` is needed for USDA search/import; `GEMINI_API_KEY` enables Gemini for nutrition chat and budget plan selection; `FOODTALES_API_KEY` enables regional dish search and nutrition details in Daily Nutrition Tracking. These provider keys are optional for the non-provider features. `GEMINI_MODEL` is optional.
3. In `frontend`, copy `.env.example` to `.env`. Set `VITE_API_URL` to the backend origin (for example, `http://localhost:5000`).
4. Run `npm ci` in each application directory, then `npm run dev` in `backend` and `frontend`. The backend also has `npm run seed:foods` and `npm run seed:rules` for initializing its knowledge base.

Do not commit either `.env` file. Keep API keys only in the backend environment. For production, use HTTPS, a strong unique `JWT_SECRET`, the correct `CLIENT_URL`, and `COOKIE_SECURE=true`.

## Current modules

The implemented modules include account authentication, user profiles, BMI and calorie estimates, a food database with USDA search/import, deterministic food recommendations, an authenticated Gemini nutrition chat, and a budget meal planner that chooses only from locally stored foods and price records. Gemini may select among those database records; the backend validates the selections and calculates all costs and nutrients from stored values. Chat history is held in page state and is not saved to MongoDB; profile context sent to Gemini is limited to dietary preference, allergies, restrictions, and health goal. Kitchen inventory and other planning pages are still under development.

Authenticated state-changing requests use a CSRF token obtained from `/api/auth/csrf`; the frontend API client attaches it automatically.

## Daily Nutrition Tracking

The authenticated `/nutrition-tracking` page records foods the user explicitly adds. It uses existing local food records per 100 g and stores a snapshot of the selected food's nutrient values in a per-user, per-date log, so later catalogue edits do not rewrite history. FoodTales can supply regional dish search and nutrition records when `FOODTALES_API_KEY` is configured. FoodTales nutrition is recorded using its stated per-serving or per-100-g basis; nutrients it does not report remain unavailable instead of being filled with invented values. FoodTales search/details requests are limited to 20 per client IP per minute. The Gemini Nutrition Chat uses this user's selected-day food log only when the conversation asks about recorded intake; it does not receive the log for unrelated questions.

Tracking APIs under `/api/tracking` include `GET /day`, `GET /history?period=week|month`, `GET /foods`, `GET /foodtales/search`, `GET /foodtales/:sku`, `POST /entries`, `PATCH /entries/:entryId`, and `DELETE /entries/:entryId`. All routes require authentication and log operations are scoped to the current user. User-set targets are stored on the existing profile. Defaults use the existing Mifflin-St Jeor calorie estimate, the ICMR-NIN adult protein recommendation of 0.83 g/kg/day, and 25 g/day fibre guidance; carbohydrate and fat targets are not estimated by the app. These are general educational estimates, not medical advice.

The budget planner endpoint is `POST /api/budget/plan`. It requires an authenticated session and applies saved profile allergies and restrictions. Send `dailyBudget` (₹50–₹5,000), `mealsPerDay` (3 or 4), and optionally `dietaryPreference`, `foodPreferences`, and `restrictions`. The endpoint allows six plan requests per client IP in 15 minutes. It uses Gemini when configured, then falls back to a deterministic plan if Gemini is unavailable or its proposed plan fails validation. Gemini receives the budget, food preferences, calorie estimate, and filtered local food catalogue; the backend does not send account identity. Without a Gemini key, the local rules-based planner still works.

## Deploying to Render with MongoDB Atlas

The repository has separate `backend` and `frontend` applications; there is no deployment manifest. Configure them as two Render services:

1. Create an Atlas database user with only the permissions the app needs, and allow the Render service's outbound IP addresses in Atlas Network Access. Use the Atlas `mongodb+srv://` URI for `MONGO_URI`; URL-encode special characters in the database username or password. The database connection could not be verified from this workspace.
2. Create a Render **Web Service** with root directory `backend`, build command `npm ci`, start command `npm start`, and health check path `/api/health`.
3. Set backend environment values in Render: `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET` (a unique random value of at least 32 characters), `CLIENT_URL` (the frontend's exact HTTPS origin), and `COOKIE_SECURE=true`. Render provides `PORT`; the server binds to it and trusts one Render proxy hop. `USDA_API_KEY` and `GEMINI_API_KEY` are optional backend-only secrets. `GEMINI_MODEL` defaults to `gemini-3.8-flash`.
4. Create a Render **Static Site** with root directory `frontend`, build command `npm ci && npm run build`, and publish directory `dist`. Set `VITE_API_URL` to the backend origin without `/api`, then add an SPA rewrite from `/*` to `/index.html` with status 200. Set the backend `CLIENT_URL` to this static site's exact origin.
5. Initialize food/rule collections only when the Atlas database is new. The seed commands upsert records; do not run them over curated production food/rule data without backing up and reviewing the changes. The app does not run migrations or alter existing user data during startup.

The `/api/health` endpoint returns an error status when MongoDB is disconnected, so configure it as the Render health check. Environment validation rejects malformed MongoDB/client URLs, a short JWT secret, invalid ports, and non-secure production cookie settings. Never put `GEMINI_API_KEY`, `USDA_API_KEY`, `MONGO_URI`, or `JWT_SECRET` in frontend variables or source control.

**Remaining production integration:** forgot-password links are development-only and are not emailed. The production endpoint now fails closed with 503 instead of logging reset tokens. Configure and test a mail delivery provider before enabling hosted password resets. Do not reuse the current local JWT secret in production. A JWT was found in the tracked cookie artifact and removed from the working file; if this repository or secret was shared, rotate the affected JWT secret and remove the token from any published Git history.

The sidebar now links only to implemented pages. Planned page routes remain in the router and still show their explicit “will be built” message; the Kitchen Inventory feature was not added.
