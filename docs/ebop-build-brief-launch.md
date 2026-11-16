# Build Brief: Ebop, Launch release

From: The Tinkerer (Engineering lead), Nov 15, 2026. Builder-agnostic: works for Claude Code or Base44. Recommended builder for Ebop itself: Claude Code (Ebop runs on its own infrastructure).

Files that come with this brief:
- `ebop-design-tokens.json`: colors (light "Spark Workshop" and dark "Night Shift"), type, spacing, radius.
- `ebop-wordmark.svg`: placeholder wordmark. The real logo comes later from a hired designer.

## 1. What Ebop is

Ebop is an AI project studio. Plan it. Build it. Run it. It's all here. Tagline: From spark to running.

Users bring an idea (or something they run) and work through phases with a team of AI experts. Every decision is recorded, approved in small batches, and kept with its reason. App projects leave as a Build Brief for an outside builder.

Mission: transform AI from a chronological conversation tool into a persistent, organized, visually navigable environment for developing ideas and completing real projects.

## 2. Launch scope (build these)

- **Sign up and log in.** The data promise shows on the signup screen: "Your projects are yours. Export them anytime, delete them anytime. We never sell them or train on them."
- **Home (dashboard).** One thing for today at the top (with "Why this one", "Pick a different one", Up next collapsed), then a card per project (name, plan-shape tag, 5-segment phase bar, status line, "N for you" count).
- **First session (15 minutes or less).** Pick a starting point (Start with an idea · Start with something I run · Start from Claude · Show me an example first) → meet the team (Strategist intro, pick by 2x2 or quiz, skip gives a default) → three questions (what it is, who it's for, what done looks like) with sample answers → first Checkpoint batch → project card on Home.
- **Project view.** Phase rail (Define, Plan, Build, Launch, Live; Launch and Live shown as previews only at this release) with three tabs per phase: Session (chat with the phase's expert, swap control in the header), Board (decisions Locked/Open/Parked, tasks, decision log), Panel.
- **Checkpoints.** Batches of 3 to 5 related decisions; each item can be approved, changed, or asked about; "Approve set" approves a batch; big or guardrail decisions come one at a time; batches pausable; a half-done batch becomes One thing for today.
- **Phase wrap.** Review of every decision with its author, open items flagged, preview of the next phase; the user taps "Open <next phase>". Outgoing expert writes a handoff note on the Board; new expert opens with a one-line recap.
- **Expert team.** Strategist, Designer, Engineer, four experts each on a Warmth (Warm/Candid) x Pace (Deep/Quick) matrix. Same quality of advice; personality changes tone and length only. Swap anytime; the new expert picks up the full history.
  - Strategist: The Coach (warm, deep) · The Champion (warm, quick) · The Analyst (candid, deep) · The Straight Shooter (candid, quick)
  - Designer: The Guide (warm, deep) · The Rapid Prototyper (warm, quick) · The Curator (candid, deep) · The Editor (candid, quick)
  - Engineer: The Mentor (warm, deep) · The Tinkerer (warm, quick) · The Architect (candid, deep) · The Pragmatist (candid, quick)
- **Simulated panel.** 30 fictional panelists with fixed quadrants (8/8/7/7: Teacher warm-deep, Spark warm-quick, Inspector candid-deep, Closer candid-quick), persona-fit tags by plan shape, skeptics in every quadrant. A draw = 5 (one per quadrant + a wild card, at least one skeptic or outside voice). Every panelist always labeled fictional. Panelists are fictional strangers with no ties to each other or to real people.
- **Build Brief export** (Build phase, app plans): a markdown document of the locked plan, ready to paste into a builder. Operations plans get a simple task list and schedule at this release.
- **Start from Claude import.** User uploads a Claude data export (conversation data; files not included; exports run from Claude web or desktop only). Strategist drafts decisions with a source line on each; user confirms in one checkpoint; "Your instructions" saved in project settings.
- **Account.** Export my data, delete my data, "How we handle your data" page.
- **Themes.** Light and dark from the design tokens; follows the device setting with a manual toggle.

## 3. Not in this release (designed, built later, in this order)

- Next release: Live (digest on open, one-tap act/park/dismiss, Google Calendar first, operations plans first).
- After that: Versions (copies, release, rollback), practice area with simulated customers, quick-fix lane.
- Parked: gamification (badges, favorites), "Made in Ebop" gallery, scheduled notifications, multi-user teams.

## 4. Rules the app enforces (shown to users as written)

- Phases go in order. You open the next one when you're ready.
- Finished phases are always one tap away (read-only).
- Locked decisions stay put until you reopen them, and you'll see what a change touches first.
- New ideas get parked for the phase where they fit.
- A project can't be closed with unfinished tasks or decisions.
- Experts bring solutions: every issue they raise comes with a proposed fix.
- Guardrail: legal, medical, financial, tax, or safety decisions get flagged plainly with a shield icon and words, stakes explained, and questions prepared for a licensed professional. Always one at a time.

## 5. Data model (starting point; refine as needed)

- users: id, email, name, theme, created_at
- projects: id, user_id, name, plan_shape (app | operations | mixed), current_phase, status, focus_pinned, instructions, created_at
- phases: id, project_id, name (define | plan | build | launch | live), state (upcoming | open | done), opened_at, wrapped_at
- experts: id, role (strategist | designer | engineer), name, warmth (warm | candid), pace (deep | quick), sample_line, voice_prompt
- project_experts: project_id, role, expert_id, chosen_at
- messages: id, project_id, phase, expert_id, sender (user | expert), body, created_at
- decisions: id, project_id, phase, title, detail, status (locked | open | parked), parked_for_phase, author (user | expert_suggested_user_approved), source, guardrail_kind (null | legal | medical | financial | tax | safety), batch_id, reason, created_at, locked_at
- checkpoint_batches: id, project_id, phase, state (pending | paused | done), created_at
- tasks: id, project_id, phase, title, state (todo | waiting_on_you | done), due_at
- handoff_notes: id, project_id, from_phase, to_phase, locked_summary, open_summary, parked_summary
- panelists (seeded, 30 rows): id, name, quadrant (teacher | spark | inspector | closer), plan_shape_tags, skeptic, bio, always_fictional = true
- panel_rounds: id, project_id, phase, question, panelist_ids, created_at
- panel_responses: id, round_id, panelist_id, response
- build_briefs: id, project_id, version, markdown, created_at
- progress_events: id, project_id, kind (phase_completed | decision_recorded | live_update_acted), created_at. Feeds the north-star metric: projects moved forward per week.

## 6. AI behavior

- One Claude API key held by Ebop; users never supply keys.
- Experts: Claude Sonnet 5.5. Panelists, recaps, and summaries: Claude Haiku 5.5. Use prompt caching for project context.
- Each expert call gets: the expert's voice prompt, the house rule (bring solutions, frame as opportunities, sharp and concise), the guardrail rule, the project's locked decisions, open items, parked items for this phase, and recent messages.
- Experts propose decisions as structured output (title, detail, reason, guardrail_kind) so they land as Checkpoint items, never as loose chat.
- Cost target: about $0.35 to $0.40 per working session (~20 turns). Pricing: $25/month with ~25 working sessions, credits above; $15 starter tier.

## 7. Look

Paper and ink with one ember accent (#C2410C light, #FB923C dark) reserved for the one primary action per view. Blue marks "today" items in both themes. Guardrail chips are red with a shield icon and words. Bricolage Grotesque headings over Inter body text. Plan-shape tags are neutral outlines. Inline stroke icons, no emoji. All values are in `ebop-design-tokens.json`.

## 8. Build order inside this release (each step runnable on its own)

1. Sign up, create a project, Home with a project card.
2. Strategist session: three questions → first Checkpoint batch → decisions saved with authorship.
3. One thing for today with "Why this one".
4. Expert team: pickers, swap with recap.
5. Phase rail, Board, Phase wrap, handoff notes (Define → Plan → Build).
6. Panel: seed 30 panelists, draws, rounds.
7. Build Brief export; operations task list.
8. Start from Claude import.
9. Account: export, delete, data page. Themes.

## 9. Done means (acceptance)

- A new user finishes the first session in 15 minutes or less and lands on Home with a project and One thing for today.
- Scoop NYC can be run from Define to a Build Brief entirely inside Ebop.
- Every decision shows its author and reason; every guardrail item shows the shield and comes alone.
- Every panelist appears labeled fictional.
- Works on a phone (390px wide) and desktop; tap targets 44px minimum; text contrast 4.5:1 in both themes.
- Export and delete work and match the data promise.

## 10. Open questions for the builder

- Hosting and auth choice if not using the recommended stack (Next.js, Supabase, Vercel, Claude API).
- Every claim on "How we handle your data": verify before Launch.
