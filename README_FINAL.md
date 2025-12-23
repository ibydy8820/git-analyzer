# 🤖 GitHub Repository Analyzer

> AI-powered analysis tool for GitHub repositories. Helps founders and developers grow their projects with actionable recommendations.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

---

## ✨ Features

### Core Functionality
- 📦 **ZIP File Upload** - Analyze local projects without GitHub
- 🐙 **GitHub Integration** - Direct repository analysis via URL
- 🤖 **AI Analysis** - Powered by Claude Opus 4.5
- ❓ **Smart Questions** - AI asks clarifying questions when needed
- 💬 **Follow-up Chat** - Continue conversation after analysis
- 📊 **Task Tracking** - Weekly tasks with progress tracking
- 🌍 **Multilingual** - Russian & English support

### Advanced Features
- 📈 **Project Timeline** - Track evolution over weeks
- 🎯 **Snapshot System** - Week-by-week progress comparison
- 🗨️ **Task Assistant** - AI chat for each specific task
- 📄 **Export** - Download analysis as Markdown
- 🔄 **Refresh Analysis** - Re-analyze with updated context
- 📡 **REST API** - Programmatic access

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/git-analyzer.git
cd git-analyzer
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgres://..."
NEXTAUTH_SECRET="<random-32-chars>"
NEXTAUTH_URL="http://localhost:3000"
GITHUB_ID="<github-oauth-client-id>"
GITHUB_SECRET="<github-oauth-secret>"
OPENROUTER_API_KEY="sk-or-..."
API_SECRET_KEY="<random-hex>"
```

### 3. Setup Database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📡 REST API

### Analyze Repository

```bash
POST /api/v1/analyze
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "repo_url": "https://github.com/username/repo",
  "project_description": "My awesome project",
  "language": "ru"
}
```

### Analyze with Files

```bash
POST /api/v1/analyze
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "files": [
    {"path": "src/index.js", "content": "..."}
  ],
  "project_description": "My project",
  "language": "en"
}
```

**Response:**

```json
{
  "success": true,
  "analysis": {
    "projectSummary": "...",
    "detectedStage": "mvp",
    "tasks": [...],
    "issues": [...],
    "strengths": [...]
  },
  "metadata": {
    "filesAnalyzed": 25,
    "analysisDurationMs": 8500
  }
}
```

Full API docs: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## 🎯 How It Works

1. **Upload** - Provide GitHub URL or ZIP file + project description
2. **AI Analysis** - Claude Opus analyzes code, structure, and documentation
3. **Questions** (if needed) - AI asks for clarification if data insufficient
4. **Recommendations** - Get 5 concrete weekly tasks tailored to project stage
5. **Track Progress** - Mark tasks complete, chat with AI assistant
6. **Refresh** - Weekly re-analysis with updated context

---

## 🏗️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Auth:** NextAuth.js (GitHub OAuth)
- **AI:** Claude Opus 4.5 (via OpenRouter)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

---

## 📊 Project Structure

```
git-analyzer/
├── app/
│   ├── api/              # API routes
│   │   ├── analyze/      # Main analysis endpoint
│   │   ├── upload-zip/   # ZIP file upload
│   │   ├── v1/           # REST API v1
│   │   └── ...
│   ├── dashboard/        # Main dashboard page
│   └── layout.tsx
├── components/
│   └── analyzer/         # Analysis UI components
├── lib/
│   ├── ai/              # AI logic & prompts
│   ├── github/          # GitHub API integration
│   └── utils/           # Utilities (ZIP parser, etc.)
├── prisma/
│   └── schema.prisma    # Database schema
└── types/               # TypeScript types
```

---

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase connection string |
| `NEXTAUTH_SECRET` | Random secret for auth |
| `NEXTAUTH_URL` | App URL (http://localhost:3000) |
| `GITHUB_ID` | GitHub OAuth Client ID |
| `GITHUB_SECRET` | GitHub OAuth Client Secret |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `API_SECRET_KEY` | REST API authentication key |

---

## 🧪 Testing

### Manual Testing

1. **GitHub URL Analysis**
   - Use: `https://github.com/octocat/Hello-World`
   - Description: "тест"
   - Should trigger clarification questions

2. **ZIP Upload**
   - Create small project ZIP
   - Upload with short description
   - Verify analysis works

3. **REST API**
   ```bash
   ./test-api.sh
   ```

---

## 📈 Scalability

**Current capacity:**
- ✅ 1-5 concurrent users: No issues
- ⚠️ 10-20 users: Possible AI rate limit delays
- ❌ 50+ users: Queue system needed

**Limits:**
- GitHub API: 5000 req/hour per user
- OpenRouter: Account-based rate limit
- ZIP files: 50MB max
- Files per analysis: 1000 max

---

## 🚧 Known Limitations

1. **Private Repositories:** Only accessible after GitHub OAuth login
2. **Large Repositories:** Files limited to 1MB each, 1000 files total
3. **AI Timeouts:** Analysis can take 30-40 seconds for large projects
4. **Temp Files:** Auto-cleanup requires manual cron job setup

---

## 🛠️ Development

### Run locally

```bash
npm run dev
```

### Build for production

```bash
npm run build
npm start
```

### Prisma commands

```bash
npx prisma generate    # Generate Prisma client
npx prisma db push     # Push schema to database
npx prisma studio      # Open database GUI
```

---

## 📝 License

MIT

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

---

## 📞 Support

- 📧 Email: support@example.com
- 💬 Issues: [GitHub Issues](https://github.com/YOUR_USERNAME/git-analyzer/issues)
- 📖 Docs: [Full Documentation](./docs/)

