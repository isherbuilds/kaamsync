export type IndustryConfig = {
	name: string;
	slug: string;
	industry: string;
	roles: string[];
	teams: {
		name: string;
		code: string;
		icon: string;
		description: string;
		taskTypes: string[];
		requestTypes: string[];
	}[];
};

export const industries: IndustryConfig[] = [
	{
		name: "Bright Future School",
		slug: "bright-future-school",
		industry: "Education",
		roles: [
			"Principal",
			"Vice Principal",
			"Accountant",
			"Store Manager",
			"Coordinator",
			"Transport Manager",
			"Driver",
			"Teacher",
			"Librarian",
			"IT Admin",
			"Student",
		],
		teams: [
			{
				name: "Admissions",
				code: "ADM",
				icon: "🎓",
				description: "Manage student admissions and enrollments",
				taskTypes: [
					"Process Application",
					"Verify Documents",
					"Schedule Interview",
					"Send Offer Letter",
				],
				requestTypes: [
					"New Application",
					"Scholarship Request",
					"Transfer Request",
				],
			},
			{
				name: "Academics",
				code: "ACD",
				icon: "📚",
				description: "Curriculum planning and execution",
				taskTypes: [
					"Prepare Lesson Plan",
					"Grade Assignments",
					"Update Syllabus",
					"Prepare Exam Paper",
				],
				requestTypes: [
					"Leave Request",
					"Supply Request",
					"Field Trip Proposal",
				],
			},
			{
				name: "Transport",
				code: "TRN",
				icon: "🚌",
				description: "School bus fleet management",
				taskTypes: [
					"Route Planning",
					"Vehicle Maintenance",
					"Driver Roster",
					"Safety Check",
				],
				requestTypes: ["Bus Change Request", "Complaint", "Route Change"],
			},
			{
				name: "Facilities",
				code: "FAC",
				icon: "🏫",
				description: "School infrastructure management",
				taskTypes: [
					"Repair Furniture",
					"Clean Classrooms",
					"Garden Maintenance",
					"Security Check",
				],
				requestTypes: [
					"Maintenance Request",
					"Event Setup",
					"Cleaning Request",
				],
			},
		],
	},
	{
		name: "City Care Hospital",
		slug: "city-care-hospital",
		industry: "Healthcare",
		roles: [
			"Medical Director",
			"Chief Surgeon",
			"Doctor",
			"Head Nurse",
			"Nurse",
			"Pharmacist",
			"Lab Technician",
			"Receptionist",
			"Admin",
		],
		teams: [
			{
				name: "OPD",
				code: "OPD",
				icon: "🏥",
				description: "Outpatient Department",
				taskTypes: [
					"Patient Check-in",
					"Doctor Consultation",
					"Prescription Update",
					"Follow-up Call",
				],
				requestTypes: [
					"Appointment Request",
					"Medical Report Request",
					"Referral",
				],
			},
			{
				name: "Emergency",
				code: "EMR",
				icon: "🚑",
				description: "Emergency Room operations",
				taskTypes: [
					"Triage Patient",
					"Stabilize Vitals",
					"Emergency Surgery",
					"Discharge Summary",
				],
				requestTypes: ["Ambulance Request", "Blood Request", "Bed Allocation"],
			},
			{
				name: "Pharmacy",
				code: "PHR",
				icon: "💊",
				description: "Medicine inventory and dispensing",
				taskTypes: [
					"Stock Check",
					"Dispense Medicine",
					"Order Supplies",
					"Inventory Audit",
				],
				requestTypes: ["Medicine Refill", "New Drug Stock", "Return Request"],
			},
		],
	},
	{
		name: "SkyHigh Constructions",
		slug: "skyhigh-constructions",
		industry: "Construction",
		roles: [
			"Project Manager",
			"Site Engineer",
			"Architect",
			"Safety Officer",
			"Foreman",
			"Supervisor",
			"Worker",
			"Surveyor",
		],
		teams: [
			{
				name: "Site Alpha",
				code: "STA",
				icon: "🏗️",
				description: "Primary construction site",
				taskTypes: [
					"Pour Concrete",
					"Install Wiring",
					"Paint Walls",
					"Inspect Foundation",
				],
				requestTypes: [
					"Material Request",
					"Safety Incident",
					"Manpower Request",
				],
			},
			{
				name: "Procurement",
				code: "PRO",
				icon: "🧱",
				description: "Material sourcing and logistics",
				taskTypes: [
					"Vendor Comparison",
					"Order Materials",
					"Track Delivery",
					"Quality Check",
				],
				requestTypes: [
					"Purchase Order",
					"Invoice Approval",
					"Supplier Onboarding",
				],
			},
			{
				name: "Design",
				code: "DSN",
				icon: "📐",
				description: "Architectural plans and blueprints",
				taskTypes: [
					"Draft Blueprint",
					"Review Structural Integrity",
					"Update CAD Model",
					"Client Presentation",
				],
				requestTypes: [
					"Design Change",
					"Meeting Request",
					"Permit Application",
				],
			},
		],
	},
	{
		name: "Global Tech Services",
		slug: "global-tech-services",
		industry: "Service",
		roles: [
			"CEO",
			"CTO",
			"Product Manager",
			"Tech Lead",
			"Developer",
			"Designer",
			"QA Engineer",
			"HR Manager",
		],
		teams: [
			{
				name: "Client Projects",
				code: "CLP",
				icon: "💻",
				description: "External client deliverables",
				taskTypes: [
					"Develop Feature",
					"Fix Bug",
					"Design Interface",
					"Deploy Code",
				],
				requestTypes: [
					"Change Request",
					"Budget Increase",
					"Timeline Extension",
				],
			},
			{
				name: "HR & Admin",
				code: "HRA",
				icon: "👥",
				description: "Internal operations",
				taskTypes: [
					"Process Payroll",
					"Onboard Employee",
					"Organize Event",
					"Update Policy",
				],
				requestTypes: [
					"Leave Application",
					"Expense Reimbursement",
					"Travel Request",
				],
			},
		],
	},
	{
		name: "Prime Fintech Solutions",
		slug: "prime-fintech",
		industry: "Fintech",
		roles: [
			"Portfolio Manager",
			"Risk Analyst",
			"Trader",
			"Compliance Officer",
			"Investment Banker",
			"Auditor",
			"Accountant",
		],
		teams: [
			{
				name: "Trading Floor",
				code: "TRD",
				icon: "📈",
				description: "Live trading operations",
				taskTypes: [
					"Execute Trade",
					"Monitor Market",
					"Analyze Trends",
					"Client Call",
				],
				requestTypes: ["Trade Approval", "Limit Increase", "System Access"],
			},
			{
				name: "Compliance",
				code: "CMP",
				icon: "⚖️",
				description: "Regulatory adherence",
				taskTypes: [
					"KYC Check",
					"Audit Log Review",
					"Policy Training",
					"Report Filing",
				],
				requestTypes: [
					"Policy Exception",
					"Investigation Request",
					"Audit Request",
				],
			},
		],
	},
	{
		name: "Fresh Mart Retail",
		slug: "fresh-mart-retail",
		industry: "Retail",
		roles: [
			"Regional Manager",
			"Store Manager",
			"Assistant Manager",
			"Cashier",
			"Stock Clerk",
			"Security Guard",
			"Customer Service",
		],
		teams: [
			{
				name: "Store Operations",
				code: "OPS",
				icon: "🛒",
				description: "Daily store activities",
				taskTypes: [
					"Open Store",
					"Cash Count",
					"Shelf Stocking",
					"Clean Floor",
				],
				requestTypes: ["Shift Change", "Refund Approval", "Equipment Repair"],
			},
			{
				name: "Inventory",
				code: "INV",
				icon: "📦",
				description: "Stock management",
				taskTypes: [
					"Receive Shipment",
					"Stock Take",
					"Mark Down Items",
					"Return Damaged Goods",
				],
				requestTypes: ["Stock Order", "Transfer Request", "Write-off Request"],
			},
		],
	},
	{
		name: "Swift Logistics",
		slug: "swift-logistics",
		industry: "Logistics",
		roles: [
			"Operations Manager",
			"Fleet Manager",
			"Dispatcher",
			"Driver",
			"Warehouse Supervisor",
			"Loader",
			"Mechanic",
		],
		teams: [
			{
				name: "Fleet Management",
				code: "FLT",
				icon: "🚛",
				description: "Vehicle tracking and maintenance",
				taskTypes: [
					"Assign Route",
					"Vehicle Service",
					"Fuel Log",
					"Driver Check",
				],
				requestTypes: [
					"Maintenance Request",
					"Accident Report",
					"Fuel Card Request",
				],
			},
			{
				name: "Warehouse",
				code: "WHS",
				icon: "🏭",
				description: "Storage and distribution",
				taskTypes: [
					"Unload Truck",
					"Sort Packages",
					"Pack Order",
					"Load Truck",
				],
				requestTypes: ["Equipment Request", "Overtime Request", "Safety Issue"],
			},
		],
	},
	{
		name: "Grand Hotel & Resort",
		slug: "grand-hotel",
		industry: "Hospitality",
		roles: [
			"General Manager",
			"Front Desk Manager",
			"Concierge",
			"Housekeeping Head",
			"Chef",
			"Waiter",
			"Valet",
		],
		teams: [
			{
				name: "Guest Services",
				code: "GST",
				icon: "🛎️",
				description: "Front of house operations",
				taskTypes: [
					"Check-in Guest",
					"Handle Luggage",
					"Room Service",
					"Book Tour",
				],
				requestTypes: [
					"Room Change",
					"Special Amenity",
					"Complaint Resolution",
				],
			},
			{
				name: "Housekeeping",
				code: "HSK",
				icon: "🧹",
				description: "Room cleaning and maintenance",
				taskTypes: [
					"Clean Room",
					"Laundry Service",
					"Restock Minibar",
					"Deep Clean",
				],
				requestTypes: ["Maintenance Request", "Supply Refill", "Lost & Found"],
			},
			{
				name: "Kitchen",
				code: "KIT",
				icon: "👨‍🍳",
				description: "Food preparation",
				taskTypes: [
					"Prep Ingredients",
					"Cook Service",
					"Clean Station",
					"Inventory Count",
				],
				requestTypes: ["Ingredient Order", "Menu Change", "Equipment Fix"],
			},
		],
	},
];
