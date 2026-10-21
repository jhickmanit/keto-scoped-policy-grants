// Command gen turns the policy catalog and an example tenant into Keto OPL and
// relationship tuples for two modelling styles, and verifies them against a
// running Keto.
//
//	go run gen/main.go                # write setup-a-grants/ and setup-b-direct/
//	go run gen/main.go verify -tuples setup-a-grants/tuples.json
//
// Each setup folder holds namespaces.keto.ts, tuples.json and keto.yml.
// Model A (grants): a Grant binds members to policy roles; the roles'
// permissions are materialized onto the grant and the grant is attached to one
// or more scopes. Model B (direct): every assignment is expanded into one tuple
// per permission on the scope.
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"time"
)

type catalog struct {
	Scopes []struct {
		Name    string   `json:"name"`
		Parents []string `json:"parents"`
	} `json:"scopes"`
	Permissions []struct {
		ID       string `json:"id"`
		On       string `json:"on"`
		Proposed bool   `json:"proposed"`
	} `json:"permissions"`
	Roles []struct {
		ID          string   `json:"id"`
		Name        string   `json:"name"`
		Permissions []string `json:"permissions"`
		Includes    []string `json:"includes"`
	} `json:"roles"`
}

type scenario struct {
	Objects []struct {
		Ref     string   `json:"ref"`
		Parents []string `json:"parents"`
	} `json:"objects"`
	Groups      map[string][]string `json:"groups"`
	Assignments []struct {
		ID       string   `json:"id"`
		Scenario string   `json:"scenario"`
		Subjects []string `json:"subjects"`
		Roles    []string `json:"roles"`
		Scope    string   `json:"scope"`
	} `json:"assignments"`
	Checks []struct {
		Subject    string `json:"subject"`
		Permission string `json:"permission"`
		Object     string `json:"object"`
		Expect     bool   `json:"expect"`
		Why        string `json:"why"`
	} `json:"checks"`
}

type subjectSet struct {
	Namespace string `json:"namespace"`
	Object    string `json:"object"`
	Relation  string `json:"relation,omitempty"`
}

type tuple struct {
	Namespace  string     `json:"namespace"`
	Object     string     `json:"object"`
	Relation   string     `json:"relation"`
	SubjectSet subjectSet `json:"subject_set"`
}

// rel maps a legacy permission id to a Keto relation name. Keto master also
// accepts quoted names (this.related["Tax.TaxPreparation.TaxReturns.View"]), but
// identifiers work on every Keto version.
func rel(permissionID string) string { return strings.ReplaceAll(permissionID, ".", "_") }

func permit(permissionID string) string { return "Permit_" + rel(permissionID) }

func split(ref string) (string, string) {
	ns, obj, ok := strings.Cut(ref, ":")
	if !ok {
		fail("bad object reference %q, want Namespace:id", ref)
	}
	return ns, obj
}

// subject turns "User:alice" into a plain subject and "Group:x" into the
// Group:x#members subject set.
func subject(ref string) subjectSet {
	ns, obj := split(ref)
	if ns == "Group" {
		return subjectSet{ns, obj, "members"}
	}
	return subjectSet{Namespace: ns, Object: obj}
}

func fail(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}

func readJSON(path string, v any) {
	b, err := os.ReadFile(path)
	if err != nil {
		fail("%v", err)
	}
	if err := json.Unmarshal(b, v); err != nil {
		fail("%s: %v", path, err)
	}
}

func main() {
	root := flag.String("root", ".", "work folder containing model/ and the setup-* folders")
	flag.Parse()

	var cat catalog
	var scn scenario
	readJSON(filepath.Join(*root, "model/catalog.json"), &cat)
	readJSON(filepath.Join(*root, "model/scenario.json"), &scn)

	if err := validateAssignments(scn); err != nil {
		fail("%v", err)
	}

	if flag.Arg(0) == "verify" {
		verify(scn, flag.Args()[1:])
		return
	}

	// checkableOn[ns] lists the permissions with a permit on ns: those whose
	// 'on' scope is ns or below it.
	parents := map[string][]string{}
	for _, s := range cat.Scopes {
		parents[s.Name] = s.Parents
	}
	var ancestorsOrSelf func(string) []string
	ancestorsOrSelf = func(ns string) []string {
		out := []string{ns}
		for _, p := range parents[ns] {
			for _, a := range ancestorsOrSelf(p) {
				if !slices.Contains(out, a) {
					out = append(out, a)
				}
			}
		}
		return out
	}
	checkableOn := map[string][]string{}
	permOn := map[string]string{}
	for _, p := range cat.Permissions {
		permOn[p.ID] = p.On
		for _, ns := range ancestorsOrSelf(p.On) {
			checkableOn[ns] = append(checkableOn[ns], p.ID)
		}
	}

	// Tuples shared by both models: group membership and the resource tree.
	var base []tuple
	for g, users := range scn.Groups {
		for _, u := range users {
			base = append(base, tuple{"Group", g, "members", subject("User:" + u)})
		}
	}
	for _, o := range scn.Objects {
		ns, obj := split(o.Ref)
		for _, p := range o.Parents {
			pns, pobj := split(p)
			base = append(base, tuple{ns, obj, "parents", subjectSet{Namespace: pns, Object: pobj}})
		}
	}

	roles := map[string][]string{} // role -> its own permissions, before includes
	includes := map[string][]string{}
	for _, r := range cat.Roles {
		roles[r.ID] = r.Permissions
		includes[r.ID] = r.Includes
	}
	var expand func(string) []string
	expand = func(role string) []string {
		perms := slices.Clone(roles[role])
		for _, c := range includes[role] {
			for _, p := range expand(c) {
				if !slices.Contains(perms, p) {
					perms = append(perms, p)
				}
			}
		}
		return perms
	}

	// Model A: a grant records its members and roles, and the roles' permissions
	// are materialized onto the grant (Grant:g#<permission>@Grant:g#members).
	// Checks never visit the Role object, so its fan-in across every tenant's
	// grants cannot hit max_read_width. Changing a role template means
	// rewriting the permission tuples of the grants that list it.
	var grants []tuple
	for _, a := range scn.Assignments {
		ns, obj := split(a.Scope)
		for _, s := range a.Subjects {
			grants = append(grants, tuple{"Grant", a.ID, "members", subject(s)})
		}
		var perms []string
		for _, r := range a.Roles {
			grants = append(grants, tuple{"Grant", a.ID, "roles", subjectSet{Namespace: "Role", Object: r}})
			for _, p := range expand(r) {
				if !slices.Contains(perms, p) {
					perms = append(perms, p)
				}
			}
		}
		for _, p := range perms {
			grants = append(grants, tuple{"Grant", a.ID, rel(p), subjectSet{"Grant", a.ID, "members"}})
		}
		grants = append(grants, tuple{ns, obj, "grants", subjectSet{Namespace: "Grant", Object: a.ID}})
	}

	// Model B: one tuple per (subject, permission) on the scope. Permissions
	// that are only checkable above the scope cannot be granted there.
	var direct []tuple
	for _, a := range scn.Assignments {
		ns, obj := split(a.Scope)
		var perms, dropped []string
		for _, r := range a.Roles {
			for _, p := range expand(r) {
				if slices.Contains(perms, p) || slices.Contains(dropped, p) {
					continue
				}
				if slices.Contains(checkableOn[ns], p) {
					perms = append(perms, p)
				} else {
					dropped = append(dropped, p)
				}
			}
		}
		for _, p := range perms {
			for _, s := range a.Subjects {
				direct = append(direct, tuple{ns, obj, rel(p), subject(s)})
			}
		}
		for _, p := range dropped {
			fmt.Printf("note: %s grants %s, which is checked on %s and cannot apply at %s\n", a.ID, p, permOn[p], a.Scope)
		}
	}

	for _, s := range []struct {
		dir    string
		grants bool
		tuples []tuple
	}{
		{"setup-a-grants", true, slices.Concat(base, grants)},
		{"setup-b-direct", false, slices.Concat(base, direct)},
	} {
		dir := filepath.Join(*root, s.dir)
		if err := os.MkdirAll(dir, 0o755); err != nil {
			fail("%v", err)
		}
		slices.SortFunc(s.tuples, func(a, b tuple) int {
			return strings.Compare(tupleKey(a), tupleKey(b))
		})
		tuples, err := json.MarshalIndent(s.tuples, "", "  ")
		if err != nil {
			fail("encode tuples: %v", err)
		}
		for name, content := range map[string][]byte{
			"namespaces.keto.ts": []byte(renderOPL(cat, checkableOn, s.grants)),
			"tuples.json":        append(tuples, '\n'),
			"keto.yml":           []byte(ketoConfig),
		} {
			if err := os.WriteFile(filepath.Join(dir, name), content, 0o644); err != nil {
				fail("%v", err)
			}
		}
		fmt.Printf("%s: %d tuples (%d shared, %d for %d assignments)\n",
			s.dir, len(s.tuples), len(base), len(s.tuples)-len(base), len(scn.Assignments))
	}
}

// ketoConfig mirrors the limits Ory Network sets for every project
// (keto/keto/corpctx/project.go) with strict mode on. Run keto from the setup
// folder so the relative namespaces location resolves.
const ketoConfig = `# Generated by gen/main.go. Ory Network limits, strict mode on.
dsn: memory
namespaces:
  location: file://./namespaces.keto.ts
feature_flags:
  strict_mode: true
limit:
  max_read_depth: 10
  max_read_width: 100
log:
  level: error
`

func renderOPL(cat catalog, checkableOn map[string][]string, grants bool) string {
	var b strings.Builder
	w := func(format string, args ...any) { fmt.Fprintf(&b, format, args...) }

	model := "B (direct)"
	if grants {
		model = "A (grants)"
	}
	w("// Generated by gen/main.go from model/catalog.json. Model %s.\n", model)
	w("import { Namespace, SubjectSet, Context } from \"@ory/keto-namespace-types\"\n\n")
	w("class User implements Namespace {}\n\n")
	w("class Group implements Namespace {\n  related: {\n    members: (User | SubjectSet<Group, \"members\">)[]\n  }\n}\n\n")

	if grants {
		w("// A policy template such as F2 Tax Preparers. Its permission list lives in the\n")
		w("// catalog; checks never read it. Grant:g#roles@Role:F2 records which template\n")
		w("// a grant was materialized from, so a template change can find its grants.\n")
		w("class Role implements Namespace {}\n\n")

		w("// Binds members to roles. The roles' permissions are written onto the grant\n")
		w("// (Grant:g#<permission>@Grant:g#members). The scopes a grant applies to are\n")
		w("// the objects that point at it through their grants relation.\n")
		w("class Grant implements Namespace {\n  related: {\n")
		w("    members: (User | SubjectSet<Group, \"members\">)[]\n")
		w("    roles: Role[]\n")
		for _, p := range cat.Permissions {
			w("    %s: SubjectSet<Grant, \"members\">[]\n", rel(p.ID))
		}
		w("  }\n}\n\n")
	}

	for _, s := range cat.Scopes {
		w("class %s implements Namespace {\n  related: {\n", s.Name)
		if len(s.Parents) > 0 {
			w("    parents: (%s)[]\n", strings.Join(s.Parents, " | "))
		}
		if grants {
			w("    grants: Grant[]\n")
		} else {
			for _, p := range checkableOn[s.Name] {
				w("    %s: (User | SubjectSet<Group, \"members\">)[]\n", rel(p))
			}
		}
		w("  }\n\n  permits = {\n")
		for _, p := range checkableOn[s.Name] {
			var terms []string
			if grants {
				terms = append(terms, fmt.Sprintf("this.related.grants.traverse((g) => g.related.%s.includes(ctx.subject))", rel(p)))
			} else {
				terms = append(terms, fmt.Sprintf("this.related.%s.includes(ctx.subject)", rel(p)))
			}
			if len(s.Parents) > 0 {
				terms = append(terms, fmt.Sprintf("this.related.parents.traverse((p) => p.permits.%s(ctx))", permit(p)))
			}
			w("    %s: (ctx: Context): boolean =>\n      %s,\n\n", permit(p), strings.Join(terms, " ||\n      "))
		}
		w("  }\n}\n\n")
	}
	return strings.TrimRight(b.String(), "\n") + "\n"
}

func verify(scn scenario, args []string) {
	fs := flag.NewFlagSet("verify", flag.ExitOnError)
	tuplesPath := fs.String("tuples", "", "tuples JSON to load")
	read := fs.String("read", "http://127.0.0.1:4466", "Keto read API")
	write := fs.String("write", "http://127.0.0.1:4467", "Keto write API")
	maxDepth := fs.Int("max-depth", 0, "per-request max depth (0 = server default)")
	_ = fs.Parse(args)

	var tuples []tuple
	readJSON(*tuplesPath, &tuples)
	type patch struct {
		Action        string `json:"action"`
		RelationTuple tuple  `json:"relation_tuple"`
	}
	patches := make([]patch, len(tuples))
	for i, t := range tuples {
		patches[i] = patch{"insert", t}
	}
	if _, err := call(http.MethodPatch, *write+"/admin/relation-tuples", patches); err != nil {
		fail("load tuples: %v", err)
	}

	checkURL := *read + "/relation-tuples/check/openapi"
	if *maxDepth > 0 {
		checkURL += fmt.Sprintf("?max-depth=%d", *maxDepth)
	}
	failed := 0
	for _, c := range scn.Checks {
		ns, obj := split(c.Object)
		// Keto answers a check it cannot finish (max_depth_exceeded) with a 422;
		// count that as a failure and keep going.
		body, err := call(http.MethodPost, checkURL, tuple{ns, obj, permit(c.Permission), subject("User:" + c.Subject)})
		var res struct {
			Allowed *bool  `json:"allowed"`
			Error   string `json:"error"`
		}
		if err != nil {
			res.Error = err.Error()
		} else if err := json.Unmarshal(body, &res); err != nil {
			fail("check response %s: %v", body, err)
		}
		if res.Allowed == nil && res.Error == "" {
			fail("check response missing allowed: %s", body)
		}
		allowed := res.Allowed != nil && *res.Allowed
		status := "ok  "
		if allowed != c.Expect || res.Error != "" {
			status = "FAIL"
			failed++
		}
		fmt.Printf("%s %-6s %-5t %-60s %s %s\n", status, c.Subject, allowed, c.Permission, c.Object, res.Error)
	}
	fmt.Printf("%d/%d checks passed\n", len(scn.Checks)-failed, len(scn.Checks))
	if failed > 0 {
		os.Exit(1)
	}
}

func call(method, url string, payload any) ([]byte, error) {
	b, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest(method, url, bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := (&http.Client{Timeout: 30 * time.Second}).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 300 {
		var e struct {
			Error struct {
				Reason string `json:"reason"`
			} `json:"error"`
		}
		if json.Unmarshal(body, &e) == nil && e.Error.Reason != "" {
			return nil, fmt.Errorf("%d %s", resp.StatusCode, e.Error.Reason)
		}
		return nil, fmt.Errorf("%s %s: %d %s", method, url, resp.StatusCode, body)
	}
	return body, nil
}

// Assignment IDs become global Grant object IDs in Setup A. Reusing an ID
// would merge memberships, permission unions, and scopes across assignments.
func validateAssignments(scn scenario) error {
	seen := map[string]bool{}
	for _, a := range scn.Assignments {
		if strings.TrimSpace(a.ID) == "" {
			return fmt.Errorf("assignment ID must not be empty")
		}
		if seen[a.ID] {
			return fmt.Errorf("duplicate assignment ID %q: grant IDs must be globally unique", a.ID)
		}
		seen[a.ID] = true
	}
	if len(scn.Checks) == 0 {
		return fmt.Errorf("scenario must contain at least one check")
	}
	return nil
}

func tupleKey(t tuple) string {
	return strings.Join([]string{t.Namespace, t.Object, t.Relation, t.SubjectSet.Namespace, t.SubjectSet.Object, t.SubjectSet.Relation}, "\x00")
}
