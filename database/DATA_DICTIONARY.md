# Data dictionary

All IDs are generated UUID primary keys. Unless noted, required columns are `NOT NULL`; timestamps are `timestamptz` in UTC.

## safe_zones

| Column | Type | Nullable/default | Constraint and purpose |
|---|---|---|---|
| id | uuid | no / generated | Primary key |
| name | varchar(150) | no | Nonblank display name |
| category | safe_zone_category | no | Facility category enum |
| latitude, longitude | double precision | no | Geographic coordinates; range checks |
| address | text | no | Address/description |
| water_available, shade_available, seating_available | boolean | no / false | Reported amenities |
| opening_hours | text | yes | Free-form hours; null if unknown |
| verification_status | verification_status | no / PENDING | Moderation/demo state |
| availability_status | availability_status | no / UNKNOWN | Latest known availability; reports do not update it automatically |
| last_verified_at | timestamptz | yes | Null until genuine verification |
| created_at, updated_at | timestamptz | no / now | Record timestamps |

## safe_zone_reports

| Column | Type | Nullable/default | Constraint and purpose |
|---|---|---|---|
| id | uuid | no / generated | Primary key |
| safe_zone_id | uuid | no | FK to safe_zones; delete cascades |
| availability_status | availability_status | no | Contributor’s observation |
| comment | varchar(500) | yes | Optional bounded note |
| reporter_token_hash | varchar(255) | yes | Optional hashed abuse-control token; never store raw token |
| created_at | timestamptz | no / now | Submission time |

## organizations

| Column | Type | Nullable/default | Constraint and purpose |
|---|---|---|---|
| id | uuid | no / generated | Primary key |
| name | varchar(150) | no | Nonblank organization name |
| organization_type | organization_type | no | Employer category |
| is_demo | boolean | no / false | Marks synthetic demo data |
| created_at | timestamptz | no / now | Creation time |

## worksites

| Column | Type | Nullable/default | Constraint and purpose |
|---|---|---|---|
| id | uuid | no / generated | Primary key |
| organization_id | uuid | no | FK to organizations; delete restricted |
| name | varchar(150) | no | Nonblank site name |
| latitude, longitude | double precision | no | Coordinates with range checks |
| worker_count | integer | no | Non-negative count; demo totals must be labelled |
| workload | workload | no | Workload enum |
| water_access, shade_access | boolean | no / false | Site protections |
| work_start, work_end | time | no | Local work schedule; must differ |
| is_demo | boolean | no / false | Marks synthetic site data |
