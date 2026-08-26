# AI ISP OS — Part 3.4 Appointment Scheduling & Customer Time Slots

**Document Version:** 1.0  
**Specification:** Part 3.4 — Field Operations & Work Orders  
**Date:** 2026-08-23  

---

## 1. Customer Appointment Slots (Section 21 & 22)

- **Time Windows:** Morning (`09:00 - 12:00`), Afternoon (`12:00 - 15:00`), Evening (`15:00 - 18:00`).
- **Conflict Prevention:** Double-booking a technician for overlapping windows is blocked server-side.
- **Automated Reminders:** WhatsApp/SMS notification sent 2 hours before scheduled arrival.
