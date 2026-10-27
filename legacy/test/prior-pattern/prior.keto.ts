// Illustrative shared-role hazard: two resource-scoped groups share one
// permission-bearing role. User_Group forwards permission checks to that role,
// whose membership combines both groups. This constructed example does not
// establish exposure in a deployed system.
import { Namespace, SubjectSet, Context } from "@ory/keto-namespace-types"

class User implements Namespace {}

class Platform_role implements Namespace {
  related: {
    User_Group: SubjectSet<User_Group, "Members">[]
    Customer_View: Platform_role[]
  }

  permits = {
    RolePermitted_Customer_View: (ctx: Context): boolean =>
      this.related.Customer_View.traverse((t) => t.related.User_Group.includes(ctx.subject)),
  }
}

class User_Group implements Namespace {
  related: {
    Roles: Platform_role[]
    Members: User[]
  }

  permits = {
    RolePermitted_Customer_View: (ctx: Context): boolean =>
      this.related.Roles.traverse((r) => r.permits.RolePermitted_Customer_View(ctx)),
  }
}

class Customer implements Namespace {
  related: {
    Group_Assignments: User_Group[]
    View: User[]
  }

  permits = {
    Permit_View: (ctx: Context): boolean =>
      this.related.View.includes(ctx.subject) ||
      this.related.Group_Assignments.traverse((g) => g.permits.RolePermitted_Customer_View(ctx)),
  }
}
