---
name: public-apis-news-flash-monitor-creator
description: Build scheduled API monitors that poll documented data sources, preserve raw evidence, summarize each monitoring window with an LLM, validate strict JSON output, render a readable briefing, and optionally notify the user with a click-to-open artifact.
---

# API Monitoring Briefings

Use this skill when building a small monitor that periodically reads an API and turns the latest observation window into a structured briefing.

## Mental Model

A useful monitor has six boundaries:

1. **Collector**: calls one documented API operation and writes the raw response.
2. **Window**: groups one or more polls into the period the model should summarize.
3. **Reducer**: selects the fields the model needs and removes noisy payload bulk.
4. **Summarizer**: asks an LLM to output only a predefined JSON object.
5. **Validator**: rejects malformed, incomplete, or unsupported JSON before publishing.
6. **Presenter**: renders the accepted JSON to a human-readable artifact and notifies the user.

Do not merge these boundaries unless the monitor is throwaway. Separate boundaries make failures inspectable.

## Development Flow

1. Define the monitoring question in one sentence: “What changed, why does it matter, and what should be watched next?”
2. Pick an API operation with stable docs, no scraping, and predictable rate limits.
3. Capture one successful response and one failure response; save both as examples.
4. Normalize each poll into a small record: `collected_at`, `operation`, `query`, `ok`, `items`, `pagination`, `error`.
5. Append poll records to JSONL; never overwrite the raw window.
6. Draft the final JSON schema before writing the prompt.
7. Prompt the model to use only the JSONL input, output only JSON, and choose `complete`, `insufficient_data`, or `needs_more_cycles`.
8. Validate required fields, enums, array sizes, and non-empty strings in local code.
9. On validation failure, retry with the exact validation errors; stop after a fixed attempt limit.
10. Render accepted JSON into a durable artifact such as TXT or Markdown.
11. Notify only after validation and rendering succeed.
12. Run the full chain from a clean shell and inspect generated raw data, JSON, rendered text, and notification behavior.

## JSON Contract

Use a result shape like this unless the domain needs different fields:

```json
{
  "status": "complete | insufficient_data | needs_more_cycles",
  "headline": "short briefing title",
  "briefing_time": "ISO-8601 time or source time",
  "source_operation": "provider.operation",
  "items": [
    {
      "title": "source item title",
      "source": "publisher or API source",
      "published_at": "source timestamp",
      "summary": "one factual sentence",
      "why_it_matters": "one impact sentence",
      "url": "canonical source URL if available"
    }
  ],
  "watchlist": ["specific follow-up item"],
  "next_action": "what the next monitoring cycle should check"
}
```

Rules:

- `complete` requires enough items to answer the monitoring question.
- `insufficient_data` means the API returned too little, failed, or produced unusable data.
- `needs_more_cycles` means one window is valid but trend detection needs later polls.
- Every published item must trace to raw input.
- Do not publish model output that fails schema validation.

## Prompt Requirements

The summarizer prompt must state:

- the role: domain briefing editor;
- the source: raw API poll records in JSON or JSONL;
- the scope: use only the input, no invented facts, no tools;
- the output: JSON only, no Markdown;
- the schema: include required fields and enum values;
- the ranking rule: how many items to select and why;
- the fallback states: when to return `insufficient_data` or `needs_more_cycles`.

Keep the prompt domain-specific but short. Put changing data in the input, not in the instructions.

## Runtime Rules

- Inherit credentials from the caller environment; never hard-code keys, tokens, or private endpoints.
- If a shell bridge maps variables, map only existing values, such as `LITELLM_MASTER_KEY` to `ANTHROPIC_API_KEY`.
- Export variables that already exist before spawning child processes; non-exported shell variables do not reach Node, Python, or CLI children.
- Log credential presence only as `set` or `unset`; never print values.
- Set timeouts for API calls and LLM calls.
- Treat non-JSON API responses, empty arrays, and rate limits as data records with `ok: false`, not as invisible failures.
- Make generated `data/` and `summary/` directories ignored by version control unless the user explicitly asks to keep samples.

## Notification Rules

- Prefer notifications that open a generated artifact, not transient text.
- On macOS, use `terminal-notifier -execute "/usr/bin/open '<txt-path>'"` for click-to-open behavior.
- Do not auto-open the artifact by default; users can click the notification.
- Use a stable group only when replacing older notifications is intended; use a unique group when testing visibility.
- If no clickable notifier exists, print the artifact path and document the limitation.

## Adapting To A New API

Change only these parts first:

1. API command or client call.
2. Query parameters and schedule.
3. Normalizer from source response to compact poll record.
4. Domain-specific ranking rule in the prompt.
5. JSON schema fields if the briefing needs different evidence.
6. Renderer labels and notification title.

Keep the collector-window-summarizer-validator-presenter structure unchanged until the first end-to-end run succeeds.

## Failure Checklist

- No LLM response: check exported credentials and CLI login state.
- LLM says not logged in: inspect the child process environment, not only the interactive shell.
- API returns HTML or text: record `ok: false` with the parse error and retry later.
- JSON validation fails: feed validation errors into the next attempt.
- Notification does not appear: send a unique-group test notification and check OS notification permissions.
- Notification appears but click does nothing: verify the artifact path is converted to a `file://` URL.

## Included Template

`template/*-flash/` contains runnable provider examples. Treat them as sample code, not as the only supported domains.
