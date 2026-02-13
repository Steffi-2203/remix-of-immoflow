# Test Report Template

## Zusammenfassung

| Metrik | Ergebnis |
|--------|----------|
| **Datum** | YYYY-MM-DD |
| **Branch** | `feature/xxx` |
| **Commit** | `abc1234` |
| **Unit Tests** | ✅ XX/XX passed |
| **Integration Tests** | ✅ XX/XX passed |
| **E2E Tests** | ✅ XX/XX passed |
| **TypeCheck** | ✅ Clean |
| **Security** | ✅ 0 Critical |

---

## Test-Ergebnisse

### Unit Tests
```
✅ Core Router: 2/2 passed
✅ Properties Router: 1/1 passed
✅ Finance Router: 2/2 passed
✅ Banking Router: 1/1 passed
...
```

### Integration Tests
```
✅ JobQueue Lifecycle: 4/4 passed
✅ Auth Flow: 3/3 passed
```

### E2E Tests
```
✅ Login + Dashboard: passed
✅ Property CRUD: passed
✅ Billing Flow: passed
```

---

## Top 10 Failures

| # | Test | Error | File | Status |
|---|------|-------|------|--------|
| 1 | — | — | — | — |

---

## Performance

### API Latenz (k6)

| Endpoint | p50 | p95 | p99 | Errors |
|----------|-----|-----|-----|--------|
| GET /api/health | ms | ms | ms | 0% |
| GET /api/properties | ms | ms | ms | 0% |
| GET /api/payments | ms | ms | ms | 0% |

### Ressourcen
- **Memory RSS**: XX MB
- **DB Connections**: XX/100
- **JobQueue Throughput**: XX jobs/min

---

## Security Findings

| # | Severity | Finding | PoC | Remediation | Status |
|---|----------|---------|-----|-------------|--------|
| 1 | — | — | — | — | — |

---

## Bug Report Template

```
Titel: [SEVERITY] Kurze Beschreibung

Umgebung:
- Branch: <branch>
- Commit: <sha>
- DB: <neon/local> (seed: yes/no)
- Node: v20

Schritte zur Reproduktion:
1. ...
2. ...
3. ...

Erwartetes Verhalten:
- ...

Tatsächliches Verhalten:
- ...

Logs / Response:
- HTTP <code> <endpoint>
- Error: <stack or message>

Screenshots / HAR / Playwright trace:
- attach

Priorität: P0/P1/P2
Zuweisung: <team>
```
