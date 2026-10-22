# Scholaris — Research Paper Recommendation System Backend

A modular, production-grade Python FastAPI backend powering hybrid research paper recommendations. Combines **TF-IDF Content-Based Filtering**, **Interaction-Driven Collaborative Filtering**, and **SciPy Spearman Rank Correlation** evaluation.

---

## Architecture Overview

```text
backend/
├── main.py                     # FastAPI application entrypoint, lifespan, CORS, and routing
├── requirements.txt            # Python dependencies
├── .env.example                # Environment variable template
├── README.md                   # Setup, architecture, and API documentation
│
├── api/                        # REST API Routers
│   ├── __init__.py
│   ├── papers.py               # GET /api/papers, GET /api/papers/{id}
│   ├── recommendations.py      # POST /api/recommendations, GET /api/users/{id}/recommendations
│   └── interactions.py         # POST /api/interactions, GET /api/users/{id}/saved
│
├── models/                     # Pydantic Schemas & Data Contracts
│   ├── __init__.py
│   └── schemas.py              # Request/Response validation schemas
│
├── services/                   # Core Recommendation Engine Services
│   ├── __init__.py
│   ├── paper_service.py        # CSV dataset loading, parsing, and in-memory indexing
│   ├── content_based.py        # TF-IDF vectorization & Cosine Similarity recommender
│   ├── collaborative.py        # User interaction matrix & collaborative affinity model
│   ├── hybrid.py               # Configurable weighted hybrid recommender
│   └── ranking.py              # SciPy Spearman Rank Correlation evaluation
│
├── data/                       # Datasets
│   └── papers.csv              # Research papers corpus (id, title, authors, abstract, year, etc.)
│
└── utils/                      # Utilities
    ├── __init__.py
    └── preprocessing.py        # Text normalization, token weighting, and document assembly
```

---

## Tech Stack

- **Python 3.10+**
- **FastAPI** — High-performance asynchronous REST API framework
- **pandas** — High-throughput CSV dataset manipulation
- **NumPy** — Vector math and matrix operations
- **scikit-learn** — TF-IDF vectorization (`TfidfVectorizer`) and Cosine Similarity
- **SciPy** — Spearman Rank Correlation analysis (`scipy.stats.spearmanr`)
- **Uvicorn** — Lightning-fast ASGI web server
- **Pydantic v2** — Data validation and JSON schema enforcement

---

## Quickstart & Running the Backend

### 1. Prerequisites
Ensure Python 3.10 or higher is installed:
```bash
python3 --version
```

### 2. Navigate to Backend Directory
```bash
cd backend
```

### 3. Create & Activate a Virtual Environment
```bash
# On Linux / macOS:
python3 -m venv venv
source venv/bin/activate

# On Windows:
python -m venv venv
venv\Scripts\activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
HOST=0.0.0.0
PORT=8000
FRONTEND_ORIGIN=http://localhost:3000,http://localhost:5173
PAPERS_CSV_PATH=data/papers.csv
DEFAULT_CONTENT_WEIGHT=0.7
DEFAULT_COLLABORATIVE_WEIGHT=0.3
```

### 6. Run the Uvicorn Development Server
```bash
uvicorn main:app --reload --port 8000
```
The server will start at `http://localhost:8000`.
Interactive Swagger UI documentation is available at:
👉 **`http://localhost:8000/docs`**

---

## Recommendation Pipeline Details

### 1. Content-Based Filtering (`services/content_based.py`)
- Concatenates title, abstract, keywords, and category into a single document vector per paper.
- Pre-indexes the dataset with `TfidfVectorizer(ngram_range=(1, 2), stop_words='english')` at application startup.
- Evaluates Cosine Similarity between the vectorized user query and precomputed document vectors in sub-millisecond execution time.

### 2. Collaborative Filtering (`services/collaborative.py`)
- Tracks user interaction events with customizable affinity weights:
  - `view`: Weight `1.0`
  - `like`: Weight `2.5`
  - `save`: Weight `4.0`
- Calculates user-item and item-item interaction affinity using cosine distance over interaction vectors.
- Handles cold start gracefully by blending global peer reading popularity when user interaction history is sparse.

### 3. Hybrid Recommendation Engine (`services/hybrid.py`)
- Merges content-based and collaborative scores using a configurable linear combination:
  $$\text{final\_score} = (\alpha \times \text{content\_score}) + ((1 - \alpha) \times \text{collaborative\_score})$$
- Default weights: $\alpha = 0.7$, $1 - \alpha = 0.3$ (configurable via `.env` or dynamically per request).
- Generates a human-interpretable *"Why this paper?"* explanation for each recommendation.

### 4. Spearman Rank Correlation (`services/ranking.py`)
- Employs `scipy.stats.spearmanr` to compute the rank correlation coefficient $\rho$ and p-value between the content-based ranking vector and the collaborative ranking vector.
- Provides scientific insight into whether both algorithms reinforce the same literature or if collaborative signals successfully surface serendipitous cross-disciplinary papers.

---

## API Endpoints Reference

### Base URL: `http://localhost:8000`

---

### 1. Get Papers
`GET /api/papers`

Query Parameters:
- `search` (string, optional): Search query matching title, abstract, keywords, or authors.
- `category` (string, optional): Filter by research discipline.
- `year` (int, optional): Filter by publication year.
- `limit` (int, optional): Maximum papers to return (default: all).

Example Response:
```json
{
  "total": 20,
  "papers": [
    {
      "id": "paper001",
      "title": "High-Performance Clinician-in-the-Loop Deep Learning for Early Multi-Organ Pathology Detection",
      "authors": ["Elena R. Vance", "Kenji Takahashi", "Marcus Holloway", "Sarah Al-Mansoor"],
      "abstract": "Automated diagnostic systems frequently suffer from domain shift...",
      "year": 2024,
      "keywords": ["machine learning", "medical diagnosis", "radiology", "computer vision"],
      "category": "Medical Diagnosis & AI",
      "url": "https://doi.org/10.1038/s41591-024-02891-x"
    }
  ]
}
```

---

### 2. Get Single Paper
`GET /api/papers/{paper_id}`

Example Response:
```json
{
  "id": "paper001",
  "title": "High-Performance Clinician-in-the-Loop Deep Learning for Early Multi-Organ Pathology Detection",
  "authors": ["Elena R. Vance", "Kenji Takahashi", "Marcus Holloway", "Sarah Al-Mansoor"],
  "abstract": "Automated diagnostic systems frequently suffer from domain shift...",
  "year": 2024,
  "keywords": ["machine learning", "medical diagnosis", "radiology"],
  "category": "Medical Diagnosis & AI",
  "url": "https://doi.org/10.1038/s41591-024-02891-x"
}
```

---

### 3. Get Recommendations
`POST /api/recommendations`

Request Body:
```json
{
  "user_id": "user123",
  "query": "machine learning for medical diagnosis",
  "limit": 10,
  "content_weight": 0.7,
  "collaborative_weight": 0.3
}
```

Response:
```json
{
  "query": "machine learning for medical diagnosis",
  "user_id": "user123",
  "recommendations": [
    {
      "paper": {
        "id": "paper001",
        "title": "High-Performance Clinician-in-the-Loop Deep Learning for Early Multi-Organ Pathology Detection",
        "authors": ["Elena R. Vance", "Kenji Takahashi", "Marcus Holloway", "Sarah Al-Mansoor"],
        "abstract": "Automated diagnostic systems frequently suffer from domain shift...",
        "year": 2024,
        "keywords": ["machine learning", "medical diagnosis", "radiology"],
        "category": "Medical Diagnosis & AI",
        "url": "https://doi.org/10.1038/s41591-024-02891-x"
      },
      "content_score": 0.9412,
      "collaborative_score": 0.8845,
      "final_score": 0.9242,
      "why_this_paper": "Recommended for you · Strong semantic similarity to \"machine learning for medical diagnosis\"."
    }
  ],
  "evaluation": {
    "spearman_correlation": 0.6842,
    "p_value": 0.0012,
    "interpretation": "Strong rank concordance: Content and collaborative engines strongly align."
  }
}
```

---

### 4. Record Interaction
`POST /api/interactions`

Request Body:
```json
{
  "user_id": "user123",
  "paper_id": "paper001",
  "interaction": "save"
}
```

Supported `interaction` types: `view`, `save`, `like`.

Response:
```json
{
  "status": "success",
  "message": "Paper 'paper001' successfully saved to library for user 'user123'.",
  "user_id": "user123",
  "paper_id": "paper001",
  "interaction": "save",
  "timestamp": "2026-10-08T04:25:00.123456+00:00"
}
```

---

### 5. Get Saved Papers
`GET /api/users/{user_id}/saved`

Response:
```json
{
  "user_id": "user123",
  "total": 1,
  "papers": [
    {
      "id": "paper001",
      "title": "High-Performance Clinician-in-the-Loop Deep Learning for Early Multi-Organ Pathology Detection",
      "authors": ["Elena R. Vance", "Kenji Takahashi"],
      "year": 2024,
      "category": "Medical Diagnosis & AI"
    }
  ]
}
```

---

### 6. Get Personalized User Recommendations
`GET /api/users/{user_id}/recommendations?limit=10`

Generates recommendations synthesized from the user's saved, liked, and viewed history.

---

### 7. Health Check
`GET /api/health`

Response:
```json
{
  "status": "healthy",
  "indexed_papers": 20,
  "hybrid_engine": "online"
}
```

---

## Frontend Integration

The existing React frontend connects to this backend with zero design modifications.

### Example React Fetch:
```typescript
const BACKEND_BASE_URL = 'http://localhost:8000';

export async function fetchHybridRecommendations(query: string, userId: string = 'user123') {
  const response = await fetch(`${BACKEND_BASE_URL}/api/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      query: query,
      limit: 10,
    }),
  });
  return await response.json();
}
```
