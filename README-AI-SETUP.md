# StudyMate AI – Real AI Assistant

## Project structure
- Existing frontend modules are preserved.
- `backend/` contains the secure Express API.
- `js/ai-assistant.js` connects the chat UI to the backend.
- The OpenAI API key is stored only in `backend/.env`.

## Setup (Windows PowerShell)

### 1. Configure backend
```powershell
cd StudyMate-AI\backend
npm install
Copy-Item .env.example .env
notepad .env
```
In `.env`, replace `your_api_key_here` with your own API key. Never put the key in `index.html` or any file inside the frontend.

### 2. Start backend
```powershell
npm run dev
```
Backend runs at `http://localhost:5000`.

Check `http://localhost:5000/api/health`. It should return `{"status":"ok","configured":true}` after the key is configured.

### 3. Start frontend
Open a second terminal:
```powershell
cd StudyMate-AI
npx http-server -p 5500
```
Open `http://127.0.0.1:5500`.
You can also use VS Code Live Server on port 5500. The backend CORS allowlist includes localhost/127.0.0.1 ports 5500 and 5173.

## Notes
- The AI API requires an API key and may incur usage charges under the provider account.
- API access and model availability depend on the API account.
- Chat history is stored in this browser's localStorage.
- This starter has basic origin restrictions, request-size limits, rate limiting, and input validation. For a public deployment, add user authentication, HTTPS, per-user quotas, and persistent server-side conversation storage.
