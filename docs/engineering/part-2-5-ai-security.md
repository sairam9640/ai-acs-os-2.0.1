# AI ISP OS — Part 2.5 AI Security & Prompt Injection Defense

**Document Version:** 1.0  
**Specification:** Part 2.5 — AI + Automation Implementation Specification  
**Date:** 2026-08-23  

---

## 1. Prompt Injection Defense Matrix (Section 22 & 33)

- **Untrusted Input Boundary:** Text from incoming customer WhatsApp chats, support tickets, and technician notes is strictly encapsulated within XML data tags (`<user_message>`) and separated from system instructions.
- **Server-Side Tool Authorization:** The AI model is never the authority for permissions. The backend verifies `{ user, role, permissions, tenantId }` before executing any requested tool.
- **Secret Redaction:** Passwords, API tokens, and private cryptographic keys are scrubbed before entering model context.
