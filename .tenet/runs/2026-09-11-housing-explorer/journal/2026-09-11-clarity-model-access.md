# Clarity validation blocked by model rollout

Confidence: [scanned-not-verified]

- Job: 5d4f9926-24aa-485f-b9c8-ba0824b1eb79 (Tenet clarity validation).
- Adapter: OpenCode; configured model ollama/deepseek-v4.1-flash:cloud.
- Endpoint: https://ollama.com/v1/chat/completions.
- Result: HTTP 403, isRetryable=false, provider message: "This model is currently being rolled out and is not yet available to you. Please check back later."
- No clarity score was produced. This is an upstream access failure, not an interview-quality verdict. No implementation jobs started.
- Do not auto-retry a non-retryable rollout denial or silently switch the user's selected model. Ask whether to use a previous model temporarily or wait for access.
- Product decisions and technical approval are preserved in interview.md. Privacy preference remains pending.
