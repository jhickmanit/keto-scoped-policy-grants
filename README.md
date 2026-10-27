# Legacy RBAC to Ory Keto: hybrid model and migration transform

**Status: reference implementation.** Tenant data in `examples/` is synthetic. The earlier grant and direct-tuple
comparison is in [`legacy/`](legacy/README.md).

This repository answers a common migration question: can a generic OPA/Rego layer convert a legacy system's groups,
memberships, and role entitlements into Ory Keto relation tuples? It proposes a hybrid Ory Permission Language (OPL)
model that combines dynamic, tuple-defined roles with standard role templates fixed in the schema, and it includes a
running transform and a parity harness for that model.

## Answer

Rego can do the conversion. `rego/rbac2keto.rego` (about 350 lines) turns one org's legacy export into the tuples
the hybrid OPL expects. It expands role inclusion (R1 contains R2...), flattens nested groups, evaluates
include/exclude customer groups, expands each assignment's scope, splits standard from custom roles, and fails closed
on anything it cannot map. Thirteen `opa test` cases pass. [`docs/rego-walkthrough.md`](docs/rego-walkthrough.md)
explains the transform rule by rule.

Rego is not the hard part, and it does not make the result generic. The decisions that determine whether migrated
users keep the same access are specific to the legacy system: what its export contains, which OPL relation each
legacy permission becomes, what a scope or exclusion means, and what happens to temporary and system policies. The
tool encodes those decisions; it cannot make them. The emit rules are also tied to the target OPL's shape. A
different OPL needs different emit rules, so a converter that is generic across schemas is a product, not a
configuration.

OPA also covers only the middle of the pipeline. It has no Keto writer, no diff against tuples already in Keto, no
batching or retry, and no cutover handling. A migration still needs a loader/reconciler and a parity check against
the legacy system. Rego is a reasonable choice for the mapping step if the team already uses it; Go or Python would
do the same job.

## The hybrid model

`opl/base.ts` is the target schema the transform was built against: a generated OPL with GUID relation names,
dynamic `Platform_role` and `Platform_need` objects, and `*_Group` resource groups. `opl/base-decoded.ts` is the same
schema with GUIDs replaced by readable aliases. `opl/hybrid.ts` is `opl/base.ts`, unchanged, plus one relation per
standard template on each `*_Group` type that template touches. `tools/add_standard_roles.py` generates it from the
base file and `examples/mapping.json`; `opl/hybrid-decoded.ts` is the same change applied to the decoded copy. All
four validate on Keto v26.4.5.

The base model stays as it is: `Platform_role` and `Platform_need` objects for anything an org defines itself,
resource groups via `Group_Assignments`, direct per-user relations on resources, and Admin via `Tenancy`. The hybrid
adds, for example, `R2: SubjectSet<User_Group,"Members">[]` to `Customer_Group`, and every `Customer_Group` permit that R2
grants now starts with `this.related.R2.includes(ctx.subject) ||`. The template's permission list therefore lives in
the OPL, generated from the same mapping the transform reads.

| Legacy assignment | Becomes | Example tuple |
| --- | --- | --- |
| Unmodified standard template (R2 on a customer group) | One tuple per holder group on the resource group | `Customer_Group:acme:rg:customergroup:miami-customers:Customer#R2@User_Group:acme:g:miami-staff#Members` |
| Custom role, or an org's edited copy of a template | A role instance flagged per permission, attached to the resource group, linked to the holders | `Platform_role:acme:ri:ce11f1fa4a9a#Customer_f8e1...e1ed@Platform_role:acme:ri:ce11f1fa4a9a` |
| Assignment mixing both | Split: standard part as above, custom part as one role instance | see `ledger` in the output |

Custom roles stay fully dynamic. The hybrid keeps all 64 `RolePermitted_*` and `NeedPermitted_*` permits from the
base file, and the standard-role check is only an extra `||` in front of them. An org can still create, edit, or
delete a role with any combination of existing permissions using tuple writes alone, with no OPL change. In the
hybrid Keto run, acme's org-defined Reviewer (6 allowed checks) and globex's edited R2 (4) went through that path and
matched. An OPL change is needed in only two cases: a new permission or resource type (the schema generator already
regenerates for that), and a change to a standard template itself.

A role counts as standard only when its legacy `kind` is `standard` and its expanded permission list equals the
mapping's list exactly. Globex's R2 in the sample lacks one permission, so it migrates as a custom role and the
transform reports it.

The hybrid removes the shared-role leak (finding 1) for standard templates, because scope, template, and holders sit
in one tuple. It shortens the check path for them by two hops (no role object, no self-reference). On the sample,
acme drops from 93 tuples and 6 role objects to 59 tuples and 1 role object (the org's custom Reviewer).

The costs fall on the platform team. Changing a standard template is an OPL deploy that changes every org at once;
that is what "standard" should mean, but it must be agreed. The schema pipeline must run the generator, or emit the
same relations itself, for each resource type. A resource group with more than 100 holder groups on one template
relation can hit `max_read_width`. The permission lists in `examples/` are placeholders.

## Findings

**0. The F roles are self-referential, by convention only.** In the base OPL, `Platform_role` relations such as
`Customer_View: (Platform_role)[]` hold role objects, and `RolePermitted_Customer_View` traverses to them and reads their
`User_Group`. "Role R grants Customer View" is written as `Platform_role:R#Customer_View@Platform_role:R`, the only way
to store a per-role flag in Keto. The transform writes exactly that and passes every check. Nothing in the OPL
requires the subject to be R itself: a tuple `R1#Customer_View@R2` gives R1's scopes to R2's holders. A writer must never
produce one.

**1. Role objects must not be shared across unrelated assignments.** A user's access through a role object is the
join of `resource -> *_Group -> Platform_role -> User_Group#Members`. If one `Platform_role` object for R2 is
attached to two customer groups and two holder groups, every holder gets R2 on every attached customer group. The
transform mints one role instance per distinct (holder set, permission set) and attaches scopes to it, which is safe
because everyone attached is meant to get everything attached. `MODE=shared_role` reproduces the shared shape; on the
sample it over-grants 24 of 368 checks. In the hybrid this rule applies only to custom roles.

**2. The OPL has no scope inheritance for normal permissions.** `Project` does not traverse to its `Customer`, and
`Customer` reaches `Org` only for the Admin permit through `Tenancy`. A legacy assignment on a customer group or on the
whole org therefore has to be materialised as a `Customer_Group` and an `Project_Group` listing every resource in
scope. The sample produces 8 such groups for 7 migrated assignments. After cutover, applications must add every new
customer and project to every group whose scope covers it, or newly created resources are invisible to existing
assignments. Adding parent traversals to the OPL (as in the reference model in `legacy/`) removes this class of
tuples. The hybrid does not change this.

**3. Exclusions and nesting are flattened, not preserved.** `User_Group#Members` accepts only `User`, so nested
legacy groups are flattened. Include/exclude customer groups (a set, then exclusions) are evaluated once and written as
membership. Keto then holds the result, not the rule, so the transform must re-run whenever an included set or
nested group changes.

**4. Some legacy access has no target and needs a decision.** The sample's Submission permission has no relation in the
base OPL; the mapping marks it ignored with a reason, and every affected assignment is reported for review.
Temporary (T1) and system-artifact (import group) policies are held back rather than migrated as standing access.
An unmapped permission, unknown subject, or unknown scope sets status `blocked` and emits nothing for that
assignment.

**5. The built-in parity oracle proves the tuples, not the legacy behaviour.** The transform also emits the allow set
its own interpretation implies, and `test/run.sh` checks every user, permission, and resource in Keto against it,
including cross-org pairs. Passing proves the Keto graph implements the interpretation. It does not prove the
interpretation matches the legacy system. That needs sampled checks against the legacy decision path; if
applications already route authorization reads through one place, dual-reading legacy and Keto during cutover is the
practical way to get it.

## Keto parity results

All runs used Keto v26.4.5 (built from tag commit `ccdc63e1`; the binary reports `master`), strict mode, depth 10,
width 100. Each run checks 8 users against 12 resources in two orgs on every mapped permission: 368 checks. The
second set used the updated sample, in which globex's R2 is an edited copy.

| Variant | Acme tuples / role objects | Match | Over-grant | Under-grant | Incomplete |
| --- | --- | --- | --- | --- | --- |
| Base OPL, every role an instance | 93 / 6 | 368 | 0 | 0 | 0 |
| Base OPL, one shared role object per template | 82 / 4 | 344 | 24 | 0 | 0 |
| Decoded base OPL, every role an instance | 93 / 6 | 368 | 0 | 0 | 0 |
| Standard roles in OPL (decoded names) | 59 / 1 | 368 | 0 | 0 | 0 |
| Hybrid OPL, `opl/hybrid.ts` (GUIDs) | 59 / 1 | 368 | 0 | 0 | 0 |
| Hybrid OPL, `opl/hybrid-decoded.ts` | 59 / 1 | 368 | 0 | 0 | 0 |

Every shared-role over-grant comes from the R2 role object being attached to four scopes and three holder groups.
Bob was assigned R2 only on Jones and gains R2 on Smith and Brown (10 checks). Dan, assigned Smith and Brown, gains
Jones (5). Alice and Carol, assigned the Miami customer group, gain Jones (5 and 4). Cross-org checks are denied in
every variant. The decoded base OPL gives the same answer as the GUID file on every check. The sample is small and
synthetic; it shows mechanisms, not the exposure of any real deployment.

Both hybrid OPLs give the same answer as the unmodified base OPL on every check, with no incomplete checks, from 34
fewer acme tuples and 5 fewer role objects.

## Adapting this to a real migration

The transform is meant to be owned and extended by the team running the migration. The steps below replace each
synthetic part with real data and decisions, in the order they block each other.

### 1. Produce a real export per org

Write one JSON file per org in the shape of `examples/legacy-acme.json`. Legacy IDs for users, customers, and
projects must be globally unique (GUIDs are fine); the transform prefixes only the objects it creates (`<tenant>:g:`,
`<tenant>:u:`, `<tenant>:rg:`, `<tenant>:ri:`).

| Field | Content |
| --- | --- |
| `tenant`, `org` | Tenant prefix for created objects; the Org object ID |
| `users` | Every user ID that may appear in a group or assignment |
| `groups[]` | `id`, `members` (user IDs), optional `member_groups` (nested group IDs) |
| `customers[]`, `projects[]` | Resource IDs; each project names its `customer` |
| `customer_groups[]` | `id`, and `include` or `include_all: true`, optional `exclude` |
| `roles[]` | `id`, `kind` (`standard`, `custom`, `temporary`, `artifact`), `permissions` (legacy IDs), optional `includes` |
| `assignments[]` | `id`, `subjects` (`{"group": id}` or `{"user": id}`), `roles`, `scope` (`Org`, `CustomerGroup` + `id`, or `Customer` + `id`) |

If the legacy data does not fit this shape, change the export first; the Rego reads only these fields.

### 2. Fill in the permission registry

`mapping.permissions` maps each legacy permission ID to the OPL namespace and relation that represents it, using the
GUIDs from the schema generator (`examples/mapping-decoded.json` shows the same mapping with readable names).
Generate this section from the generator's source rather than typing it. Anything with no target goes in
`mapping.ignored` with the reason. A permission in neither list blocks the org.

### 3. Define the standard templates and regenerate the OPL

`mapping.standard_roles` lists each template by its legacy role ID with the OPL `relation` name and the full,
expanded permission list. Then regenerate and validate:

```sh
python3 -I tools/add_standard_roles.py examples/mapping.json path/to/generated.ts >opl/hybrid.ts
keto validate opl opl/hybrid.ts
```

Run the generator on the OPL that the schema pipeline produces, as a post-processing step, or teach the pipeline to
emit the same relations. Deploy the hybrid OPL before writing any tuples that use it; strict mode rejects tuples on
relations the OPL does not define. Changing a template means editing its list, regenerating, deploying, and
re-running the transform for every org. Orgs whose legacy copy no longer matches the new list will migrate that
role as custom, so change the legacy template and the mapping together.

### 4. Add resource and scope types

These require Rego changes in `rego/rbac2keto.rego`:

- **A new scope type** (for example Branch): add a `scope_customers(s)` rule and a `scope_ok(s)` rule for the new
  `type`, and add the scope's data to the export.
- **A new resource type** with its own `*_Group` (for example projects, or `User` resources through `User_Group` for
  staff administration): add it to `mapping.group_namespaces`, add `scope_resources(s, "<Type>")` and
  `tenant_resources("<Type>")` rules, and export the resources with their parent.
- **Service-account holders**: holders are `User_Group` only today. `Platform_role` also has `ServiceAccount_Group`,
  so add a holder kind in `holder_group` and an emit rule for that relation.
- **Parent traversal in the OPL** (finding 2): if it is added, replace the expansion in `scope_resources` with
  attaching the scope object itself, and drop the materialised-group membership rule.
- **Needs** (`Platform_need`): not emitted today. If legacy has task-based grants, add a binding rule mirroring the
  role-instance rules with `Needs` and the `NeedPermitted_*` relations.

### 5. Encode the semantic decisions

Each of these is a single rule to review against how the legacy system actually behaves:

| Decision | Where | Current behaviour |
| --- | --- | --- |
| Temporary and artifact policies | `blocked_kinds` | Not migrated; reported for review |
| Org Admin implies everything | `admins`, `allow` | Assumed, matching the OPL's `Tenancy` rule |
| Exclusion semantics | `customer_group_members` | Include (or all) minus exclude, evaluated once |
| Nested groups | `group_users` | Flattened to the transitive closure |
| What counts as standard | `static_role` | Kind `standard` and an exact permission-list match |

### 6. Verify

Add a unit test in `rego/rbac2keto_test.rego` for every rule you change, then run the Keto check against your own
OPL, mapping, and org exports:

```sh
opa test -v rego/
TENANTS="exports/org-a.json exports/org-b.json" MAPPING=examples/mapping.json \
  OPL=$PWD/opl/hybrid.ts OPA=... KETO=... bash test/run.sh
```

Use at least two orgs so cross-org denials are checked. This compares Keto with the transform's own reading of the
export (finding 5). To check against the legacy system, record legacy decisions for a sample of users and compare
them with the same Keto checks; dual-reading during cutover does this continuously.

### 7. Load into Keto

The output per org is a desired state: `tuples` for Keto, `ledger` (which assignment produced which standard roles
and role instances) for the platform's assignment store, and `issues`. A first load into an empty store can insert
the tuples in batches through `PATCH /admin/relation-tuples`, as `test/run.sh` does. Every later run needs a
reconciler that lists the org's current tuples, deletes those the transform no longer produces, and inserts the new
ones. This prototype does not include one. Keep the ledger: revoking or changing an assignment after cutover needs it.

## Recommended approach

Do not build or commit to a generic converter. Use the hybrid model (standard templates in the OPL, per-assignment
role instances for everything custom), add parent traversal to the OPL (finding 2), and treat this transform plus
parity harness as a reference the migrating team owns and extends. That team owns the export, the permission
registry, the semantic decisions, the loader, and the cutover.

The language used for the mapping step matters little. The inputs below block any implementation equally.

| Topic | What is needed | Why |
| --- | --- | --- |
| Export | A sanitised export for one real org: users, groups and nesting, policies, assignments, scopes | `examples/legacy-acme.json` is a guess at the shape |
| Permission registry | Legacy permission ID to OPL relation, from the schema generator | Every unmapped permission blocks an org |
| Standard templates | The template permission lists and who may change them | Defines the hybrid OPL; a change is a schema deploy |
| Scope semantics | Branchs, other hierarchy levels, direct lists, and set/exclusion rules | Determines expansion and what must be maintained after cutover |
| OPL hierarchy | Whether `Project -> Customer -> Branch/Org` traversal can be added | Removes materialised scope groups (finding 2) |
| Non-standing access | Treatment of temporary, artifact, and unmappable policies | Users lose or keep access on cutover |
| Volume | Orgs, users, groups, assignments, customers, projects per large org | Sizing, batching, and width limits |
| Cutover and parity | Per-org or big-bang; how legacy decisions can be sampled for comparison | Defines acceptable friction and the rollback test |

## Run it

Needs `opa` (1.21.4 used), a Keto v26.4.5 binary, `jq`, `curl`, and Python 3. Keto listens on unix sockets in a
temporary directory, so no TCP ports are used. See [`legacy/README.md`](legacy/README.md) for obtaining a Keto binary.

```sh
opa test -v rego/                                       # unit tests only
OPA=/path/to/opa KETO=/path/to/keto bash test/all.sh    # regenerate the hybrid OPLs, run every variant
```

| Variant | OPL | Mapping | Expect |
| --- | --- | --- | --- |
| `base` | `opl/base.ts` | `mapping.json`, `STANDARD=0` | all match |
| `base-shared` | `opl/base.ts` | as above, `MODE=shared_role` | over-grants |
| `base-decoded` | `opl/base-decoded.ts` | `mapping-decoded.json`, `STANDARD=0` | all match |
| `hybrid` | `opl/hybrid.ts` | `mapping.json` | all match |
| `hybrid-decoded` | `opl/hybrid-decoded.ts` | `mapping-decoded.json` | all match |

`test/run.sh` runs one variant (`MODE`, `MAPPING`, `STANDARD`, `OPL`, `TENANTS`, `NAME`). `STANDARD=0` treats every
role as custom, for OPLs without standard-role relations. It exits 0 when every check matches, 1 on any over-grant,
under-grant, or incomplete (non-200) check, and 2 when the run itself fails. Reports and per-tenant output go to
`artifacts/<name>/`.

| Path | Purpose |
| --- | --- |
| `opl/base.ts` | Target schema with GUID relation names |
| `opl/base-decoded.ts` | The same schema with GUIDs replaced by readable aliases |
| `opl/hybrid.ts` | Hybrid OPL: the base schema plus standard roles (generated) |
| `opl/hybrid-decoded.ts` | The same change on the decoded copy (generated) |
| `tools/add_standard_roles.py` | Generates a hybrid OPL from a base OPL and a mapping |
| `rego/rbac2keto.rego` | The transform: tuples, assignment ledger, issues, parity allow set |
| `rego/rbac2keto_test.rego` | Unit tests on an inline fixture |
| `docs/rego-walkthrough.md` | Rule-by-rule walkthrough of the transform, with examples from the acme sample |
| `examples/mapping.json` | Registry, standard templates, and target names for the GUID OPL; legacy names are placeholders |
| `examples/mapping-decoded.json` | The same for the decoded names |
| `examples/legacy-*.json` | Synthetic exports for two orgs |
| `test/run.sh`, `test/all.sh` | Generate, load into Keto, check every combination against the oracle |
| `legacy/` | Earlier grant vs direct-tuple comparison (Go generator, two setups, its own tests and CI) |
