# Scoped policy grants with Ory Keto

This repository demonstrates how to assign reusable policies to users and groups at specific resource scopes using Ory Permission Language (OPL). A Go generator turns a permission catalog and an example assignment scenario into two Keto models, then a test harness checks their authorization behavior and traversal limits.

The central idea is to keep a **policy template** separate from a **scoped assignment**. The same person can prepare tax returns for one client and administer client profiles at another office without combining those permissions across both scopes. Both models use one generated schema across tenants; tenant-specific assignments live in relationship tuples.

Start with **Setup A: grants**. It preserves assignment identity and completes the included load shape that reaches a traversal limit in Setup B. This is a reference implementation: it includes generation and verification, but no assignment API, policy editor, or live migration service.

## What the example covers

The catalog contains 13 permissions and four example policy templates: F2 (Tax Preparers), F9 (Client Administration), F10 (E-File), and F1 (the union of those three). These templates cover only the permissions in this example.

Resources form a hierarchy with these allowed parent types:

| Resource | Allowed parents |
| --- | --- |
| `Firm` | None |
| `Office` | `Firm` |
| `ClientGroup` | `Firm`, `Office` |
| `Client` | `Office`, `ClientGroup` |
| `TaxReturn` | `Client` |

Checks accept a local assignment or an inherited assignment from an ancestor. A client can have both an office and a client group as parents. Permissions are additive: there is no explicit deny or child-level override of an inherited allow.

Each permission's `on` field specifies its lowest checkable resource type. For example, return viewing can be checked on a `TaxReturn` and its ancestors, while creating a return is checked on a `Client` or an ancestor. A client-scoped assignment cannot enable a firm-level feature. The example `Tax.TaxPreparation.TaxReturns.List` permission represents a container-level check; it does not implement an API that lists authorized returns.

The shared 31-check matrix covers direct users, group membership, inheritance, different policies for one user on different scopes, sibling-scope denial, and cross-tenant denial for the supplied graph.

## How the models work

### Setup A: grants

A `Grant` represents one assignment. It records members, assigned roles, and the materialized union of those roles' permissions. A resource attaches the grant through its `grants` relation.

For example, the following tuples assign F2 and F9 to a preparer group at one office. Only one of the generated permission tuples is shown:

```text
Grant:acme-miami-preparers#members@Group:acme-miami-preparers#members
Grant:acme-miami-preparers#roles@Role:F2
Grant:acme-miami-preparers#roles@Role:F9
Grant:acme-miami-preparers#Tax_TaxPreparation_TaxReturns_View@Grant:acme-miami-preparers#members
Office:acme-miami#grants@Grant:acme-miami-preparers
```

Authorization checks read the grant's materialized permissions and members. They do not traverse `Role` objects; the role links record which templates produced the assignment. Updating role metadata alone therefore does not change access.

A grant can be attached to another scope with one additional tuple, but that shares **all members and all permissions** on the grant. Use separate grants when either the membership or permission set differs between scopes. The generator creates one grant per assignment, with one scope attachment.

### Setup B: direct tuples

The same assignment becomes one tuple for each applicable permission and subject on the resource:

```text
Office:acme-miami#Tax_TaxPreparation_TaxReturns_View@Group:acme-miami-preparers#members
Office:acme-miami#Tax_TaxPreparation_TaxReturns_Edit@Group:acme-miami-preparers#members
```

This uses fewer tuples in the example and requires less traversal depth. Assignment identity is absent from the generated tuples, so an external record must track overlapping policies for safe updates and revocation. Many group subject sets on one permission relation can also reach the read-width limit.

Both setups expose the same `Permit_<permission>` names. The generator replaces dots in catalog permission IDs with underscores.

## Run locally

GitHub Actions runs `make check` and verifies that regenerating the schemas, tuples, and configs leaves the checked-in files unchanged. CI does not run the Keto integration matrix or load tests.

You need Go 1.23 or later, Make, Bash, `jq`, `curl`, and a Keto binary. The checked-in results use **Keto v26.4.5**, strict mode enabled, maximum read depth 10, and maximum read width 100. Other versions may behave differently.

Run these commands from the repository root. Ports **4466 and 4467 must be free**; the scripts start and stop fresh in-memory Keto instances and run the setups sequentially.

```sh
# Formatting, vet, Go tests, shell syntax, and runner failure regressions.
make check

# Regenerate OPL, tuple files, and Keto configs from model/.
make generate

# Supply an absolute path to your reference Keto binary.
export KETO=/absolute/path/to/keto

# Setup A: baseline matrix, depth exploration, and both load shapes.
make test

# Both setups; the recorded default workload produces failures in Setup B.
N=500 RUNS=3 make compare
```

`make check` does not require a real Keto binary. `make test` and `make compare` do. Test runs regenerate setup inputs and write reports plus verifier/Keto logs under `artifacts/<setup>/`, which Git ignores. Set `RESULT_DIR=/absolute/path` to change the report destination. Checked-in `setup-*/results.txt` files are historical snapshots and are not overwritten.

For a shorter run:

```sh
N=100 RUNS=1 bash test/run.sh setup-a-grants
```

Compare results only for the same workload, engine version, and configuration. When invoking `bash test/run.sh` directly, exit statuses mean:

| Exit | Meaning |
| --- | --- |
| 0 | All requested checks completed and matched expectations. |
| 1 | Checks completed, but at least one result differed or hit a traversal limit. |
| 2 | The run was incomplete, such as a startup, tuple-load, or verifier failure. |

The default A/B comparison is expected to exit 1 on the reference version because of Setup B's load failures. Make reports recipe failures using its own exit status.

### Obtain a Keto binary

Download and extract an archive for your operating system and architecture from the [public Keto releases](https://github.com/ory/keto/releases), then set `KETO` to the extracted executable's absolute path. For example, v26.2.0 has `keto_26.2.0-macOS_arm64.tar.gz` for Apple Silicon and `keto_26.2.0-linux_64bit.tar.gz` for Linux x86-64. Verify the archive against that release's `checksums.txt` before using it.

The historical v26.4.5 reference build has no matching asset on the public releases page as of October 21, 2026. A public build such as [v26.2.0](https://github.com/ory/keto/releases/tag/v26.2.0) is a candidate for testing, but has not been validated against this example. It is not a substitute for reproducing the recorded baseline. Run the harness and retain its version, configuration, and logs when comparing another build; unsupported OPL, configuration, or API behavior must be resolved before interpreting its results.

```sh
export KETO=/absolute/path/to/extracted/keto
"$KETO" version
make test
```

A locally compiled binary may report `master`. Record its source tag and commit alongside the test output in that case.

### Inspect a setup manually

Start Keto in one terminal:

```sh
export KETO=/absolute/path/to/keto
(cd setup-a-grants && "$KETO" serve -c keto.yml)
```

In another terminal at the repository root, load the tuples and run the matrix:

```sh
go run gen/main.go verify -tuples setup-a-grants/tuples.json
```

Then check whether the example user can view a return:

```sh
curl --fail-with-body -sS http://127.0.0.1:4466/relation-tuples/check/openapi \
  -H 'Content-Type: application/json' \
  -d '{"namespace":"TaxReturn","object":"acme-smith-2025-1040","relation":"Permit_Tax_TaxPreparation_TaxReturns_View","subject_set":{"namespace":"User","object":"alice"}}'
```

The expected response includes `"allowed": true`. Stop this manually started instance before running the automated harness.

## Recorded results and their limits

The checked-in [Setup A results](setup-a-grants/results.txt) and [Setup B results](setup-b-direct/results.txt) report:

| Measurement | Setup A: grants | Setup B: direct |
| --- | --- | --- |
| Baseline matrix | 31/31 | 31/31 |
| Smallest depth passing the matrix | 6 | 5 |
| 500 additional assignments on separate clients, three runs | 0 failures per run | 0 failures per run |
| 500 additional groups assigned on one office, three runs | 0 failures per run | 4 failed checks per run |
| Assignment tuples / total baseline tuples | 80 / 92 | 51 / 63 |

The first load shape, named `reuse` in the reports, adds assignments on separate client objects. The `fan-in` shape adds groups with separate users, all assigned F2 on the same office. Both rerun the existing matrix after adding the load; they do not check every bulk user or measure throughput and latency.

Setup A uses a separate grant for each added assignment. Its result does not establish that arbitrarily large grants or nested groups fit within traversal limits. Depth and width depend on the graph shape, and a configured depth of 10 is a budget rather than a guarantee.

Keep strict mode enabled and treat incomplete checks as errors, even when the application fails closed. Do not convert an HTTP 422 or another traversal error into a completed denial, or disable strict mode to make the test appear to pass.

## Adapt the model

1. Edit [model/catalog.json](model/catalog.json) to define resource types, parent types, permission IDs, lowest checkable scopes, and role templates. Roles can include other roles.
2. Edit [model/scenario.json](model/scenario.json) to define objects, parent links, group membership, scoped assignments, and expected checks. Its `groups` map generates direct user membership; nested groups require explicit tuples even though the schema permits them.
3. Run `make generate`, inspect both generated models, then run `make check` and `make compare`.
4. Add allow and deny checks for new combinations, including sibling resources, another tenant, and one subject with different policies on different scopes. Exercise realistic nesting and assignment sizes separately.

Keep role-inclusion and resource-hierarchy graphs acyclic and references valid. The generator rejects empty or duplicate assignment IDs within a scenario, but it is not a complete input validator. Assignment and membership changes use tuples; adding permission IDs or resource types requires regenerating and deploying OPL.

## Responsibilities of an assignment service

Before using this pattern in an application, the service writing tuples must enforce these contracts:

- **Ownership:** use globally unique, tenant-qualified IDs for tenant-owned resources, groups, grants, and custom policies. Validate every subject, parent link, and scope attachment. Keto does not infer tenant boundaries from ID prefixes.
- **Grant integrity:** attach a grant only where its entire membership and permission union should apply. Permission tuples must point back to that grant's own members; the schema's types alone do not enforce this identity constraint.
- **Template updates and revocation:** recompute each affected grant from its remaining roles, including transitive role inclusion. Changing F2 also affects grants assigned F1. Removing F9 from an F2+F9 grant must preserve permissions still supplied by F2. Direct tuples likewise require tracking overlapping assignments before deleting shared permissions.
- **Lifecycle and consistency:** implement expiry, approval rules, dependencies, concurrency control, and retry behavior. Tuples have no built-in expiry. Deleting role metadata does not revoke materialized permissions.
- **Reconciliation:** distinguish generated desired state from live updates. The verifier inserts tuples into a store; it does not delete stale tuples. Use fresh in-memory instances for these examples.

## Repository map

| Path | Purpose |
| --- | --- |
| `model/` | Permission catalog, role templates, resource graph, assignments, and expected checks. |
| `gen/` | Standard-library Go generator, HTTP verifier, and assignment-ID regression tests. |
| `setup-a-grants/` | Generated grant model, tuples, config, and recorded results. |
| `setup-b-direct/` | Generated direct model, tuples, config, and recorded results. |
| `test/run.sh`, `test/lib.sh` | Keto lifecycle, baseline matrix, depth exploration, and load comparison. |
| `test/runner-errors.sh` | Fault-injection checks for incomplete verification runs. |
| `test/prior-pattern/` | Separate illustration of access crossing scopes through a shared permission-bearing role. |
| `.github/workflows/check.yml` | Go and shell checks plus generated-file consistency on pushes and pull requests. |

`make prior` runs the shared-role illustration. It expects cross-client checks to deny and exits 1 when the illustrated hazard occurs. This is a constructed example, not evidence of a vulnerability in a deployed system.
