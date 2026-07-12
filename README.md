# Credit Score Hub

Enterprise Credit Scoring Mock API for Communication Protocol Final Project

## Overview

Credit Score Hub merupakan mini project UAS Communication Protocol yang mensimulasikan proses credit scoring menggunakan REST API. Sistem mendukung pengujian API, observability, dashboard monitoring, dan simulasi error sesuai kebutuhan pembelajaran.

---

## Technology Stack

- TanStack Start
- React
- TypeScript
- REST API
- HTTP/JSON
- Postman

---

## Project Architecture

```
Browser / Postman
        │
        ▼
 REST API Server
        │
 ├── Assessment Service
 ├── Credit Score Service
 ├── Dashboard Service
 ├── Observability Service
 └── Simulation Service
        │
        ▼
Assessment Repository
(In-Memory Store)
```

---

# API Endpoints

## Business API

| Method | Endpoint | Function |
|--------|----------|----------|
| POST | `/api/assessments` | Create a new credit assessment. |
| GET | `/api/assessments` | Retrieve all assessments. |
| GET | `/api/assessments/{assessmentId}` | Retrieve assessment details. |
| PATCH | `/api/assessments/{assessmentId}/status` | Update assessment status. |
| GET | `/api/credit-scores/{assessmentId}` | Retrieve credit score result. |
| GET | `/api/dashboard` | Retrieve dashboard statistics. |

## Infrastructure API

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/api/health` | Check API health status. |
| GET | `/api/observability/logs` | Retrieve request logs and observability data. |
| GET | `/api/simulation` | View current simulation configuration. |
| POST | `/api/simulation/trigger` | Enable error simulation. |
| POST | `/api/simulation/reset` | Reset simulation to normal mode. |

---

## HTTP Status Codes

| Status | Description |
|---------|-------------|
| 200 | Request successful |
| 201 | Resource created |
| 400 | Bad Request |
| 404 | Resource Not Found |
| 429 | Rate Limit Exceeded (Simulation) |
| 500 | Internal Server Error (Simulation) |

---

## Observability

Each request generates:

- Request ID
- Correlation ID
- Timestamp
- Response Time
- HTTP Status
- HTTP Method
- Client Type
- User Agent

Logs are available via:

```
GET /api/observability/logs
```

---

## Run Project

Install dependencies

```bash
npm install
```

Run development server

```bash
npm run dev
```

Application URL

```
http://localhost:8080
```

---

## Repository Structure

```
Credit_Score-Hub/
│
├── app/
├── docs/
│   ├── architecture.png
│   ├── data-flow.png
│   ├── laporan-uas.pdf
│   └── slides-uas.pdf
│
├── postman/
│   ├── CreditScoreHub.postman_collection.json
│   └── CreditScoreHub.postman_environment.json
│
├── evidence/
│   ├── success-01.png
│   ├── success-02.png
│   ├── failure-01.png
│   ├── failure-02.png
│   ├── observability-log.png
│   └── wireshark-capture.png
│
└── README.md
```

---

## Author

**M. Maulana Khaerul Anam**

NIM: **25120500032**

Program Studi Sains Data Profesional

Universitas Cakrawala

---

## Academic Purpose

This repository was developed for the Final Project of the Communication Protocol course at Universitas Cakrawala.
