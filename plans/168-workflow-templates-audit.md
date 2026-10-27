# Plan 168: Workflow Editor templates audit and delivery plans

These catalog entries entered parity scope on 2026-10-26. Both are currently G in every host:

- "Workflow Editor" (https://reactflow.dev/ui/templates/workflow-editor);
- "AI Workflow Editor" (https://reactflow.dev/ui/templates/ai-workflow-editor).

This plan is research only. Do not change product code.

1. Read both template pages, their live demos and their public source repositories, if any. Record the URLs and access dates.
2. List the user-visible outcomes of each template, for example:
   - the node palette and drag-to-add;
   - typed node configuration panels;
   - validation;
   - running or simulating a workflow, with per-node status;
   - layout;
   - the AI-specific parts, such as model and prompt nodes or streaming output.
3. Rate each outcome C, P or G in each host against current Flow, citing `path:line`. Many building blocks already exist:
   - history and the clipboard;
   - grouping and layout;
   - animation and shapes;
   - routing and collaboration;
   - the UI catalog components.
4. Write `plans/168-workflow-delivery.md`, ordered by dependency, with units of one page or less. Each unit gives:
   - the shared core;
   - the per-host work;
   - the acceptance tests;
   - the maintainer decisions it needs, each with a recommendation.

   Flag any external service the AI template needs, such as an LLM API. Recommend a mock or provider-agnostic boundary that is safe to test offline, and don't call real APIs.

5. Write the ratings into the catalog entries with `reaudit` records.

## Execution

- Only ADD to `verification.config.json`; never remove or narrow anything.
- Run `docs:check` and the catalog checks, then finish with the locked `bun run verify`.
- Commit on `plan/168-workflow-audit` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.
