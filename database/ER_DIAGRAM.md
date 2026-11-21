# SunShield database relationships

```mermaid
erDiagram
  SAFE_ZONES ||--o{ SAFE_ZONE_REPORTS : receives
  ORGANIZATIONS ||--o{ WORKSITES : owns
  SAFE_ZONES {
    uuid id PK
    safe_zone_category category
    verification_status verification_status
    availability_status availability_status
  }
  SAFE_ZONE_REPORTS {
    uuid id PK
    uuid safe_zone_id FK
    availability_status availability_status
  }
  ORGANIZATIONS {
    uuid id PK
    organization_type organization_type
  }
  WORKSITES {
    uuid id PK
    uuid organization_id FK
    workload workload
  }
```

Every relationship is one-to-many and each child has one required parent. Deleting a SafeZone cascades to its reports. Organizations with worksites cannot be deleted (`RESTRICT`). Both foreign keys cascade parent key updates. No worker account or weather history relationship is stored.
