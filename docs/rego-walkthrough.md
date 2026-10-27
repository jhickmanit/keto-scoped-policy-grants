# Walkthrough of `rego/rbac2keto.rego`

`rego/rbac2keto.rego` is a pure function. It takes one org's legacy export as `input` and the target-OPL profile as
`data.mapping`, and it returns a single document, `data.rbac2keto.result`, with five parts: the tuples Keto should
hold, an assignment ledger, issues that need a decision, an overall status, and the allow set used for parity checks.
It never calls Keto and never reads tuples already in Keto. Writing, diffing, and cutover belong to a loader that the platform team
builds around it (README, step 7).

This walkthrough follows the file top to bottom. Each section names the rules, says what they compute, and shows the
result for the synthetic org in `examples/legacy-acme.json`. Line numbers refer to the file in this repository.

```sh
opa eval -f pretty -d rego -d examples/mapping.json -i examples/legacy-acme.json 'data.rbac2keto.result'
```

## Pipeline at a glance

| Stage | Lines | Rules | Produces |
| --- | --- | --- | --- |
| Catalog | 22-57 | `roles`, `role_closure`, `role_permissions`, `static_role`, `dynamic_roles` | Each role's expanded permission set; standard vs custom split |
| Subjects | 59-80 | `group_users`, `holder_group`, `holders`, `holder_users` | Flattened group membership; one `User_Group` per holder |
| Resources | 82-118 | `customer_group_members`, `scope_customers`, `scope_resources`, `resource_group` | The concrete customers, projects, and org each scope covers |
| Assignments | 120-181 | `resolvable`, `active`, `bindings`, `scoped` | Which assignments migrate; one role instance per custom binding |
| Tuples | 183-231 | Seven `tuples contains` rules | The desired Keto state |
| Issues | 233-306 | `issues contains` rules at `error`, `review`, `info` | What blocks the org, what needs a decision, what was changed |
| Parity oracle | 308-327 | `granted`, `admins`, `allow` | The access the transform intends, independent of Keto |
| Result | 329-362 | `ledger`, `status`, `result` | The output document |

Rego rules are not executed in order. Each rule is a definition, and OPA evaluates whatever `result` depends on. The
stages above are a reading order, not a run order.

## Inputs

`input` is one org. The fields the transform reads are listed in the README (step 1); nothing else in the export is
used. Two fields set naming: `tenant` prefixes every object the transform creates, and `org` is the ID of the `Org`
object.

`data.mapping` is the target-OPL profile, shared by every org:

| Key | Meaning |
| --- | --- |
| `permissions` | Legacy permission ID to `{namespace, relation}` in the OPL |
| `ignored` | Legacy permissions with no target, each with a reason |
| `standard_roles` | Legacy role ID to OPL relation name and the exact expanded permission list |
| `role_namespace`, `holder_namespace`, `holder_relation` | `Platform_role`, `User_Group`, and the relation linking them |
| `group_namespaces` | Resource type to its `*_Group` namespace |
| `admin` | The permission that means "org admin" for the parity oracle |
| `role_instance_mode` | `per_assignment` (default) or `shared_role` (comparison only, see below) |

Line 20 defines `minted(kind, id)`, which produces `<tenant>:<kind>:<id>`. Only objects the transform invents are
minted: holder groups (`g`, `u`), resource groups (`rg`), and role instances (`ri`, or `role` in shared mode). Legacy
user, customer, and project IDs pass through unchanged, so they must already be globally unique.

## Catalog: what each role grants

`role_closure` (line 28) uses `graph.reachable` over each role's `includes` list, so a role that includes other roles
expands to all of them, at any depth and without looping on cycles. `role_permissions` (line 30) is the union of the
permissions of every role in that closure. In the sample, `R1` has no permissions of its own; it includes `R2`, `R9`,
`R10`, and `R12`, so it expands to all 11 mapped permissions.

`static_role` (line 50) decides whether a role becomes a fixed OPL relation. Both conditions must hold: the legacy
`kind` is `standard`, and the expanded permission set equals `mapping.standard_roles[rid].permissions` exactly. A
org's edited copy of a template fails the second test and migrates as a custom role; globex's `R2` in the sample is
that case. `dynamic_roles` (line 57) is every role on the assignment that is not static. One assignment can hold both
kinds, and the transform splits it.

`blocked_roles` (line 37) finds any role in the closure whose kind is `temporary` or `artifact`. These assignments are
not migrated (see Assignments). Because the check runs over the closure, a role that merely includes a temporary role
is blocked too. In the sample, `IMPORT` is an `artifact` role that includes `R1`, so `import-leftover` is held back
even though `R1` is standard.

## Subjects: who holds the assignment

Keto's `User_Group` holds users only, while legacy groups can nest. `group_users` (line 69) flattens a group to the
transitive closure of its members. In the sample, `miami-staff` contains `carol` and the group `miami-preparers`,
so it resolves to `{alice, carol}`.

`holder_group` (lines 74-76) turns every subject into a `User_Group`. A legacy group becomes `<tenant>:g:<group>`.
A direct user assignment becomes a single-member group, `<tenant>:u:<user>`. Every holder therefore has the same
shape, and the emit rules need only one case. `holder_users` (line 80) is the set of real users behind an
assignment and is used only by the parity oracle.

## Resources: what each scope covers

`customer_group_members` (line 92) evaluates the legacy include and exclude logic once: (all customers if `include_all`,
plus `include`) minus `exclude`, intersected with the org's customers. In the sample, `miami-customers` includes Smith,
Brown, and Lee and excludes Lee, giving `{acme-smith, acme-brown}`. The result is stored in Keto as membership, not
as a rule. If a customer is added later, Keto does not know it belongs to the group until the transform runs again or
the application writes the membership (reported as an `info` issue).

`scope_customers` (lines 94-98) resolves the three scope types: `Org` is every customer, `Customer` is one customer, and
`CustomerGroup` uses the evaluation above. `scope_resources(s, type)` (lines 102-108) then expands a scope into the
resources of each type the role touches. Projects are the projects of those customers. The `Org` resource
appears only for a Org-scoped assignment.

This expansion exists because the base OPL (`opl/base.ts`) has no `Project -> Customer -> Org` traversal for non-admin
permissions. A grant on a customer therefore does not reach its projects in Keto, and the transform writes each
project into a resource group itself. If the platform team adds that traversal to the OPL, this expansion can be replaced by
attaching the scope object directly (README, step 4).

`resource_group` (line 118) names the `*_Group` object for one scope and one resource type, for example
`acme:rg:customergroup:miami-customers:Customer`. The same scope used by several assignments shares one resource group.

## Assignments: what migrates

An assignment is `resolvable` (line 122) when every role, subject, and scope it names exists in the export. It is
`active` (line 146) when it is resolvable and has no blocked role. Only active assignments produce tuples. Anything
else is reported in `issues` and produces nothing, so the transform fails closed.

`bindings` (lines 162-175) creates role instances for custom roles. In `per_assignment` mode the instance ID is a
hash of two things: the sorted holder groups and the sorted mapped permissions of the custom roles. Two assignments
with the same holders and the same permissions share an instance, which is safe because everyone attached receives
everything attached. Different holders or different permissions always produce different instances. This is the
rule that prevents the shared-role leak described in finding 1.

`shared_role` mode (line 169) creates one instance per legacy role, reproducing a "one role object per role" design.
It is kept only so the parity harness can measure the leak: on the sample it over-grants 24 of 368 checks. It should
not be used for a real migration.

`scoped` (line 178) collects every `[scope, resource type]` pair an active assignment needs, for standard and custom
roles alike. It drives the resource-group membership tuples.

## Tuples: the desired Keto state

Each `tuples contains` rule emits one kind of tuple. Using the sample:

| Rule (line) | Emits | Example |
| --- | --- | --- |
| Role permission flag (190) | One self-referencing tuple per permission on each role instance | `Platform_role:acme:ri:<hash>#<Customer_View>@Platform_role:acme:ri:<hash>` |
| Role holders (196) | Role instance to each holder group | `Platform_role:acme:ri:<hash>#User_Group@User_Group:acme:u:erin#Members` |
| Role attachment (201) | Resource group to role instance, once per resource type with resources in scope | `Customer_Group:acme:rg:customergroup:all-but-employee-returns:Customer#Roles@Platform_role:acme:ri:<hash>` |
| Standard role (208) | Resource group straight to each holder group, on the template's relation | `Customer_Group:acme:rg:customergroup:miami-customers:Customer#R2@User_Group:acme:g:miami-staff#Members` |
| Group assignment (216) | Each resource to its resource group | `Customer:acme-smith#Group_Assignments@Customer_Group:acme:rg:customergroup:miami-customers:Customer` |
| Holder membership (223) | Each holder group to its flattened users | `User_Group:acme:g:miami-staff#Members@User:alice` |
| Tenancy (228) | Each customer and project to the org | `Customer:acme-smith#Tenancy@Org:acme` |

Relation names in angle brackets are readable aliases; `examples/mapping.json` uses the base OPL's GUIDs, and
`examples/mapping-decoded.json` the readable names. The role-permission flag points at its own object because a Keto
tuple must have a subject, and a self-reference is the only way to store a per-role boolean. That is the pattern in
the base OPL, which the transform follows.

The role-attachment and standard-role rules both skip a resource type when the scope covers no resources of that
type. This is how a Org permission inside a CustomerGroup-scoped role is dropped (and reported) rather than written
somewhere it would never be checked.

`tuples` is a set, so the same tuple produced by two assignments is written once. Membership tuples are emitted only
for holder groups that an active assignment uses (`used_holders`, line 221).

## Issues: what needs a human

Every issue has a `level` and names the assignment, role, group, or resource group it concerns.

| Level | Raised when | Effect |
| --- | --- | --- |
| `error` | Unknown role, subject, scope, or group member; a permission in neither `permissions` nor `ignored` | Org status `blocked`. For an unknown role, subject, or scope, that assignment emits nothing |
| `review` | Temporary or artifact role; an ignored permission dropped; a permission whose type has no resources at the assignment's scope; a scope that resolves to no customers | Org status `needs_review`; access migrates as reported |
| `info` | Nested groups flattened; a materialised resource group that must be maintained; a standard role migrated as custom | No effect on status |

An unmapped permission is an `error` at the org level, even if no assignment uses the role. A complete permission
registry is therefore a precondition for migrating any org.

`status` (line 341) is `blocked` if any `error` exists, else `needs_review` if any `review` exists, else `ready`. The
sample org is `needs_review`: Frank's temporary submission role and the leftover import role are held back, the submission
permission inside `R1` has no target in the OPL, and Erin's reviewer role includes a Org permission that a
CustomerGroup scope cannot grant.

## Parity oracle: what access the transform intends

`granted` (line 313) computes `[user, namespace, relation, resource]` directly from the export: for each active
assignment, every holder user receives every mapped permission on every resource the scope covers. It does not look
at the tuples. `allow` (line 323) adds assumption A3: a user holding the admin permission holds every mapped
permission on every resource in the org, matching the OPL's `Tenancy` rule.

`test/run.sh` loads the tuples into Keto and checks every user, permission, and resource in two orgs against
`allow`, including cross-org pairs. A match proves that Keto, given these tuples and this OPL, grants exactly what
the transform intended. It does not prove the intent matches the legacy system. That needs sampled legacy decisions
(README, finding 5).

## Result

`result` (line 349) returns:

| Field | Use |
| --- | --- |
| `tenant`, `mode`, `status` | Gate the load: load only `ready`, or `needs_review` after sign-off |
| `tuples` | Desired state for Keto, sorted |
| `issues` | The review list |
| `ledger` | Per active assignment: scope, static roles, custom roles, role instance IDs. Keep it in the platform's assignment store; changing or revoking an assignment after cutover needs it |
| `parity` | Subjects, objects, relations, and `allow`, consumed by `test/run.sh` |

On the sample, acme produces 59 tuples and one role instance (Erin's org-defined Reviewer). Every other active
assignment uses unedited standard templates and becomes direct `*_Group` relations.

## Where the migration decisions live

Each of these is one rule. Changing the decision means changing that rule and its test in
`rego/rbac2keto_test.rego`.

| Decision | Rule | Current behaviour |
| --- | --- | --- |
| Which roles are not standing access | `blocked_kinds` (35) | `temporary` and `artifact` are held for review |
| What counts as a standard template | `static_role` (50) | Kind `standard` and an exact expanded-permission match |
| Nested group semantics | `group_users` (69) | Flattened to the transitive closure |
| Include and exclude semantics | `customer_group_members` (92) | Include (or all) minus exclude, evaluated at migration time |
| Scope types | `scope_customers`, `scope_ok` (94-98, 134-145) | `Org`, `Customer`, `CustomerGroup` only |
| Scope inheritance | `scope_resources` (102-108) | Materialised per resource type, because the OPL has no parent traversal |
| Role instance identity | `binding_key` (157) | Holders plus mapped permissions |
| Org admin semantics | `admins`, `allow` (321-327) | Admin implies every permission in the org |

## What it does not do

The transform does not emit `Platform_need` grants, `ServiceAccount_Group` holders, or resource types beyond Org,
Customer, and Project; README step 4 lists the rule changes for each. It does not delete anything: the output is a
full desired state per org, and turning that into inserts and deletes against live Keto is the reconciler's job. It
does not evaluate conditions at check time. Exclusions, nesting, and scope expansion are resolved when the transform
runs, so the transform must run again, or the application must write the change, whenever the underlying legacy
sets change.

## Tests

`rego/rbac2keto_test.rego` runs 13 cases against an inline fixture: exclusion, group flattening, role closure,
instance sharing and separation, temporary-role hold, unmapped-permission and unknown-scope blocking, oracle scoping,
shared-mode behaviour, standard-role emission, edited-template fallback, and a mixed standard-plus-custom split.

```sh
opa test -v rego/
```
