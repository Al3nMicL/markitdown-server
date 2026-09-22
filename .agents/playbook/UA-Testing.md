---
Purpose: This document is a user-run checklist for manual acceptance follow-up after the POC validation steps pass.
---

# USER ACCEPTANCE TESTING CHECKLIST

This checklist is for the user to complete independently. It is not an agent responsibility.

## 1. Browser smoke test checklist

- [ ] Open `http://127.0.0.1:3000`
- [ ] Upload a supported sample file
- [ ] Submit conversion and confirm download or rendered success state
- [ ] Confirm the UI shows a clear error for empty submission
- [ ] Confirm the UI remains responsive across repeated submissions

## 2. User acceptance checklist

Confirm the following once the local POC is working:

- [ ] The upload flow is understandable without developer assistance
- [ ] The returned Markdown is usable for the intended downstream workflow
- [ ] The visible error messages are actionable enough for retry or correction
- [ ] The delivered implementation matches the agreed project scope
