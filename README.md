# Children's Travel Scrapbook Factory

A multi-agent pipeline that turns a creative brief into a print-ready interactive activity journal for kids. One brief in → one finished scrapbook out.

The system targets editorial children's publishing aesthetics — flat geometric vector illustration, retro travel-poster influence, calm structured layouts, light cultural depth. It deliberately avoids watercolour, kawaii, clipart, and AI-looking imagery.

## How it works

```
Brief intake
  ↓
Clarifying questions → Spec draft → [HUMAN: spec lock]
  ↓
Research (Researcher + Visual Scout in parallel) → [HUMAN: research review]
  ↓
Editorial plan (Editor) → [HUMAN: plan lock]
  ↓
Copy (Copywriter) ⊕ Illustrations (Illustrator) ⊕ Layouts (Designer)
  ↓
Editor pass → revisions → [HUMAN: content lock]
  ↓
Affinity assembly (Affinity Producer)
  ↓
Final vision pass → [HUMAN: ship/no-ship]
  ↓
Export → handoff
```

Linear with explicit human checkpoints. Three middle tracks (copy, illustration, layout) run in parallel.

## Sub-agents

Seven specialists. The Editor is the conductor.

| Agent | Owns |
|---|---|
| **Editor** | narrative flow, structure, age-appropriateness, final QA |
| **Researcher** | facts, cultural notes, age-appropriate trivia, citations |
| **Visual Scout** | reference set, palette extraction, style traits to emulate / avoid |
| **Copywriter** | all on-page text — titles, captions, prompts, micro-stories |
| **Illustrator** | prompt design + Recraft generation, per-image style consistency |
| **Designer** | page layouts, grid, typography, illustration slot specs |
| **Affinity Producer** | final assembly in Affinity Publisher, PDF export |

Definitions live in `.claude/agents/`.

## Prerequisites

- [Claude Code](https://claude.com/claude-code) — the CLI runs the agents
- A [Recraft](https://recraft.ai) API key (illustration generation)
- [Affinity Publisher](https://affinity.serif.com/publisher/) (final assembly + PDF export)
- A creative brief

Copy `.env.example` to `.env` and set `RECRAFT_API_KEY`.

## Repo layout

```
.
├── CLAUDE.md             ← runtime spec for the agent (read this for the full system)
├── .claude/
│   ├── agents/           ← seven sub-agent definitions
│   └── commands/         ← skills (recraft-imagegen, affinity-design, …)
└── books/
    └── {book_slug}/
        ├── brief.md      ← original creative brief
        ├── spec.md       ← locked production spec
        ├── research/
        ├── drafts/
        ├── assets/illustrations/
        ├── production/
        └── exports/
```

## Running a book

1. Create `books/{your-slug}/` and drop `brief.md` inside it.
2. Open Claude Code in the project root.
3. Ask it to start a new book; it'll draft a spec and ask you to lock it.
4. Approve each human checkpoint as the pipeline progresses.

`CLAUDE.md` is the authoritative runtime spec — it covers the spec schema, hard rules, file conventions, and quality bar.

## Demo

`books/sunshine-coast-demo/` is the worked example: a short weekend scrapbook produced end-to-end through the pipeline. *(Currently in production — the brief lands when the active private book ships.)*

## License

TBD.
