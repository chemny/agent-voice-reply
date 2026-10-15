# Agent Voice Reply

English | [中文](./README.zh.md)

## Overview

Agent Voice Reply brings seamless, ambient two-way voice feedback to AI coding agents. It enables Antigravity, Codex, and Claude Code to speak naturally: acknowledging your request the instant you press Enter, and delivering a concise, decision-first spoken summary when execution finishes — freeing your eyes from babysitting terminal or IDE screens.

## Preview

![Agent Voice Reply Workflow Overview](./assets/workflow-overview.png)
Two-way ambient voice interaction: instant opening cue when you submit, and a decision-first spoken summary when the task finishes.

## Features

| Capability | What It Helps You Do |
|---|---|
| Instant Opening Cue | Receive immediate spoken confirmation ("On it", "Let me look") with zero delay using pre-cached audio. |
| Decision-First Spoken Summary | Hear what requires your approval or choice first, transforming one-way notifications into an interactive loop. |
| Native Multi-Runtime Support | Natively compatible with Antigravity, Codex, and Claude Code under unified configuration. |
| Automatic Bilingual Adaptation | Automatically follows message and reply languages, or locks to your preferred English/Chinese voices. |
| Subagent Silence Isolation | Accurately identifies root user interactions, keeping parallel subagents and tool runs completely silent. |
| Distinct Persona Voices | Distinguish clients by ear: Codex defaults to female voice, Antigravity and Claude Code default to male voice, fully customizable in `~/.voice-reply/config.json`. |
| Automated Rules Distribution | One-click sync of unified rules (Voice reply, Git push safety, No hypophora / conclusion-first) to Antigravity, Codex, and Claude Code. |

## Installation

### Requirements

Only basic Node.js and Python runtimes are required before starting. Your installing Agent will help verify and fill gaps.

| Item | Requirement |
|---|---|
| Agent Client | Antigravity, Codex, or Claude Code (natively verified) |
| Core Runtime | Node.js ≥ 18, Python ≥ 3.9 |
| Audio Player | Native `afplay` on macOS; `ffplay`, `mpv`, or `mpg123` on Linux/Windows |
| TTS Engine | Edge TTS (automatically isolated in dedicated project `.venv`) |

### Quick Installation

Open your agent client and paste the following request to complete installation and registration:

```text
Install this Skill: https://github.com/chemny/agent-voice-reply
Check the basic environment and prepare anything missing first, then install and verify it works. Set up optional features when I need them.
```

Upon installation, your agent registers lifecycle hooks and runs `doctor.mjs` to verify end-to-end sound playback.

## Quick Start

Send any daily coding task or question in your supported agent client:

```text
Inspect the test suites in the current directory and fix any failing unit tests
```

The client will immediately speak an opening confirmation, perform the requested task, and verbally summarize the outcome when finished.

## Usage Examples

### Decision-First Approval

```text
Refactor the authentication module with breaking database migrations
```

When finished, the agent verbally speaks: *"Done. Need your confirmation to apply the database migration now."*

### Multi-Agent Coordination

```text
Launch two subagents in parallel to evaluate Plan A and Plan B performance benchmarks
```

All intermediate subagent runs remain completely silent. The root agent speaks the comparison conclusion once aggregated.

## How It Works

The project uses lightweight lifecycle hooks to intercept start/finish checkpoints, combining local cache with Edge TTS for instant audio delivery:

| Component | Path / Configuration | Responsibility |
|---|---|---|
| Antigravity Adapter | `scripts/antigravity-hook.mjs` | Listens on `PreInvocation` for opening cues and `Stop` for final voice markers. |
| Codex Adapter | `scripts/codex-hook.mjs` | Listens on `UserPromptSubmit` and `Stop` for terminal and desktop events. |
| Claude Code Adapter | `scripts/claude-hook.mjs` | Hooks into session lifecycle to extract final spoken markers. |
| Core Opening Engine | `scripts/opening.mjs` | Intent classification, language detection, and pre-cached MP3 management. |
| Playback & Synthesis | `scripts/speak.mjs` | Edge TTS scheduling, concurrency lock, and cross-platform player spawning. |
| System Diagnostics | `scripts/doctor.mjs` | End-to-end health check for runtime, dependencies, voices, cache, and hooks. |

## Repository Structure

```text
agent-voice-reply/
├── assets/
│   └── workflow-overview.png  # Workflow and architectural illustration banner
├── scripts/
│   ├── antigravity-hook.mjs   # Antigravity lifecycle hook adapter
│   ├── codex-hook.mjs         # Codex lifecycle hook adapter
│   ├── claude-hook.mjs        # Claude Code lifecycle hook adapter
│   ├── speak.mjs              # TTS synthesis and cross-platform player runner
│   ├── opening.mjs            # Opening classifier and multilingual logic
│   ├── manage-hooks.mjs       # Idempotent hook registration across agents
│   └── doctor.mjs             # Diagnostic tool for environments and playback
├── adapters/                  # Experimental adapters for OpenClaw and Hermes
├── rules/                     # Unified multi-agent collaboration and safety rules template
│   └── agent-rules.md
├── SKILL.md                   # Agent skill specification definition
├── setup.sh                   # One-command initialization script
├── test.sh                    # Automated regression test suite
└── LICENSE                    # Apache 2.0 License
```

## License

This project is licensed under the Apache 2.0 License. See [LICENSE](./LICENSE) for details.

## About Me

Neo Chen ([@chemny](https://github.com/chemny)) — Passionate about AI Agents, developer productivity tools, and agentic workflows. Feel free to open an issue or pull request on GitHub!
