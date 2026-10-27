// Decomposition: Composed
import { Namespace, SubjectSet, Context } from "@ory/permission-namespace-types"


class Platform implements Namespace {

	permits = 
	{
	}
}

class Attribute implements Namespace {

	permits = 
	{
	}
}

class Platform_role implements Namespace {
	related: 
	{
		ServiceAccount_Group : (SubjectSet<ServiceAccount_Group,"Members">)[]

		ServiceAccount_a4a5d681dfe84b5dbff2a8f334018a91 : (Platform_role)[]

		User_Group : (SubjectSet<User_Group,"Members">)[]

		User_f8e199f6fd554de6a094a30b3ba4e1ed : (Platform_role)[]

		User_f247aa8909944866bfcf8dcf1c526671 : (Platform_role)[]

		User_f247aa8909944866bfcf8dcf1c526641 : (Platform_role)[]

		Customer_f8e199f6fd554de6a094a30b3ba4e1ed : (Platform_role)[]

		Customer_f247aa8909944866bfcf8dcf1c526671 : (Platform_role)[]

		Customer_f247aa8909944866bfcf8dcf1c534671 : (Platform_role)[]

		Customer_f247aa8909944866bfcf8dcf1c534672 : (Platform_role)[]

		Customer_f8e199f6fd554de6a094a30b3ba4e112 : (Platform_role)[]

		Customer_f247aa8909944866bfcf8dcf1c526654 : (Platform_role)[]

		Org_f40c3adf85734c28b2078245542c10e1 : (Platform_role)[]

		Org_ef9418454a744d6597066d021e5929f6 : (Platform_role)[]

		Org_f8e199f6fd554de6a094a30b3ba5e1ed : (Platform_role)[]

		Project_f8e199f6fd554de6a094a30b3ba4e1ed : (Platform_role)[]

		Project_f247aa8909944866bfcf8dcf1c526671 : (Platform_role)[]

		Project_f247aa8909944866bfcf8dcf1c526621 : (Platform_role)[]

		Suite : (Platform)[]

		Tenancy : (Org)[]

	}
	permits = 
	{
		//Aliases: N/A
		//Backing Relationship: ServiceAccount_a4a5d681dfe84b5dbff2a8f334018a91
		RolePermitted_ServiceAccount_a4a5d681dfe84b5dbff2a8f334018a91: (ctx) => 
			this.related.ServiceAccount_a4a5d681dfe84b5dbff2a8f334018a91.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: User_f8e199f6fd554de6a094a30b3ba4e1ed
		RolePermitted_User_f8e199f6fd554de6a094a30b3ba4e1ed: (ctx) => 
			this.related.User_f8e199f6fd554de6a094a30b3ba4e1ed.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: User_f247aa8909944866bfcf8dcf1c526671
		RolePermitted_User_f247aa8909944866bfcf8dcf1c526671: (ctx) => 
			this.related.User_f247aa8909944866bfcf8dcf1c526671.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: User_f247aa8909944866bfcf8dcf1c526641
		RolePermitted_User_f247aa8909944866bfcf8dcf1c526641: (ctx) => 
			this.related.User_f247aa8909944866bfcf8dcf1c526641.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Customer_f8e199f6fd554de6a094a30b3ba4e1ed
		RolePermitted_Customer_f8e199f6fd554de6a094a30b3ba4e1ed: (ctx) => 
			this.related.Customer_f8e199f6fd554de6a094a30b3ba4e1ed.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Customer_f247aa8909944866bfcf8dcf1c526671
		RolePermitted_Customer_f247aa8909944866bfcf8dcf1c526671: (ctx) => 
			this.related.Customer_f247aa8909944866bfcf8dcf1c526671.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Customer_f247aa8909944866bfcf8dcf1c534671
		RolePermitted_Customer_f247aa8909944866bfcf8dcf1c534671: (ctx) => 
			this.related.Customer_f247aa8909944866bfcf8dcf1c534671.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Customer_f247aa8909944866bfcf8dcf1c534672
		RolePermitted_Customer_f247aa8909944866bfcf8dcf1c534672: (ctx) => 
			this.related.Customer_f247aa8909944866bfcf8dcf1c534672.traverse((t) => 
				t.related.ServiceAccount_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Customer_f8e199f6fd554de6a094a30b3ba4e112
		RolePermitted_Customer_f8e199f6fd554de6a094a30b3ba4e112: (ctx) => 
			this.related.Customer_f8e199f6fd554de6a094a30b3ba4e112.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Customer_f247aa8909944866bfcf8dcf1c526654
		RolePermitted_Customer_f247aa8909944866bfcf8dcf1c526654: (ctx) => 
			this.related.Customer_f247aa8909944866bfcf8dcf1c526654.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Org_f40c3adf85734c28b2078245542c10e1
		RolePermitted_Org_f40c3adf85734c28b2078245542c10e1: (ctx) => 
			this.related.Org_f40c3adf85734c28b2078245542c10e1.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Org_ef9418454a744d6597066d021e5929f6
		RolePermitted_Org_ef9418454a744d6597066d021e5929f6: (ctx) => 
			this.related.Org_ef9418454a744d6597066d021e5929f6.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Org_f8e199f6fd554de6a094a30b3ba5e1ed
		RolePermitted_Org_f8e199f6fd554de6a094a30b3ba5e1ed: (ctx) => 
			this.related.Org_f8e199f6fd554de6a094a30b3ba5e1ed.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Project_f8e199f6fd554de6a094a30b3ba4e1ed
		RolePermitted_Project_f8e199f6fd554de6a094a30b3ba4e1ed: (ctx) => 
			this.related.Project_f8e199f6fd554de6a094a30b3ba4e1ed.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Project_f247aa8909944866bfcf8dcf1c526671
		RolePermitted_Project_f247aa8909944866bfcf8dcf1c526671: (ctx) => 
			this.related.Project_f247aa8909944866bfcf8dcf1c526671.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Project_f247aa8909944866bfcf8dcf1c526621
		RolePermitted_Project_f247aa8909944866bfcf8dcf1c526621: (ctx) => 
			this.related.Project_f247aa8909944866bfcf8dcf1c526621.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),
	}
}

class Platform_need implements Namespace {
	related: 
	{
		ServiceAccount_Group : (SubjectSet<ServiceAccount_Group,"Members">)[]

		ServiceAccount_a4a5d681dfe84b5dbff2a8f334018a91 : (Platform_need)[]

		User_Group : (SubjectSet<User_Group,"Members">)[]

		User_f8e199f6fd554de6a094a30b3ba4e1ed : (Platform_need)[]

		User_f247aa8909944866bfcf8dcf1c526671 : (Platform_need)[]

		User_f247aa8909944866bfcf8dcf1c526641 : (Platform_need)[]

		Customer_f8e199f6fd554de6a094a30b3ba4e1ed : (Platform_need)[]

		Customer_f247aa8909944866bfcf8dcf1c526671 : (Platform_need)[]

		Customer_f247aa8909944866bfcf8dcf1c534671 : (Platform_need)[]

		Customer_f247aa8909944866bfcf8dcf1c534672 : (Platform_need)[]

		Customer_f8e199f6fd554de6a094a30b3ba4e112 : (Platform_need)[]

		Customer_f247aa8909944866bfcf8dcf1c526654 : (Platform_need)[]

		Org_f40c3adf85734c28b2078245542c10e1 : (Platform_need)[]

		Org_ef9418454a744d6597066d021e5929f6 : (Platform_need)[]

		Org_f8e199f6fd554de6a094a30b3ba5e1ed : (Platform_need)[]

		Project_f8e199f6fd554de6a094a30b3ba4e1ed : (Platform_need)[]

		Project_f247aa8909944866bfcf8dcf1c526671 : (Platform_need)[]

		Project_f247aa8909944866bfcf8dcf1c526621 : (Platform_need)[]

		Suite : (Platform)[]

		Tenancy : (Org)[]

	}
	permits = 
	{
		//Aliases: N/A
		//Backing Relationship: ServiceAccount_a4a5d681dfe84b5dbff2a8f334018a91
		NeedPermitted_ServiceAccount_a4a5d681dfe84b5dbff2a8f334018a91: (ctx) => 
			this.related.ServiceAccount_a4a5d681dfe84b5dbff2a8f334018a91.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: User_f8e199f6fd554de6a094a30b3ba4e1ed
		NeedPermitted_User_f8e199f6fd554de6a094a30b3ba4e1ed: (ctx) => 
			this.related.User_f8e199f6fd554de6a094a30b3ba4e1ed.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: User_f247aa8909944866bfcf8dcf1c526671
		NeedPermitted_User_f247aa8909944866bfcf8dcf1c526671: (ctx) => 
			this.related.User_f247aa8909944866bfcf8dcf1c526671.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: User_f247aa8909944866bfcf8dcf1c526641
		NeedPermitted_User_f247aa8909944866bfcf8dcf1c526641: (ctx) => 
			this.related.User_f247aa8909944866bfcf8dcf1c526641.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Customer_f8e199f6fd554de6a094a30b3ba4e1ed
		NeedPermitted_Customer_f8e199f6fd554de6a094a30b3ba4e1ed: (ctx) => 
			this.related.Customer_f8e199f6fd554de6a094a30b3ba4e1ed.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Customer_f247aa8909944866bfcf8dcf1c526671
		NeedPermitted_Customer_f247aa8909944866bfcf8dcf1c526671: (ctx) => 
			this.related.Customer_f247aa8909944866bfcf8dcf1c526671.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Customer_f247aa8909944866bfcf8dcf1c534671
		NeedPermitted_Customer_f247aa8909944866bfcf8dcf1c534671: (ctx) => 
			this.related.Customer_f247aa8909944866bfcf8dcf1c534671.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Customer_f247aa8909944866bfcf8dcf1c534672
		NeedPermitted_Customer_f247aa8909944866bfcf8dcf1c534672: (ctx) => 
			this.related.Customer_f247aa8909944866bfcf8dcf1c534672.traverse((t) => 
				t.related.ServiceAccount_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Customer_f8e199f6fd554de6a094a30b3ba4e112
		NeedPermitted_Customer_f8e199f6fd554de6a094a30b3ba4e112: (ctx) => 
			this.related.Customer_f8e199f6fd554de6a094a30b3ba4e112.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Customer_f247aa8909944866bfcf8dcf1c526654
		NeedPermitted_Customer_f247aa8909944866bfcf8dcf1c526654: (ctx) => 
			this.related.Customer_f247aa8909944866bfcf8dcf1c526654.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Org_f40c3adf85734c28b2078245542c10e1
		NeedPermitted_Org_f40c3adf85734c28b2078245542c10e1: (ctx) => 
			this.related.Org_f40c3adf85734c28b2078245542c10e1.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Org_ef9418454a744d6597066d021e5929f6
		NeedPermitted_Org_ef9418454a744d6597066d021e5929f6: (ctx) => 
			this.related.Org_ef9418454a744d6597066d021e5929f6.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Org_f8e199f6fd554de6a094a30b3ba5e1ed
		NeedPermitted_Org_f8e199f6fd554de6a094a30b3ba5e1ed: (ctx) => 
			this.related.Org_f8e199f6fd554de6a094a30b3ba5e1ed.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Project_f8e199f6fd554de6a094a30b3ba4e1ed
		NeedPermitted_Project_f8e199f6fd554de6a094a30b3ba4e1ed: (ctx) => 
			this.related.Project_f8e199f6fd554de6a094a30b3ba4e1ed.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Project_f247aa8909944866bfcf8dcf1c526671
		NeedPermitted_Project_f247aa8909944866bfcf8dcf1c526671: (ctx) => 
			this.related.Project_f247aa8909944866bfcf8dcf1c526671.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),


		//Aliases: N/A
		//Backing Relationship: Project_f247aa8909944866bfcf8dcf1c526621
		NeedPermitted_Project_f247aa8909944866bfcf8dcf1c526621: (ctx) => 
			this.related.Project_f247aa8909944866bfcf8dcf1c526621.traverse((t) => 
				t.related.User_Group.includes(ctx.subject)),
	}
}

class ServiceAccount_Group implements Namespace {
	related: 
	{
		Roles : (Platform_role)[]

		Needs : (Platform_need)[]

		Members : (ServiceAccount)[]

		Suite : (Platform)[]

		Tenancy : (Org)[]

	}
	permits = 
	{
		//Aliases: N/A
		//Backing Relationship: Manage_ServiceAccount_Group_Members
		Permit_Manage_ServiceAccount_Group_Members: (ctx) => 
			this.related.Tenancy.traverse((t) => 
				t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx)),


		//Aliases: N/A
		//Backing Relationship: ServiceAccount_a4a5d681dfe84b5dbff2a8f334018a91
		Permit_ServiceAccount_a4a5d681dfe84b5dbff2a8f334018a91: (ctx) => 
			(
				this.related.Roles.traverse((t) => 
					t.permits.RolePermitted_ServiceAccount_a4a5d681dfe84b5dbff2a8f334018a91(ctx)) || 
				this.related.Needs.traverse((t) => 
					t.permits.NeedPermitted_ServiceAccount_a4a5d681dfe84b5dbff2a8f334018a91(ctx))
			),
	}
}

class User_Group implements Namespace {
	related: 
	{
		Roles : (Platform_role)[]

		Needs : (Platform_need)[]

		Members : (User)[]

		Suite : (Platform)[]

		Tenancy : (Org)[]

	}
	permits = 
	{
		//Aliases: N/A
		//Backing Relationship: Manage_User_Group_Members
		Permit_Manage_User_Group_Members: (ctx) => 
			this.related.Tenancy.traverse((t) => 
				t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx)),


		//Aliases: N/A
		//Backing Relationship: User_f8e199f6fd554de6a094a30b3ba4e1ed
		Permit_User_f8e199f6fd554de6a094a30b3ba4e1ed: (ctx) => 
			(
				this.related.Roles.traverse((t) => 
					t.permits.RolePermitted_User_f8e199f6fd554de6a094a30b3ba4e1ed(ctx)) || 
				this.related.Needs.traverse((t) => 
					t.permits.NeedPermitted_User_f8e199f6fd554de6a094a30b3ba4e1ed(ctx))
			),


		//Aliases: N/A
		//Backing Relationship: User_f247aa8909944866bfcf8dcf1c526671
		Permit_User_f247aa8909944866bfcf8dcf1c526671: (ctx) => 
			(
				this.related.Roles.traverse((t) => 
					t.permits.RolePermitted_User_f247aa8909944866bfcf8dcf1c526671(ctx)) || 
				this.related.Needs.traverse((t) => 
					t.permits.NeedPermitted_User_f247aa8909944866bfcf8dcf1c526671(ctx))
			),


		//Aliases: N/A
		//Backing Relationship: User_f247aa8909944866bfcf8dcf1c526641
		Permit_User_f247aa8909944866bfcf8dcf1c526641: (ctx) => 
			(
				this.related.Roles.traverse((t) => 
					t.permits.RolePermitted_User_f247aa8909944866bfcf8dcf1c526641(ctx)) || 
				this.related.Needs.traverse((t) => 
					t.permits.NeedPermitted_User_f247aa8909944866bfcf8dcf1c526641(ctx))
			),
	}
}

class Customer_Group implements Namespace {
	related: 
	{
		Roles : (Platform_role)[]

		Needs : (Platform_need)[]

		Suite : (Platform)[]

		Tenancy : (Org)[]

	}
	permits = 
	{
		//Aliases: N/A
		//Backing Relationship: Manage_Customer_Group_Members
		Permit_Manage_Customer_Group_Members: (ctx) => 
			this.related.Tenancy.traverse((t) => 
				t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx)),


		//Aliases: N/A
		//Backing Relationship: Customer_f8e199f6fd554de6a094a30b3ba4e1ed
		Permit_Customer_f8e199f6fd554de6a094a30b3ba4e1ed: (ctx) => 
			(
				this.related.Roles.traverse((t) => 
					t.permits.RolePermitted_Customer_f8e199f6fd554de6a094a30b3ba4e1ed(ctx)) || 
				this.related.Needs.traverse((t) => 
					t.permits.NeedPermitted_Customer_f8e199f6fd554de6a094a30b3ba4e1ed(ctx))
			),


		//Aliases: N/A
		//Backing Relationship: Customer_f247aa8909944866bfcf8dcf1c526671
		Permit_Customer_f247aa8909944866bfcf8dcf1c526671: (ctx) => 
			(
				this.related.Roles.traverse((t) => 
					t.permits.RolePermitted_Customer_f247aa8909944866bfcf8dcf1c526671(ctx)) || 
				this.related.Needs.traverse((t) => 
					t.permits.NeedPermitted_Customer_f247aa8909944866bfcf8dcf1c526671(ctx))
			),


		//Aliases: N/A
		//Backing Relationship: Customer_f247aa8909944866bfcf8dcf1c534671
		Permit_Customer_f247aa8909944866bfcf8dcf1c534671: (ctx) => 
			(
				this.related.Roles.traverse((t) => 
					t.permits.RolePermitted_Customer_f247aa8909944866bfcf8dcf1c534671(ctx)) || 
				this.related.Needs.traverse((t) => 
					t.permits.NeedPermitted_Customer_f247aa8909944866bfcf8dcf1c534671(ctx))
			),


		//Aliases: N/A
		//Backing Relationship: Customer_f247aa8909944866bfcf8dcf1c534672
		Permit_Customer_f247aa8909944866bfcf8dcf1c534672: (ctx) => 
			(
				this.related.Roles.traverse((t) => 
					t.permits.RolePermitted_Customer_f247aa8909944866bfcf8dcf1c534672(ctx)) || 
				this.related.Needs.traverse((t) => 
					t.permits.NeedPermitted_Customer_f247aa8909944866bfcf8dcf1c534672(ctx))
			),


		//Aliases: N/A
		//Backing Relationship: Customer_f8e199f6fd554de6a094a30b3ba4e112
		Permit_Customer_f8e199f6fd554de6a094a30b3ba4e112: (ctx) => 
			(
				this.related.Roles.traverse((t) => 
					t.permits.RolePermitted_Customer_f8e199f6fd554de6a094a30b3ba4e112(ctx)) || 
				this.related.Needs.traverse((t) => 
					t.permits.NeedPermitted_Customer_f8e199f6fd554de6a094a30b3ba4e112(ctx))
			),


		//Aliases: N/A
		//Backing Relationship: Customer_f247aa8909944866bfcf8dcf1c526654
		Permit_Customer_f247aa8909944866bfcf8dcf1c526654: (ctx) => 
			(
				this.related.Roles.traverse((t) => 
					t.permits.RolePermitted_Customer_f247aa8909944866bfcf8dcf1c526654(ctx)) || 
				this.related.Needs.traverse((t) => 
					t.permits.NeedPermitted_Customer_f247aa8909944866bfcf8dcf1c526654(ctx))
			),
	}
}

class Org_Group implements Namespace {
	related: 
	{
		Roles : (Platform_role)[]

		Needs : (Platform_need)[]

		Suite : (Platform)[]

		Tenancy : (Org)[]

	}
	permits = 
	{
		//Aliases: N/A
		//Backing Relationship: Manage_Org_Group_Members
		Permit_Manage_Org_Group_Members: (ctx) => 
			this.related.Tenancy.traverse((t) => 
				t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx)),


		//Aliases: N/A
		//Backing Relationship: Org_f40c3adf85734c28b2078245542c10e1
		Permit_Org_f40c3adf85734c28b2078245542c10e1: (ctx) => 
			(
				this.related.Roles.traverse((t) => 
					t.permits.RolePermitted_Org_f40c3adf85734c28b2078245542c10e1(ctx)) || 
				this.related.Needs.traverse((t) => 
					t.permits.NeedPermitted_Org_f40c3adf85734c28b2078245542c10e1(ctx))
			),


		//Aliases: N/A
		//Backing Relationship: Org_ef9418454a744d6597066d021e5929f6
		Permit_Org_ef9418454a744d6597066d021e5929f6: (ctx) => 
			(
				this.related.Roles.traverse((t) => 
					t.permits.RolePermitted_Org_ef9418454a744d6597066d021e5929f6(ctx)) || 
				this.related.Needs.traverse((t) => 
					t.permits.NeedPermitted_Org_ef9418454a744d6597066d021e5929f6(ctx))
			),


		//Aliases: N/A
		//Backing Relationship: Org_f8e199f6fd554de6a094a30b3ba5e1ed
		Permit_Org_f8e199f6fd554de6a094a30b3ba5e1ed: (ctx) => 
			(
				this.related.Roles.traverse((t) => 
					t.permits.RolePermitted_Org_f8e199f6fd554de6a094a30b3ba5e1ed(ctx)) || 
				this.related.Needs.traverse((t) => 
					t.permits.NeedPermitted_Org_f8e199f6fd554de6a094a30b3ba5e1ed(ctx))
			),
	}
}

class Project_Group implements Namespace {
	related: 
	{
		Roles : (Platform_role)[]

		Needs : (Platform_need)[]

		Suite : (Platform)[]

		Tenancy : (Org)[]

	}
	permits = 
	{
		//Aliases: N/A
		//Backing Relationship: Manage_Project_Group_Members
		Permit_Manage_Project_Group_Members: (ctx) => 
			this.related.Tenancy.traverse((t) => 
				t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx)),


		//Aliases: N/A
		//Backing Relationship: Project_f8e199f6fd554de6a094a30b3ba4e1ed
		Permit_Project_f8e199f6fd554de6a094a30b3ba4e1ed: (ctx) => 
			(
				this.related.Roles.traverse((t) => 
					t.permits.RolePermitted_Project_f8e199f6fd554de6a094a30b3ba4e1ed(ctx)) || 
				this.related.Needs.traverse((t) => 
					t.permits.NeedPermitted_Project_f8e199f6fd554de6a094a30b3ba4e1ed(ctx))
			),


		//Aliases: N/A
		//Backing Relationship: Project_f247aa8909944866bfcf8dcf1c526671
		Permit_Project_f247aa8909944866bfcf8dcf1c526671: (ctx) => 
			(
				this.related.Roles.traverse((t) => 
					t.permits.RolePermitted_Project_f247aa8909944866bfcf8dcf1c526671(ctx)) || 
				this.related.Needs.traverse((t) => 
					t.permits.NeedPermitted_Project_f247aa8909944866bfcf8dcf1c526671(ctx))
			),


		//Aliases: N/A
		//Backing Relationship: Project_f247aa8909944866bfcf8dcf1c526621
		Permit_Project_f247aa8909944866bfcf8dcf1c526621: (ctx) => 
			(
				this.related.Roles.traverse((t) => 
					t.permits.RolePermitted_Project_f247aa8909944866bfcf8dcf1c526621(ctx)) || 
				this.related.Needs.traverse((t) => 
					t.permits.NeedPermitted_Project_f247aa8909944866bfcf8dcf1c526621(ctx))
			),
	}
}

class ServiceAccount implements Namespace {
	related: 
	{
		Group_Assignments : (ServiceAccount_Group)[]

		Suite : (Platform)[]

		Tenancy : (Org)[]

		//AuthorizeOnResource Permit: Tenancy.ManagePermissions
		//DelegateToSubject Permit: Tenancy.ManagePermissions
		a4a5d681dfe84b5dbff2a8f334018a91 : (User)[]

	}
	permits = 
	{
		//Aliases: View
		//Backing Relationship: a4a5d681dfe84b5dbff2a8f334018a91
		Permit_a4a5d681dfe84b5dbff2a8f334018a91: (ctx) => 
			(
				this.related.a4a5d681dfe84b5dbff2a8f334018a91.includes(ctx.subject) || 
				this.related.Group_Assignments.traverse((t) => 
					t.permits.Permit_ServiceAccount_a4a5d681dfe84b5dbff2a8f334018a91(ctx)) || 
				this.related.Tenancy.traverse((t) => 
					t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx))
			),


		//Aliases: Tenancy.ManagePermissions
		//Backing Relationship: Tenancy_ManagePermissions
		Authorize_Tenancy_ManagePermissions: (ctx) => 
			this.related.Tenancy.traverse((t) => 
				t.permits.Permit_ef9418454a744d6597066d021e5929f6(ctx)),
	}
}

class User implements Namespace {
	related: 
	{
		Group_Assignments : (User_Group)[]

		Suite : (Platform)[]

		Tenancy : (Org)[]

		//AuthorizeOnResource Permit: Tenancy.ManagePermissions
		//DelegateToSubject Permit: Tenancy.ManagePermissions
		f8e199f6fd554de6a094a30b3ba4e1ed : (User)[]

		//AuthorizeOnResource Permit: Tenancy.ManagePermissions
		//DelegateToSubject Permit: Tenancy.ManagePermissions
		f247aa8909944866bfcf8dcf1c526671 : (User)[]

		//AuthorizeOnResource Permit: Tenancy.ManagePermissions
		//DelegateToSubject Permit: Tenancy.ManagePermissions
		f247aa8909944866bfcf8dcf1c526641 : (User)[]

	}
	permits = 
	{
		//Aliases: View
		//Backing Relationship: f8e199f6fd554de6a094a30b3ba4e1ed
		Permit_f8e199f6fd554de6a094a30b3ba4e1ed: (ctx) => 
			(
				this.related.f8e199f6fd554de6a094a30b3ba4e1ed.includes(ctx.subject) || 
				this.related.Group_Assignments.traverse((t) => 
					t.permits.Permit_User_f8e199f6fd554de6a094a30b3ba4e1ed(ctx)) || 
				this.related.Tenancy.traverse((t) => 
					t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx))
			),


		//Aliases: Edit
		//Backing Relationship: f247aa8909944866bfcf8dcf1c526671
		Permit_f247aa8909944866bfcf8dcf1c526671: (ctx) => 
			(
				this.related.f247aa8909944866bfcf8dcf1c526671.includes(ctx.subject) || 
				this.related.Group_Assignments.traverse((t) => 
					t.permits.Permit_User_f247aa8909944866bfcf8dcf1c526671(ctx)) || 
				this.related.Tenancy.traverse((t) => 
					t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx))
			),


		//Aliases: Delete
		//Backing Relationship: f247aa8909944866bfcf8dcf1c526641
		Permit_f247aa8909944866bfcf8dcf1c526641: (ctx) => 
			(
				this.related.f247aa8909944866bfcf8dcf1c526641.includes(ctx.subject) || 
				this.related.Group_Assignments.traverse((t) => 
					t.permits.Permit_User_f247aa8909944866bfcf8dcf1c526641(ctx)) || 
				this.related.Tenancy.traverse((t) => 
					t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx))
			),


		//Aliases: Tenancy.ManagePermissions
		//Backing Relationship: Tenancy_ManagePermissions
		Delegate_Tenancy_ManagePermissions: (ctx) => 
			this.related.Tenancy.traverse((t) => 
				t.permits.Permit_ef9418454a744d6597066d021e5929f6(ctx)),


		//Aliases: Tenancy.ManagePermissions
		//Backing Relationship: Tenancy_ManagePermissions
		Authorize_Tenancy_ManagePermissions: (ctx) => 
			this.related.Tenancy.traverse((t) => 
				t.permits.Permit_ef9418454a744d6597066d021e5929f6(ctx)),


		//Aliases: Tenancy.Admin
		//Backing Relationship: Org_Tenancy_Admin
		Delegate_Org_Tenancy_Admin: (ctx) => 
			this.related.Tenancy.traverse((t) => 
				t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx)),
	}
}

class Customer implements Namespace {
	related: 
	{
		Group_Assignments : (Customer_Group)[]

		Suite : (Platform)[]

		Tenancy : (Org)[]

		//AuthorizeOnResource Permit: Tenancy.ManagePermissions
		//DelegateToSubject Permit: Tenancy.ManagePermissions
		f8e199f6fd554de6a094a30b3ba4e1ed : (User)[]

		//AuthorizeOnResource Permit: Tenancy.ManagePermissions
		//DelegateToSubject Permit: Tenancy.ManagePermissions
		f247aa8909944866bfcf8dcf1c526671 : (User)[]

		//AuthorizeOnResource Permit: Tenancy.ManagePermissions
		//DelegateToSubject Permit: Tenancy.ManagePermissions
		f247aa8909944866bfcf8dcf1c534671 : (User)[]

		//AuthorizeOnResource Permit: Tenancy.ManagePermissions
		//DelegateToSubject Permit: Tenancy.ManagePermissions
		f247aa8909944866bfcf8dcf1c534672 : (ServiceAccount)[]

		//AuthorizeOnResource Permit: Tenancy.ManagePermissions
		//DelegateToSubject Permit: Tenancy.ManagePermissions
		f8e199f6fd554de6a094a30b3ba4e112 : (User)[]

		//AuthorizeOnResource Permit: Tenancy.ManagePermissions
		//DelegateToSubject Permit: Tenancy.ManagePermissions
		f247aa8909944866bfcf8dcf1c526654 : (User)[]

	}
	permits = 
	{
		//Aliases: View
		//Backing Relationship: f8e199f6fd554de6a094a30b3ba4e1ed
		Permit_f8e199f6fd554de6a094a30b3ba4e1ed: (ctx) => 
			(
				this.related.f8e199f6fd554de6a094a30b3ba4e1ed.includes(ctx.subject) || 
				this.related.Group_Assignments.traverse((t) => 
					t.permits.Permit_Customer_f8e199f6fd554de6a094a30b3ba4e1ed(ctx)) || 
				this.related.Tenancy.traverse((t) => 
					t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx))
			),


		//Aliases: Edit
		//Backing Relationship: f247aa8909944866bfcf8dcf1c526671
		Permit_f247aa8909944866bfcf8dcf1c526671: (ctx) => 
			(
				this.related.f247aa8909944866bfcf8dcf1c526671.includes(ctx.subject) || 
				this.related.Group_Assignments.traverse((t) => 
					t.permits.Permit_Customer_f247aa8909944866bfcf8dcf1c526671(ctx)) || 
				this.related.Tenancy.traverse((t) => 
					t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx))
			),


		//Aliases: Delete
		//Backing Relationship: f247aa8909944866bfcf8dcf1c534671
		Permit_f247aa8909944866bfcf8dcf1c534671: (ctx) => 
			(
				this.related.f247aa8909944866bfcf8dcf1c534671.includes(ctx.subject) || 
				this.related.Group_Assignments.traverse((t) => 
					t.permits.Permit_Customer_f247aa8909944866bfcf8dcf1c534671(ctx)) || 
				this.related.Tenancy.traverse((t) => 
					t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx))
			),


		//Aliases: Register
		//Backing Relationship: f247aa8909944866bfcf8dcf1c534672
		Permit_f247aa8909944866bfcf8dcf1c534672: (ctx) => 
			(
				this.related.f247aa8909944866bfcf8dcf1c534672.includes(ctx.subject) || 
				this.related.Group_Assignments.traverse((t) => 
					t.permits.Permit_Customer_f247aa8909944866bfcf8dcf1c534672(ctx)) || 
				this.related.Tenancy.traverse((t) => 
					t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx))
			),


		//Aliases: CreateProject
		//Backing Relationship: f8e199f6fd554de6a094a30b3ba4e112
		Permit_f8e199f6fd554de6a094a30b3ba4e112: (ctx) => 
			(
				this.related.f8e199f6fd554de6a094a30b3ba4e112.includes(ctx.subject) || 
				this.related.Group_Assignments.traverse((t) => 
					t.permits.Permit_Customer_f8e199f6fd554de6a094a30b3ba4e112(ctx)) || 
				this.related.Tenancy.traverse((t) => 
					t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx))
			),


		//Aliases: ListProject
		//Backing Relationship: f247aa8909944866bfcf8dcf1c526654
		Permit_f247aa8909944866bfcf8dcf1c526654: (ctx) => 
			(
				this.related.f247aa8909944866bfcf8dcf1c526654.includes(ctx.subject) || 
				this.related.Group_Assignments.traverse((t) => 
					t.permits.Permit_Customer_f247aa8909944866bfcf8dcf1c526654(ctx)) || 
				this.related.Tenancy.traverse((t) => 
					t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx))
			),


		//Aliases: Tenancy.ManagePermissions
		//Backing Relationship: Tenancy_ManagePermissions
		Authorize_Tenancy_ManagePermissions: (ctx) => 
			this.related.Tenancy.traverse((t) => 
				t.permits.Permit_ef9418454a744d6597066d021e5929f6(ctx)),
	}
}

class Org implements Namespace {
	related: 
	{
		Group_Assignments : (Org_Group)[]

		Suite : (Platform)[]

		f40c3ad123456789b2078245542c10e1 : (Attribute)[]

		//AuthorizeOnResource Permit: Admin
		//DelegateToSubject Permit: Tenancy.Admin
		f40c3adf85734c28b2078245542c10e1 : (User)[]

		//AuthorizeOnResource Permit: ManagePermissions
		//DelegateToSubject Permit: Tenancy.ManagePermissions
		ef9418454a744d6597066d021e5929f6 : (User)[]

		//AuthorizeOnResource Permit: ManagePermissions
		//DelegateToSubject Permit: Tenancy.ManagePermissions
		f8e199f6fd554de6a094a30b3ba5e1ed : (User)[]

	}
	permits = 
	{
		//Aliases: Admin
		//Backing Relationship: f40c3adf85734c28b2078245542c10e1
		Permit_f40c3adf85734c28b2078245542c10e1: (ctx) => 
			(
				this.related.f40c3adf85734c28b2078245542c10e1.includes(ctx.subject) || 
				this.related.Group_Assignments.traverse((t) => 
					t.permits.Permit_Org_f40c3adf85734c28b2078245542c10e1(ctx))
			),


		//Aliases: ManagePermissions
		//Backing Relationship: ef9418454a744d6597066d021e5929f6
		Permit_ef9418454a744d6597066d021e5929f6: (ctx) => 
			(
				this.related.ef9418454a744d6597066d021e5929f6.includes(ctx.subject) || 
				this.related.Group_Assignments.traverse((t) => 
					t.permits.Permit_Org_ef9418454a744d6597066d021e5929f6(ctx)) || 
				this.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx)
			),


		//Aliases: View
		//Backing Relationship: f8e199f6fd554de6a094a30b3ba5e1ed
		Permit_f8e199f6fd554de6a094a30b3ba5e1ed: (ctx) => 
			(
				this.related.f8e199f6fd554de6a094a30b3ba5e1ed.includes(ctx.subject) || 
				this.related.Group_Assignments.traverse((t) => 
					t.permits.Permit_Org_f8e199f6fd554de6a094a30b3ba5e1ed(ctx)) || 
				this.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx)
			),


		//Aliases: N/A
		//Backing Relationship: Create_Platform_role
		Permit_Create_Platform_role: (ctx) => 
			this.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx),


		//Aliases: N/A
		//Backing Relationship: Create_Platform_need
		Permit_Create_Platform_need: (ctx) => 
			this.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx),


		//Aliases: N/A
		//Backing Relationship: Create_ServiceAccount_Group
		Permit_Create_ServiceAccount_Group: (ctx) => 
			this.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx),


		//Aliases: N/A
		//Backing Relationship: Create_User_Group
		Permit_Create_User_Group: (ctx) => 
			this.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx),


		//Aliases: N/A
		//Backing Relationship: Create_Customer_Group
		Permit_Create_Customer_Group: (ctx) => 
			this.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx),


		//Aliases: N/A
		//Backing Relationship: Create_Org_Group
		Permit_Create_Org_Group: (ctx) => 
			this.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx),


		//Aliases: N/A
		//Backing Relationship: Create_Project_Group
		Permit_Create_Project_Group: (ctx) => 
			this.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx),


		//Aliases: Admin
		//Backing Relationship: Admin
		Authorize_Admin: (ctx) => 
			this.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx),


		//Aliases: ManagePermissions
		//Backing Relationship: ManagePermissions
		Authorize_ManagePermissions: (ctx) => 
			this.permits.Permit_ef9418454a744d6597066d021e5929f6(ctx),
	}
}

class Project implements Namespace {
	related: 
	{
		Group_Assignments : (Project_Group)[]

		Suite : (Platform)[]

		Tenancy : (Org)[]

		//AuthorizeOnResource Permit: Tenancy.ManagePermissions
		//DelegateToSubject Permit: Tenancy.ManagePermissions
		f8e199f6fd554de6a094a30b3ba4e1ed : (User)[]

		//AuthorizeOnResource Permit: Tenancy.ManagePermissions
		//DelegateToSubject Permit: Tenancy.ManagePermissions
		f247aa8909944866bfcf8dcf1c526671 : (User)[]

		//AuthorizeOnResource Permit: Tenancy.ManagePermissions
		//DelegateToSubject Permit: Tenancy.ManagePermissions
		f247aa8909944866bfcf8dcf1c526621 : (User)[]

	}
	permits = 
	{
		//Aliases: View
		//Backing Relationship: f8e199f6fd554de6a094a30b3ba4e1ed
		Permit_f8e199f6fd554de6a094a30b3ba4e1ed: (ctx) => 
			(
				this.related.f8e199f6fd554de6a094a30b3ba4e1ed.includes(ctx.subject) || 
				this.related.Group_Assignments.traverse((t) => 
					t.permits.Permit_Project_f8e199f6fd554de6a094a30b3ba4e1ed(ctx)) || 
				this.related.Tenancy.traverse((t) => 
					t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx))
			),


		//Aliases: Edit
		//Backing Relationship: f247aa8909944866bfcf8dcf1c526671
		Permit_f247aa8909944866bfcf8dcf1c526671: (ctx) => 
			(
				this.related.f247aa8909944866bfcf8dcf1c526671.includes(ctx.subject) || 
				this.related.Group_Assignments.traverse((t) => 
					t.permits.Permit_Project_f247aa8909944866bfcf8dcf1c526671(ctx)) || 
				this.related.Tenancy.traverse((t) => 
					t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx))
			),


		//Aliases: Delete
		//Backing Relationship: f247aa8909944866bfcf8dcf1c526621
		Permit_f247aa8909944866bfcf8dcf1c526621: (ctx) => 
			(
				this.related.f247aa8909944866bfcf8dcf1c526621.includes(ctx.subject) || 
				this.related.Group_Assignments.traverse((t) => 
					t.permits.Permit_Project_f247aa8909944866bfcf8dcf1c526621(ctx)) || 
				this.related.Tenancy.traverse((t) => 
					t.permits.Permit_f40c3adf85734c28b2078245542c10e1(ctx))
			),


		//Aliases: Tenancy.ManagePermissions
		//Backing Relationship: Tenancy_ManagePermissions
		Authorize_Tenancy_ManagePermissions: (ctx) => 
			this.related.Tenancy.traverse((t) => 
				t.permits.Permit_ef9418454a744d6597066d021e5929f6(ctx)),
	}
}