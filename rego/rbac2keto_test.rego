package rbac2keto_test

import data.rbac2keto

m := {
	"role_instance_mode": "per_assignment",
	"role_namespace": "Platform_role",
	"holder_namespace": "User_Group",
	"holder_relation": "User_Group",
	"group_namespaces": {"Org": "Org_Group", "Customer": "Customer_Group", "Project": "Project_Group"},
	"admin": {"namespace": "Org", "relation": "admin"},
	"permissions": {
		"Org.Admin": {"namespace": "Org", "relation": "admin"},
		"Customer.View": {"namespace": "Customer", "relation": "view"},
		"Customer.Edit": {"namespace": "Customer", "relation": "edit"},
		"Return.View": {"namespace": "Project", "relation": "view"},
	},
	"ignored": {"Submit.Release": "no target"},
}

legacy := {
	"tenant": "t",
	"org": "t",
	"users": ["u1", "u2", "u3"],
	"groups": [
		{"id": "inner", "members": ["u1"]},
		{"id": "outer", "members": ["u2"], "member_groups": ["inner"]},
	],
	"customers": [{"id": "c1"}, {"id": "c2"}, {"id": "c3"}],
	"projects": [{"id": "e1", "customer": "c1"}, {"id": "e3", "customer": "c3"}],
	"customer_groups": [{"id": "most", "include_all": true, "exclude": ["c3"]}],
	"roles": [
		{"id": "prep", "kind": "standard", "permissions": ["Customer.View", "Return.View"]},
		{"id": "admin", "kind": "standard", "permissions": ["Customer.View", "Customer.Edit"]},
		{"id": "full", "kind": "standard", "includes": ["prep", "admin"]},
		{"id": "tmp", "kind": "temporary", "permissions": ["Submit.Release"]},
	],
	"assignments": [
		{"id": "a-group", "subjects": [{"group": "outer"}], "roles": ["prep"], "scope": {"type": "CustomerGroup", "id": "most"}},
		{"id": "a-u3-c1", "subjects": [{"user": "u3"}], "roles": ["prep"], "scope": {"type": "Customer", "id": "c1"}},
		{"id": "a-u3-c3", "subjects": [{"user": "u3"}], "roles": ["prep"], "scope": {"type": "Customer", "id": "c3"}},
		{"id": "a-u1-admin", "subjects": [{"user": "u1"}], "roles": ["admin"], "scope": {"type": "Customer", "id": "c2"}},
		{"id": "a-tmp", "subjects": [{"user": "u2"}], "roles": ["tmp"], "scope": {"type": "Org"}},
	],
}

instance_of(id, r) := [i | some b in r.ledger; b.assignment == id; some i in b.instances][0]

# prep is a standard template in the OPL; admin is not.
with_standard := object.union(m, {"standard_roles": {"prep": {"relation": "PREP", "permissions": ["Customer.View", "Return.View"]}}})

has_allow(r, entry) if entry in r.parity.allow

test_exclusion_is_materialised if {
	rbac2keto.customer_group_members(legacy.customer_groups[0]) == {"c1", "c2"} with input as legacy with data.mapping as m
}

test_nested_groups_are_flattened if {
	rbac2keto.group_users("outer") == {"u1", "u2"} with input as legacy with data.mapping as m
}

test_role_inclusion_closure if {
	rbac2keto.role_permissions(["full"]) == {"Customer.View", "Customer.Edit", "Return.View"} with input as legacy with data.mapping as m
}

test_same_holders_and_permissions_share_an_instance if {
	r := rbac2keto.result with input as legacy with data.mapping as m
	instance_of("a-u3-c1", r) == instance_of("a-u3-c3", r)
	instance_of("a-u3-c1", r) != instance_of("a-group", r)
}

test_different_permissions_get_different_instances if {
	r := rbac2keto.result with input as legacy with data.mapping as m
	instance_of("a-u1-admin", r) != instance_of("a-group", r)
}

test_temporary_role_is_held_for_review if {
	r := rbac2keto.result with input as legacy with data.mapping as m
	not instance_of("a-tmp", r)
	r.status == "needs_review"
}

test_unmapped_permission_blocks if {
	bad := json.patch(legacy, [{"op": "add", "path": "/roles/0/permissions/-", "value": "Unknown.Perm"}])
	r := rbac2keto.result with input as bad with data.mapping as m
	r.status == "blocked"
}

test_unknown_scope_blocks if {
	bad := json.patch(legacy, [{"op": "replace", "path": "/assignments/1/scope/id", "value": "nope"}])
	r := rbac2keto.result with input as bad with data.mapping as m
	r.status == "blocked"
	not instance_of("a-u3-c1", r)
}

test_oracle_scopes_each_assignment if {
	r := rbac2keto.result with input as legacy with data.mapping as m
	has_allow(r, ["u1", "Customer", "edit", "c2"])
	not has_allow(r, ["u1", "Customer", "edit", "c1"])
	has_allow(r, ["u2", "Project", "view", "e1"])
	not has_allow(r, ["u2", "Project", "view", "e3"])
}

test_shared_mode_reuses_one_instance_per_role if {
	shared := object.union(m, {"role_instance_mode": "shared_role"})
	r := rbac2keto.result with input as legacy with data.mapping as shared
	instance_of("a-group", r) == "t:role:prep"
	instance_of("a-u3-c1", r) == "t:role:prep"
}

test_standard_role_is_a_direct_group_relation if {
	r := rbac2keto.result with input as legacy with data.mapping as with_standard
	not instance_of("a-group", r)
	{"namespace": "Customer_Group", "object": "t:rg:customergroup:most:Customer", "relation": "PREP", "subject_set": {"namespace": "User_Group", "object": "t:g:outer", "relation": "Members"}} in r.tuples
	instance_of("a-u1-admin", r)
}

test_edited_standard_role_falls_back_to_custom if {
	edited := json.patch(legacy, [{"op": "add", "path": "/roles/0/permissions/-", "value": "Customer.Edit"}])
	r := rbac2keto.result with input as edited with data.mapping as with_standard
	instance_of("a-group", r)
	some i in r.issues
	i.role == "prep"
}

test_mixed_assignment_splits_standard_and_custom if {
	mixed := json.patch(legacy, [{"op": "replace", "path": "/assignments/0/roles", "value": ["prep", "admin"]}])
	r := rbac2keto.result with input as mixed with data.mapping as with_standard
	some b in r.ledger
	b.assignment == "a-group"
	b.static_roles == ["prep"]
	b.custom_roles == ["admin"]
	count(b.instances) == 1
}
