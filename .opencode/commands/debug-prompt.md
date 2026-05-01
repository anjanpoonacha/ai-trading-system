---
description: Debug OpenCode by running with --print-logs
agent: general
subtask: true
---

<instructions>
<task>Debug an OpenCode prompt by running it with `opencode run --print-logs` and analyzing the output for issues.</task>

<context>
Run the following command and analyze the logs:

!`opencode run --print-logs "$ARGUMENTS" 2>&1 | tail -200`
</context>

<requirements>
<requirement>Execute the prompt via `opencode run --print-logs` to capture full debug output</requirement>
<requirement>Analyze the logs for errors, tool failures, model issues, or unexpected behavior</requirement>
<requirement>Identify the root cause of any failures or unexpected output</requirement>
<requirement>Suggest fixes or workarounds if issues are found</requirement>
</requirements>

<output_format>
1. Command executed
2. Summary of what happened (success/failure)
3. Key log entries (errors, warnings, tool calls)
4. Root cause analysis (if issues found)
5. Suggested fix
</output_format>
</instructions>
