# METADATA
# title: Legacy RBAC export -> Ory Keto relation tuples
# description: |
#   Pure transform. input is one tenant's legacy export (groups, memberships,
#   roles, scoped assignments); data.mapping is the target-OPL profile. It
#   emits desired tuples, an assignment ledger, issues that need a decision,
#   and the expected allow set for parity checks. It does not call Keto.
package rbac2keto

mapping := data.mapping

tenant := input.tenant

org := input.org

mode := object.get(mapping, "role_instance_mode", "per_assignment")

# Objects this tool mints are tenant-qualified. Legacy resource and user IDs
# are used as-is and must already be globally unique.
minted(kind, id) := sprintf("%s:%s:%s", [tenant, kind, id])

# ---------------------------------------------------------------- catalog

roles[r.id] := r if some r in input.roles

role_includes[id] := object.get(r, "includes", []) if some id, r in roles

role_closure(ids) := graph.reachable(role_includes, ids)

role_permissions(ids) := {p |
	some rid in role_closure(ids)
	some p in object.get(roles, [rid, "permissions"], [])
}

blocked_kinds := {"temporary", "artifact"}

blocked_roles(a) := {rid |
	some rid in role_closure(a.roles)
	roles[rid].kind in blocked_kinds
}

unknown_roles(a) := {rid | some rid in role_closure(a.roles); not roles[rid]}

mapped(p) := mapping.permissions[p]

role_namespaces(ids) := {mapped(p).namespace | some p in role_permissions(ids); mapped(p)}

# A legacy role becomes a fixed OPL relation only when the target OPL defines
# it and the org's copy still matches the template. An edited R2 is custom.
static_role(rid) if {
	roles[rid].kind == "standard"
	role_permissions([rid]) == {p | some p in mapping.standard_roles[rid].permissions}
}

static_roles(a) := {r | some r in a.roles; static_role(r)}

dynamic_roles(a) := [r | some r in a.roles; not static_role(r)]

# ---------------------------------------------------------------- subjects

users := {u | some u in input.users}

groups[g.id] := g if some g in input.groups

group_children[id] := object.get(g, "member_groups", []) if some id, g in groups

# Legacy groups may nest; the target User_Group only holds users, so
# membership is flattened to the transitive closure.
group_users(gid) := {u |
	some g in graph.reachable(group_children, {gid})
	some u in object.get(groups, [g, "members"], [])
}

holder_group(s) := minted("g", s.group) if s.group

holder_group(s) := minted("u", s.user) if s.user

holders(a) := {holder_group(s) | some s in a.subjects}

holder_users(a) := {u | some s in a.subjects; some u in group_users(s.group)} | {s.user | some s in a.subjects; s.user}

# ---------------------------------------------------------------- resources

customers := {c.id | some c in input.customers}

project_customer[e.id] := e.customer if some e in input.projects

customer_groups[g.id] := g if some g in input.customer_groups

# Legacy include/exclude set logic is evaluated here and materialised as
# group membership. Re-run when the underlying sets change.
customer_group_members(g) := (({c | some c in customers; object.get(g, "include_all", false)} | {c | some c in object.get(g, "include", [])}) - {c | some c in object.get(g, "exclude", [])}) & customers

scope_customers(s) := customers if s.type == "Org"

scope_customers(s) := {s.id} & customers if s.type == "Customer"

scope_customers(s) := customer_group_members(customer_groups[s.id]) if s.type == "CustomerGroup"

# The base OPL has no Project -> Customer or Customer -> Org traversal
# for non-admin permissions, so scope inheritance is materialised per type.
scope_resources(s, "Customer") := scope_customers(s)

scope_resources(s, "Project") := {e | some e, c in project_customer; c in scope_customers(s)}

scope_resources(s, "Org") := {org} if s.type == "Org"

scope_resources(s, "Org") := set() if s.type != "Org"

tenant_resources("Org") := {org}

tenant_resources("Customer") := customers

tenant_resources("Project") := {e | some e, _ in project_customer}

scope_key(s) := sprintf("%s:%s", [lower(s.type), object.get(s, "id", org)])

resource_group(s, ns) := minted("rg", sprintf("%s:%s", [scope_key(s), ns]))

# ---------------------------------------------------------------- assignments

resolvable(a) if {
	count(unknown_roles(a)) == 0
	every s in a.subjects {
		holder_ok(s)
	}
	scope_ok(a.scope)
}

holder_ok(s) if groups[s.group]

holder_ok(s) if s.user in users

scope_ok(s) if s.type == "Org"

scope_ok(s) if {
	s.type == "Customer"
	s.id in customers
}

scope_ok(s) if {
	s.type == "CustomerGroup"
	customer_groups[s.id]
}

active contains a if {
	some a in input.assignments
	resolvable(a)
	count(blocked_roles(a)) == 0
}

# Custom roles become role instances. An instance binds one holder set to one
# permission set. Keying it on both makes reuse across scopes safe: everyone
# attached gets everything attached. "shared_role" reproduces one instance per
# legacy role, which leaks access between unrelated assignments; it is kept
# for comparison only.
binding_key(a) := sprintf("%s|%s", [
	concat(",", sort(holders(a))),
	concat(",", sort({p | some p in role_permissions(dynamic_roles(a)); mapped(p)})),
])

bindings contains {"assignment": a.id, "instance": instance, "roles": dynamic_roles(a), "holders": holders(a), "scope": a.scope} if {
	mode == "per_assignment"
	some a in active
	count(dynamic_roles(a)) > 0
	instance := minted("ri", substring(crypto.sha256(binding_key(a)), 0, 12))
}

bindings contains {"assignment": a.id, "instance": minted("role", r), "roles": [r], "holders": holders(a), "scope": a.scope} if {
	mode == "shared_role"
	some a in active
	some r in dynamic_roles(a)
}

binding_namespaces(b) := role_namespaces(b.roles)

# Resource groups needed by any assignment, for standard and custom roles.
scoped contains [a.scope, ns] if {
	some a in active
	some ns in role_namespaces(a.roles)
}

# ---------------------------------------------------------------- tuples

ref(ns, id) := {"namespace": ns, "object": id}

tuple(ns, obj, rel, subject) := {"namespace": ns, "object": obj, "relation": rel, "subject_set": subject}

# The role instance enables a permission by pointing at itself (base OPL pattern).
tuples contains tuple(mapping.role_namespace, b.instance, sprintf("%s_%s", [m.namespace, m.relation]), ref(mapping.role_namespace, b.instance)) if {
	some b in bindings
	some p in role_permissions(b.roles)
	m := mapped(p)
}

tuples contains tuple(mapping.role_namespace, b.instance, mapping.holder_relation, object.union(ref(mapping.holder_namespace, h), {"relation": "Members"})) if {
	some b in bindings
	some h in b.holders
}

tuples contains tuple(mapping.group_namespaces[ns], resource_group(b.scope, ns), "Roles", ref(mapping.role_namespace, b.instance)) if {
	some b in bindings
	some ns in binding_namespaces(b)
	count(scope_resources(b.scope, ns)) > 0
}

# Standard roles: one tuple from the resource group straight to each holder.
tuples contains tuple(mapping.group_namespaces[ns], resource_group(a.scope, ns), mapping.standard_roles[r].relation, object.union(ref(mapping.holder_namespace, h), {"relation": "Members"})) if {
	some a in active
	some r in static_roles(a)
	some ns in role_namespaces([r])
	count(scope_resources(a.scope, ns)) > 0
	some h in holders(a)
}

tuples contains tuple(ns, r, "Group_Assignments", ref(mapping.group_namespaces[ns], resource_group(s, ns))) if {
	some [s, ns] in scoped
	some r in scope_resources(s, ns)
}

used_holders := {h: users_of | some a in active; some s in a.subjects; h := holder_group(s); users_of := holder_users({"subjects": [s]})}

tuples contains tuple(mapping.holder_namespace, h, "Members", ref("User", u)) if {
	some h, us in used_holders
	some u in us
}

tuples contains tuple(ns, r, "Tenancy", ref("Org", org)) if {
	some ns in {"Customer", "Project"}
	some r in tenant_resources(ns)
}

# ---------------------------------------------------------------- issues

issues contains {"level": "error", "assignment": a.id, "message": sprintf("unknown role %s", [r])} if {
	some a in input.assignments
	some r in unknown_roles(a)
}

issues contains {"level": "error", "assignment": a.id, "message": sprintf("unknown subject %v", [s])} if {
	some a in input.assignments
	some s in a.subjects
	not holder_ok(s)
}

issues contains {"level": "error", "assignment": a.id, "message": sprintf("unknown scope %v", [a.scope])} if {
	some a in input.assignments
	not scope_ok(a.scope)
}

issues contains {"level": "error", "group": g.id, "message": sprintf("unknown member user %s", [u])} if {
	some g in input.groups
	some u in object.get(g, "members", [])
	not u in users
}

issues contains {"level": "error", "role": rid, "message": sprintf("permission %s is neither mapped nor explicitly ignored", [p])} if {
	some rid, r in roles
	some p in object.get(r, "permissions", [])
	not mapped(p)
	not mapping.ignored[p]
}

issues contains {"level": "review", "assignment": a.id, "message": sprintf("not migrated: includes %s role %s; decide whether it becomes standing access", [roles[r].kind, r])} if {
	some a in input.assignments
	resolvable(a)
	some r in blocked_roles(a)
}

issues contains {"level": "review", "assignment": a.id, "message": sprintf("permission %s dropped: %s", [p, mapping.ignored[p]])} if {
	some a in active
	some p in role_permissions(a.roles)
	mapping.ignored[p]
}

issues contains {"level": "review", "assignment": a.id, "message": sprintf("%s permissions are only checkable on the Org; not granted at %s scope", [ns, a.scope.type])} if {
	some a in active
	some p in role_permissions(a.roles)
	ns := mapped(p).namespace
	count(scope_resources(a.scope, ns)) == 0
	count(scope_customers(a.scope)) > 0
}

issues contains {"level": "review", "assignment": a.id, "message": "scope resolves to no customers"} if {
	some a in active
	count(scope_customers(a.scope)) == 0
}

issues contains {"level": "info", "group": g, "message": sprintf("nested groups flattened: %v", [sort(graph.reachable(group_children, {g}) - {g})])} if {
	some g, children in group_children
	count(children) > 0
}

issues contains {"level": "info", "resource_group": resource_group(s, ns), "message": "materialised resource group; the app must add new resources to it after migration"} if {
	some [s, ns] in scoped
	s.type != "Customer"
	ns != "Org"
	count(scope_resources(s, ns)) > 0
}

issues contains {"level": "info", "role": rid, "message": "differs from the standard template; migrated as a custom role"} if {
	some rid, r in roles
	r.kind == "standard"
	mapping.standard_roles[rid]
	not static_role(rid)
}

# ---------------------------------------------------------------- parity oracle

# Intended legacy semantics, computed from the export without reference to
# Keto's graph. Assumption A3: a Org admin holds every permission in the org
# (matches the OPL's Tenancy rule; confirm the legacy system agrees).
granted contains [u, m.namespace, m.relation, r] if {
	some a in active
	some u in holder_users(a)
	some p in role_permissions(a.roles)
	m := mapped(p)
	some r in scope_resources(a.scope, m.namespace)
}

admins := {g[0] | some g in granted; g[1] == mapping.admin.namespace; g[2] == mapping.admin.relation}

allow := granted | {[u, m.namespace, m.relation, r] |
	some u in admins
	some _, m in mapping.permissions
	some r in tenant_resources(m.namespace)
}

# ---------------------------------------------------------------- result

ledger := [{
	"assignment": a.id,
	"scope": a.scope,
	"static_roles": sort(static_roles(a)),
	"custom_roles": dynamic_roles(a),
	"instances": sort({b.instance | some b in bindings; b.assignment == a.id}),
} |
	some a in active
]

status := "blocked" if {
	some i in issues
	i.level == "error"
} else := "needs_review" if {
	some i in issues
	i.level == "review"
} else := "ready"

result := {
	"tenant": tenant,
	"mode": mode,
	"status": status,
	"tuples": sort(tuples),
	"issues": sort(issues),
	"ledger": sort(ledger),
	"parity": {
		"subjects": sort(users),
		"objects": sort([{"namespace": ns, "object": r} | some ns in object.keys(mapping.group_namespaces); some r in tenant_resources(ns)]),
		"relations": sort({[m.namespace, m.relation] | some _, m in mapping.permissions}),
		"allow": sort(allow),
	},
}
