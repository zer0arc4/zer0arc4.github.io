# zer0arc4 — Cybersecurity Portfolio

Personal cybersecurity portfolio, writeup repository, and knowledge base for **zer0arc4**.

**Live Site:** [https://zer0arc4.github.io/](https://zer0arc4.github.io/)

## Stack

- [Hugo Extended](https://gohugo.io/) — Static site generator
- **cyber-ember** theme — Custom Hugo theme
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS
- [Pagefind](https://pagefind.app/) — Static search
- [Giscus](https://giscus.app/) — GitHub Discussions comments
- [Plausible](https://plausible.io/) — Privacy-friendly analytics
- GitHub Actions — CI/CD deployment

## Quick Start

### Prerequisites

- Hugo Extended >= 0.120
- Node.js >= 20

### Local Development

```bash
npm install
hugo server -D --disableFastRender
```

Open [http://localhost:1313](http://localhost:1313)

### Production Build

```bash
npm run build
```

## Repository Setup

```
zer0arc4/zer0arc4.github.io
```

1. Push to GitHub
2. Enable **GitHub Pages** → Source: **GitHub Actions**
3. Enable **Discussions** on the repo (for Giscus)

## Before Launch Checklist

- [ ] Customize logo at `static/images/logo.svg`
- [ ] Remove `draft: true` from writeups when ready to publish

## Content Structure

```
content/
├── writeups/     → HTB, THM, Vulnyx, HackMyVM, PG, CTF
├── projects/     → Security tools and dev projects
├── activity/     → Full activity history (auto-generated)
├── notes/        → Hidden from nav, available for future use
├── certifications/
└── ...
```

## Creating Content

```bash
hugo new writeups/hackthebox/machine-name.md
hugo new projects/project-name.md
hugo new certifications/cert-name.md
```

New writeups, projects, and certifications automatically appear in the Activity Timeline.

## License

MIT — See [LICENSE](LICENSE)
