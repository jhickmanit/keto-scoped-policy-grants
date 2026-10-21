package main

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

func TestAssignmentIdentityValidation(t *testing.T) {
	b, err := os.ReadFile("../model/scenario.json")
	if err != nil {
		t.Fatal(err)
	}
	var scn scenario
	if err := json.Unmarshal(b, &scn); err != nil {
		t.Fatal(err)
	}
	if err := validateAssignments(scn); err != nil {
		t.Fatal(err)
	}
	scn.Assignments[1].ID = scn.Assignments[0].ID
	if err := validateAssignments(scn); err == nil || !strings.Contains(err.Error(), "duplicate assignment ID") {
		t.Fatalf("expected duplicate grant identity rejection, got %v", err)
	}
	scn.Assignments[1].ID = ""
	if err := validateAssignments(scn); err == nil {
		t.Fatal("empty grant identity accepted")
	}
}
