import type { StackGroup } from "./types";

/**
 * The stack, assembled from evidence rather than from memory.
 *
 * Every entry below was taken from a dependency manifest in one of the public
 * repositories — `pramana/pyproject.toml`, `raksha-ai`, `charkha`,
 * `AURA-GUARD`, `complylite`, `genex-prj/backend/package.json` — or from the profile README's own stack block.
 *
 * Grouped by what the tool is for, not by language, so a reader can find the
 * part of the stack they care about without reading all of it.
 */
export const stack: StackGroup[] = [
  {
    label: "Languages",
    items: ["Python", "TypeScript", "JavaScript", "Rust", "Kotlin", "Solidity", "SQL", "Java"],
  },
  {
    label: "Agent systems",
    items: [
      "Task-DAG orchestration",
      "Multi-agent coordination",
      "LangGraph",
      "MCP servers",
      "Tool calling",
      "Typed agent contracts",
      "Human-in-the-loop gates",
      "Kill switches & budgets",
    ],
  },
  {
    label: "AI & LLMs",
    items: [
      "Anthropic SDK",
      "OpenAI SDK",
      "Gemini",
      "Groq",
      "RAG over pgvector",
      "Local embeddings",
      "sentence-transformers",
      "faster-whisper",
      "Context engineering",
    ],
  },
  {
    label: "Machine learning",
    items: [
      "TensorFlow CNNs",
      "scikit-learn",
      "librosa",
      "NumPy",
      "SciPy",
      "Pandas",
      "NLP & sentiment",
    ],
  },
  {
    label: "Evaluation",
    items: [
      "Harbor",
      "Terminal-Bench",
      "Container-isolated tasks",
      "Digest pinning",
      "Verifier design",
      "Oracle / no-op / sabotage proofs",
    ],
  },
  {
    label: "Backend",
    items: [
      "FastAPI",
      "Uvicorn",
      "Gunicorn",
      "Fastify",
      "Express",
      "Node.js",
      "Celery",
      "Redis",
      "Socket.IO",
    ],
  },
  {
    label: "Data",
    items: [
      "PostgreSQL",
      "pgvector",
      "Supabase",
      "DuckDB",
      "SQLite",
      "Sequelize",
      "Mongoose",
      "Owned migrations",
      "Row-level security",
    ],
  },
  {
    label: "Security",
    items: [
      "Policy-as-code",
      "SD-JWT & delegation chains",
      "PyNaCl",
      "JWT & bcrypt",
      "Helmet, HPP, XSS hardening",
      "Rate limiting",
      "Threat modelling",
      "Hash-chained audit records",
      "Commit-pinned supply chain",
    ],
  },
  {
    label: "Blockchain",
    items: [
      "Hardhat",
      "Hardhat Ignition",
      "OpenZeppelin",
      "ethers.js v6",
      "web3.py",
      "IPFS",
      "MetaMask",
      "Polygon Amoy",
      "Ethereum Sepolia",
    ],
  },
  {
    label: "Frontend",
    items: [
      "React 19",
      "Next.js 15",
      "Vite",
      "Tailwind",
      "GSAP ScrollTrigger",
      "Framer Motion",
      "TanStack Router",
      "React Native",
      "Android",
    ],
  },
  {
    label: "Quality",
    items: [
      "pytest",
      "Vitest",
      "Jest",
      "supertest",
      "ruff",
      "mypy",
      "ESLint boundaries",
      "TypeScript strict",
      "Zod contracts",
    ],
  },
  {
    label: "Ops",
    items: [
      "Docker Compose",
      "GitHub Actions",
      "pnpm workspaces",
      "Turborepo",
      "Vercel",
      "Railway & Render",
      "Caddy",
      "R8",
      "Signed release builds",
    ],
  },
];
