# Skill-Bridge 
**Bridge the Gap Between Talent and Collaboration**

[![Live MVP](https://img.shields.io/badge/Live-MVP-brightgreen)](https://dev-skill-bridge.netlify.app/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/Aryan-44/Skill-Bridge)

Skill-Bridge is an AI-powered networking platform developed by **Team ARJUNA** for the GDG on Campus TechSprint. It solves the "Quality & Connection" gap in hackathons by using evidence-based verification to connect developers.

##  The Problem
Traditional networking platforms rely on self-proclaimed keywords and static profiles. This makes it difficult to verify if a potential partner actually possesses the practical depth required for a high-stakes project, leading to "profile roulette" during team formation.

##  The Solution
Skill-Bridge replaces "claimed skills" with **demonstrated expertise**. By analyzing raw evidence like resumes, technical papers, and code files, the platform extracts implicit skills and assigns a **Complexity Score (1-10)** to quantify user expertise accurately.

##  Key Features
* **AI-Driven Skill Extraction:** Uses **Gemini 1.5 Pro** to analyze documents and verify technical depth.
* **Semantic Matching:** Uses vector embeddings and Cosine Similarity to match you with teammates based on project goals, not just tags.
* **Agentic Development:** Integrated with **Google Antigravity** to deploy AI agents that help in brainstorming and rapid application scaffolding.
* **Integrated Collaboration:** Built-in instant messaging and group video calls to transition from "matching" to "building" instantly.
* **Vertical Knowledge Feed (Upcoming):** A distraction-free feed for technical architecture breakdowns and project post-mortems from winning teams.

##  Tech Stack
* **Frontend:** React, Tailwind CSS, Netlify
* **Backend:** Python (FastAPI), Node.js, Firebase Firestore
* **AI Integration:** Google Generative AI SDK (Gemini 1.5 Pro), Google Antigravity
* **Database:** Firebase (User profiles, chat data, and skill embeddings)

##  Architecture
1.  **Ingestion:** Users upload evidence (PDF/Code).
2.  **Analysis:** FastAPI backend sends data to Gemini 1.5 for skill extraction and scoring.
3.  **Storage:** Embeddings are stored in Firestore for real-time retrieval.
4.  **Matching:** Semantic search identifies compatible partners based on technical complexity.

##  Getting Started

1.  **Clone the Repo:**
    ```bash
    git clone [https://github.com/Aryan-44/Skill-Bridge.git](https://github.com/Aryan-44/Skill-Bridge.git)
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Configure Environment:**
    Add your `GEMINI_API_KEY` and Firebase credentials to a `.env` file.
4.  **Run Locally:**
    ```bash
    npm run dev
    ```

## 👥 Team ARJUNA
* **Project Link:** [Skill-Bridge MVP](https://dev-skill-bridge.netlify.app/)

---
*Built for GDG on Campus - TechSprint*
