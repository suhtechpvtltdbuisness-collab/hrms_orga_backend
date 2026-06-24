import {
  pgTable,
  serial,
  varchar,
  timestamp,
  text,
  integer,
  boolean,
  pgEnum,
  decimal,
  doublePrecision,
  PgUpdateBase,
  date,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { number } from "zod";

// Enums
export const userTypeEnum = pgEnum("user_type", [
  "admin",
  "employee",
  "manager",
]);
export const leaveTypeEnum = pgEnum("leave_type", [
  "sick",
  "casual",
  "earned",
  "maternity",
  "paternity",
]);
export const paymentModeEnum = pgEnum("payment_mode", [
  "cash",
  "bank_transfer",
  "cheque",
  "online",
]);
export const organizationTypeEnum = pgEnum("organization_type", [
  "startup",
  "enterprise",
  "sme",
]);
export const moduleEnum = pgEnum("module", [
  "hrms",
  "payroll",
  "attendance",
  "leave",
]);
export const designationTypeEnum = pgEnum("designation_type", [
  "permanent",
  "temporary",
  "contract",
]);
export const planTypeEnum = pgEnum("plan_type", [
  "free_trial",
  "starter_pack",
  "basic",
  "premium",
  "enterprise",
]);
export const employeeTypeEnum = pgEnum("employee_type", [
  "full_time",
  "part_time",
  "intern",
]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "half_day",
  "on_leave",
]);
export const shiftRequestStatusEnum = pgEnum("shift_request_status", [
  "submitted",
  "approved",
  "rejected",
]);
export const salaryComponentTypeEnum = pgEnum("salary_component_type", [
  "earning",
  "deduction",
]);
export const salaryComponentAmountTypeEnum = pgEnum(
  "salary_component_amount_type",
  ["fixed", "formula"],
);
export const payrollEntryStatusEnum = pgEnum("payroll_entry_status", [
  "calculated",
  "finalized",
  "cancelled",
]);
export const salarySlipStatusEnum = pgEnum("salary_slip_status", [
  "draft",
  "finalized",
  "signed_off",
]);
export const payrollAccountingStatusEnum = pgEnum(
  "payroll_accounting_status",
  ["pending", "stubbed", "posted", "failed"],
);

// Organization Table
export const Plain = pgTable("plain", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  price: doublePrecision("price").notNull(),
  type: organizationTypeEnum("type").notNull(),
  planType: planTypeEnum("plan_type").default("free_trial").notNull(),
  maxEmployees: integer("max_employees").default(4).notNull(),
  active: boolean("active").default(true).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  module: moduleEnum("module").notNull(),
  expired: varchar("expired", { length: 50 }),
  purchaseDate: varchar("purchase_date", { length: 50 }),
  razorpaySubscriptionId: varchar("razorpay_subscription_id", { length: 255 }),
  razorpayPlanId: varchar("razorpay_plan_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Organizations Table
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  organizationType: varchar("organization_type", { length: 50 }).notNull(),
  industry: varchar("industry", { length: 50 }).notNull(),
  companySize: varchar("company_size", { length: 50 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  timezone: varchar("timezone", { length: 100 }).notNull(),
  organizationEmail: varchar("organization_email", { length: 255 }).notNull(),
  organizationPhone: varchar("organization_phone", { length: 50 }).notNull(),
  website: varchar("website", { length: 255 }),
  currency: varchar("currency", { length: 50 }).notNull(),
  workingDays: text("working_days").array().notNull(),
  officeStartTime: varchar("office_start_time", { length: 50 }).notNull(),
  officeEndTime: varchar("office_end_time", { length: 50 }).notNull(),
  createdBy: integer("created_by").references((): any => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  gender: varchar("gender", { length: 20 }),
  dob: varchar("dob", { length: 50 }),
  bloodGroup: varchar("blood_group", { length: 10 }),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  roleId: integer("role_id").default(2).notNull(),
  maritalStatus: boolean("marital_status").notNull(),
  type: userTypeEnum("type").notNull(),
  eContactName: varchar("e_contact_name", { length: 255 }),
  eContactNumber: varchar("e_contact_number", { length: 50 }),
  eRelation: varchar("e_relation", { length: 100 }),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  active: boolean("active").default(true).notNull(),
  address: text("address"),
  aadharNo: varchar("aadhar_no", { length: 50 }),
  pancardNo: varchar("pancard_no", { length: 50 }),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  profilePic: text("profile_pic"),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  organizationId: integer("organization_id").references((): any => organizations.id),
  isEmailVerified: boolean("is_email_verified").default(false).notNull(),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const Employee = pgTable("employee", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => users.id),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Employment Table
export const employment = pgTable("employment", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => Employee.userId),
  departmentId: integer("department_id")
    .notNull()
    .references(() => department.id),
  jobTitle: varchar("job_title", { length: 255 }),
  subDepartment: varchar("sub_department", { length: 255 }),
  reportingManager: integer("reporting_manager").references(() => users.id),
  dateOfJoining: varchar("date_of_joining", { length: 50 }),
  workLocation: varchar("work_location", { length: 255 }),
  branch: varchar("branch", { length: 255 }),
  prohibitionPeriod: varchar("prohibition_period", { length: 100 }),
  confirmDate: varchar("confirm_date", { length: 50 }),
  empStatus: boolean("emp_status").default(true),
  prohibitionEnd: varchar("prohibition_end", { length: 50 }),
  contractType: varchar("contract_type", { length: 100 }),
  contractStart: varchar("contract_start", { length: 50 }),
  contractEnd: varchar("contract_end", { length: 50 }),
  contractPay: varchar("contract_pay", { length: 100 }),
  contractDuration: varchar("contract_duration", { length: 100 }),
  renewalStatus: boolean("renewal_status").default(false),
  workMode: varchar("work_mode", { length: 100 }),
  currentShift: integer("current_shift"),
  shiftTiming: varchar("shift_timing", { length: 255 }),
  assignedTemplate: varchar("assigned_template", { length: 255 }),
  weeklyPattern: varchar("weekly_pattern", { length: 255 }),
  overtime: varchar("overtime", { length: 255 }),
  assignedShift: varchar("assigned_shift", { length: 255 }),
  shiftStartTime: varchar("shift_start_time", { length: 50 }),
  shiftEndTime: varchar("shift_end_time", { length: 50 }),
  weeklyOff: varchar("weekly_off", { length: 255 }),
  breakTiming: varchar("break_timing", { length: 255 }),
  weeklySchedule: varchar("weekly_schedule", { length: 255 }),
  workingHours: integer("working_hours"),
  totalWeeklyHours: integer("total_weekly_hours"),
  customScheduled: boolean("custom_scheduled").default(false),
  flexibleHours: integer("flexible_hours"),
  monthlyRosterCalendar: varchar("monthly_roster_calendar", { length: 255 }),
  rotationShiftCycle: varchar("rotation_shift_cycle", { length: 255 }),
  upcomingShiftCycle: varchar("upcoming_shift_cycle", { length: 255 }),
  attendanceLinked: boolean("attendance_linked").default(false),
  swapRequest: varchar("swap_request", { length: 255 }),
  primaryRoles: varchar("primary_roles", { length: 255 }),
  additionalRoles: varchar("additional_roles", { length: 255 }),
  moduleAccess: varchar("module_access", { length: 255 }),
  roleEffectiveFrom: varchar("role_effective_from", { length: 50 }),
  level: integer("level"),
  accessScope: varchar("access_scope", { length: 255 }),
  approvalRight: boolean("approval_right").default(false),
  specialPermission: varchar("special_permission", { length: 255 }),
  dataVisibility: varchar("data_visibility", { length: 255 }),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Department Table
export const department: any = pgTable("department", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references((): any => organizations.id),
  departmentName: varchar("department_name", { length: 100 }).notNull(),
  departmentCode: varchar("department_code", { length: 50 }).notNull(),
  description: text("description"),
  managerId: integer("manager_id").references(() => Employee.userId),
  status: varchar("status", { length: 20 }).default("Active").notNull(),
  employeeCount: integer("employee_count").default(0).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique().on(table.organizationId, table.departmentName),
  unique().on(table.organizationId, table.departmentCode),
]);

// Designation Table
export const designation = pgTable("designation", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: designationTypeEnum("type").notNull(),
  departmentId: integer("department_id").references(() => department.id),
  level: integer("level").notNull(),
  status: boolean("status").default(true).notNull(),
  responsibility: text("responsibility"),
  reportingTo: integer("reporting_to").references(() => users.id),
  description: text("description"),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document Table
export const document = pgTable("document", {
  id: serial("id").primaryKey(),
  empId: integer("emp_id")
    .notNull()
    .references(() => Employee.userId),
  type: varchar("type", { length: 100 }),
  url: text("url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Offboarding Table
export const offboarding = pgTable("offboarding", {
  id: serial("id").primaryKey(),
  empId: integer("emp_id")
    .notNull()
    .references(() => Employee.userId),
  joiningDate: varchar("joining_date", { length: 50 }),
  departmentId: integer("department_id").references(() => department.id),
  managerId: integer("manager_id").references(() => Employee.userId),
  phone: varchar("phone", { length: 50 }),
  location: varchar("location", { length: 255 }),
  exitDate: varchar("exit_date", { length: 50 }),
  type: varchar("type", { length: 100 }),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Performance Table
export const performance = pgTable("performance", {
  id: serial("id").primaryKey(),
  empId: integer("emp_id")
    .notNull()
    .references(() => Employee.userId),
  date: varchar("date", { length: 50 }),
  rating: integer("rating"),
  status: varchar("status", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Attendance Table
export const attendance = pgTable(
  "attendance",
  {
    id: serial("id").primaryKey(),
    series: varchar("series", { length: 50 }).notNull(),
    empId: integer("emp_id")
      .notNull()
      .references(() => Employee.userId),
    attendanceDate: date("attendance_date").notNull(),
    status: attendanceStatusEnum("status").notNull(),
    leaveType: leaveTypeEnum("leave_type"),
    shift: varchar("shift", { length: 255 }),
    period: varchar("period", { length: 100 }),
    lateEntry: boolean("late_entry").default(false).notNull(),
    earlyExit: boolean("early_exit").default(false).notNull(),
    markedBy: integer("marked_by")
      .notNull()
      .references(() => users.id),
    checkIn: timestamp("check_in"),
    checkOut: timestamp("check_out"),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.empId, table.attendanceDate)],
);

// Shift Type Table
export const shiftType = pgTable("shift_type", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  startTime: varchar("start_time", { length: 20 }).notNull(),
  endTime: varchar("end_time", { length: 20 }).notNull(),
  holidayList: varchar("holiday_list", { length: 50 }),
  enableAutoAttendance: boolean("enable_auto_attendance").default(false).notNull(),
  determineCheckinCheckout: varchar("determine_checkin_checkout", { length: 255 }),
  workingHoursCalculation: varchar("working_hours_calculation", { length: 255 }),
  beginCheckinBefore: integer("begin_checkin_before"),
  allowCheckoutAfter: integer("allow_checkout_after"),
  workingHoursThresholdHalfDay: varchar("working_hours_threshold_half_day", {
    length: 20,
  }),
  workingHoursThresholdAbsent: varchar("working_hours_threshold_absent", {
    length: 20,
  }),
  processAttendanceAfter: varchar("process_attendance_after", { length: 50 }),
  lastSyncOfCheckin: varchar("last_sync_of_checkin", { length: 50 }),
  enableEntryGracePeriod: boolean("enable_entry_grace_period")
    .default(false)
    .notNull(),
  lateEntryGracePeriod: integer("late_entry_grace_period"),
  enableExitGracePeriod: boolean("enable_exit_grace_period")
    .default(false)
    .notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Shift Request Table
export const shiftRequest = pgTable("shift_request", {
  id: serial("id").primaryKey(),
  empId: integer("emp_id")
    .notNull()
    .references(() => Employee.userId),
  shiftTypeId: integer("shift_type_id")
    .notNull()
    .references(() => shiftType.id),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  comment: text("comment"),
  status: shiftRequestStatusEnum("status").default("submitted").notNull(),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Leave Table
export const leave = pgTable("leave", {
  id: serial("id").primaryKey(),
  total: integer("total").notNull(),
  sickLeave: integer("sick_leave").default(0).notNull(),
  casualLeave: integer("casual_leave").default(0).notNull(),
  paidLeave: integer("paid_leave").default(0).notNull(),
  sickLeaveTaken: integer("sick_leave_taken").default(0).notNull(),
  casualLeaveTaken: integer("casual_leave_taken").default(0).notNull(),
  paidLeaveTaken: integer("paid_leave_taken").default(0).notNull(),
  taken: integer("taken").default(0).notNull(),
  empId: integer("emp_id")
    .notNull()
    .references(() => Employee.userId),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leaveRequest = pgTable("leave_request", {
  id: serial("id").primaryKey(),
  empId: integer("emp_id")
    .notNull()
    .references(() => Employee.userId),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  days: integer("days").notNull(),
  reason: text("reason"),
  status: shiftRequestStatusEnum("status").default("submitted").notNull(),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payroll Table
export const payroll = pgTable("payroll", {
  id: serial("id").primaryKey(),
  structure: text("structure"),
  ctc: decimal("ctc", { precision: 15, scale: 2 }).notNull(),
  monthlyGross: decimal("monthly_gross", { precision: 15, scale: 2 }).notNull(),
  monthlyPay: decimal("monthly_pay", { precision: 15, scale: 2 }).notNull(),
  paymentMode: paymentModeEnum("payment_mode").notNull(),
  departmentId: integer("department_id").references(() => department.id),
  baseSalary: decimal("base_salary", { precision: 15, scale: 2 }),
  hra: decimal("hra", { precision: 15, scale: 2 }),
  conveyancePay: decimal("conveyance_pay", { precision: 15, scale: 2 }),
  overtimePay: decimal("overtime_pay", { precision: 15, scale: 2 }),
  specialPay: decimal("special_pay", { precision: 15, scale: 2 }),
  empId: integer("emp_id")
    .notNull()
    .references(() => Employee.userId),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Salary Component Table
export const salaryComponent = pgTable(
  "salary_component",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 100 }).notNull(),
    type: salaryComponentTypeEnum("type").notNull(),
    amountType: salaryComponentAmountTypeEnum("amount_type")
      .default("fixed")
      .notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }),
    formula: text("formula"),
    taxable: boolean("taxable").default(true).notNull(),
    dependsOnPaymentDays: boolean("depends_on_payment_days")
      .default(true)
      .notNull(),
    active: boolean("active").default(true).notNull(),
    description: text("description"),
    defaultAccount: varchar("default_account", { length: 255 }),
    costCenter: varchar("cost_center", { length: 255 }),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.code)],
);

// Salary Structure Table
export const salaryStructure = pgTable("salary_structure", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  active: boolean("active").default(true).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const salaryStructureComponent = pgTable("salary_structure_component", {
  id: serial("id").primaryKey(),
  salaryStructureId: integer("salary_structure_id")
    .notNull()
    .references(() => salaryStructure.id),
  salaryComponentId: integer("salary_component_id")
    .notNull()
    .references(() => salaryComponent.id),
  amount: decimal("amount", { precision: 15, scale: 2 }),
  formula: text("formula"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const salaryStructureAssignment = pgTable(
  "salary_structure_assignment",
  {
    id: serial("id").primaryKey(),
    empId: integer("emp_id")
      .notNull()
      .references(() => Employee.userId),
    salaryStructureId: integer("salary_structure_id")
      .notNull()
      .references(() => salaryStructure.id),
    fromDate: date("from_date").notNull(),
    toDate: date("to_date"),
    baseSalary: decimal("base_salary", { precision: 15, scale: 2 }),
    isActive: boolean("is_active").default(true).notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
);

export const additionalSalary = pgTable("additional_salary", {
  id: serial("id").primaryKey(),
  empId: integer("emp_id")
    .notNull()
    .references(() => Employee.userId),
  salaryComponentId: integer("salary_component_id").references(
    () => salaryComponent.id,
  ),
  componentName: varchar("component_name", { length: 255 }).notNull(),
  type: salaryComponentTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  payrollPeriodStart: date("payroll_period_start").notNull(),
  payrollPeriodEnd: date("payroll_period_end").notNull(),
  taxable: boolean("taxable").default(true).notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 50 }).default("draft").notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payrollEntry = pgTable(
  "payroll_entry",
  {
    id: serial("id").primaryKey(),
    empId: integer("emp_id")
      .notNull()
      .references(() => Employee.userId),
    salaryStructureId: integer("salary_structure_id").references(
      () => salaryStructure.id,
    ),
    salaryStructureAssignmentId: integer(
      "salary_structure_assignment_id",
    ).references(() => salaryStructureAssignment.id),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    totalWorkingDays: integer("total_working_days").notNull(),
    paidDays: integer("paid_days").notNull(),
    grossPay: decimal("gross_pay", { precision: 15, scale: 2 }).notNull(),
    taxableEarnings: decimal("taxable_earnings", {
      precision: 15,
      scale: 2,
    }).notNull(),
    totalDeductions: decimal("total_deductions", {
      precision: 15,
      scale: 2,
    }).notNull(),
    netPay: decimal("net_pay", { precision: 15, scale: 2 }).notNull(),
    earnings: jsonb("earnings").$type<Record<string, unknown>[]>().notNull(),
    deductions: jsonb("deductions").$type<Record<string, unknown>[]>().notNull(),
    additionalSalaries: jsonb("additional_salaries")
      .$type<Record<string, unknown>[]>()
      .notNull(),
    statutoryDeductions: jsonb("statutory_deductions")
      .$type<Record<string, unknown>>()
      .notNull(),
    status: payrollEntryStatusEnum("status").default("calculated").notNull(),
    accountingStatus: payrollAccountingStatusEnum("accounting_status")
      .default("pending")
      .notNull(),
    accountingMessage: text("accounting_message"),
    finalizedAt: timestamp("finalized_at"),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.empId, table.periodStart, table.periodEnd)],
);

export const salarySlip = pgTable(
  "salary_slip",
  {
    id: serial("id").primaryKey(),
    payrollEntryId: integer("payroll_entry_id")
      .notNull()
      .references(() => payrollEntry.id),
    slipNumber: varchar("slip_number", { length: 100 }).notNull(),
    employeeSnapshot: jsonb("employee_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    earnings: jsonb("earnings").$type<Record<string, unknown>[]>().notNull(),
    deductions: jsonb("deductions").$type<Record<string, unknown>[]>().notNull(),
    grossPay: decimal("gross_pay", { precision: 15, scale: 2 }).notNull(),
    totalDeductions: decimal("total_deductions", {
      precision: 15,
      scale: 2,
    }).notNull(),
    netPay: decimal("net_pay", { precision: 15, scale: 2 }).notNull(),
    status: salarySlipStatusEnum("status").default("draft").notNull(),
    isLocked: boolean("is_locked").default(false).notNull(),
    finalizedAt: timestamp("finalized_at"),
    signedOffAt: timestamp("signed_off_at"),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.payrollEntryId), unique().on(table.slipNumber)],
);

export const payrollAccounting = pgTable("payroll_accounting", {
  id: serial("id").primaryKey(),
  payrollEntryId: integer("payroll_entry_id")
    .notNull()
    .references(() => payrollEntry.id),
  status: payrollAccountingStatusEnum("status").default("stubbed").notNull(),
  journalEntryId: integer("journal_entry_id"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  message: text("message"),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Training and Development Table
export const trainingAndDevelopment = pgTable("training_and_development", {
  id: serial("id").primaryKey(),
  empId: integer("emp_id")
    .notNull()
    .references(() => Employee.userId),
  type: varchar("type", { length: 100 }),
  videos: text("videos"),
  docs: text("docs"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Log Activity Table
export const logActivity = pgTable("log_activity", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 100 }),
  description: text("description"),
  empId: integer("emp_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Organization Payment Table
export const PlainPayment = pgTable("plain_payment", {
  id: serial("id").primaryKey(),
  plainId: integer("plain_id")
    .notNull()
    .references(() => Plain.id),

  status: varchar("status", { length: 50 }),
  transactionId: varchar("transaction_id", { length: 255 }),
  paymentMode: paymentModeEnum("payment_mode").notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  paymentId: varchar("payment_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => users.id),
  employeeType: employeeTypeEnum("employee_type").notNull(),
  description: text("description"),
  requiredSkills: text("required_skills"),
  location: varchar("location", { length: 255 }),
  salaryRange: varchar("salary_range", { length: 100 }),
  departmentId: integer("department_id").references(() => department.id),
  designationId: integer("designation_id").references(() => designation.id),
  isActive: boolean("is_active").default(true).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdBy: integer("created_by"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const jobApplication = pgTable("job_application", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id),
  applicantName: varchar("applicant_name", { length: 255 }).notNull(),
  applicantEmail: varchar("applicant_email", { length: 255 }).notNull(),
  resume: text("resume"),
  coverLetter: text("cover_letter"),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const interview = pgTable("interview", {
  id: serial("id").primaryKey(),
  jobApplicationId: integer("job_application_id")
    .notNull()
    .references(() => jobApplication.id),
  interviewerId: integer("interviewer_id")
    .notNull()
    .references(() => users.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  instruction: text("instruction"),
  meetingLink: varchar("meeting_link", { length: 255 }),
  status: varchar("status", { length: 50 }).default("scheduled").notNull(),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const departmentRelations = relations(department, ({ many }) => ({
  designations: many(designation),
  payrolls: many(payroll),
}));

export const designationRelations = relations(designation, ({ one }) => ({
  department: one(department, {
    fields: [designation.departmentId],
    references: [department.id],
  }),
}));

export const documentRelations = relations(document, ({ one }) => ({
  employee: one(Employee, {
    fields: [document.empId],
    references: [Employee.userId],
  }),
}));

export const offboardingRelations = relations(offboarding, ({ one }) => ({
  employee: one(Employee, {
    fields: [offboarding.empId],
    references: [Employee.userId],
  }),
  department: one(department, {
    fields: [offboarding.departmentId],
    references: [department.id],
  }),
  manager: one(Employee, {
    fields: [offboarding.managerId],
    references: [Employee.userId],
  }),
}));

export const performanceRelations = relations(performance, ({ one }) => ({
  employee: one(Employee, {
    fields: [performance.empId],
    references: [Employee.userId],
  }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  user: one(Employee, {
    fields: [attendance.empId],
    references: [Employee.userId],
  }),
}));

export const leaveRelations = relations(leave, ({ one }) => ({
  user: one(Employee, {
    fields: [leave.empId],
    references: [Employee.userId],
  }),
}));

export const payrollRelations = relations(payroll, ({ one }) => ({
  department: one(department, {
    fields: [payroll.departmentId],
    references: [department.id],
  }),
  user: one(Employee, {
    fields: [payroll.empId],
    references: [Employee.userId],
  }),
}));

export const salaryStructureRelations = relations(
  salaryStructure,
  ({ many }) => ({
    components: many(salaryStructureComponent),
    assignments: many(salaryStructureAssignment),
  }),
);

export const salaryStructureComponentRelations = relations(
  salaryStructureComponent,
  ({ one }) => ({
    structure: one(salaryStructure, {
      fields: [salaryStructureComponent.salaryStructureId],
      references: [salaryStructure.id],
    }),
    component: one(salaryComponent, {
      fields: [salaryStructureComponent.salaryComponentId],
      references: [salaryComponent.id],
    }),
  }),
);

export const salaryStructureAssignmentRelations = relations(
  salaryStructureAssignment,
  ({ one }) => ({
    employee: one(Employee, {
      fields: [salaryStructureAssignment.empId],
      references: [Employee.userId],
    }),
    structure: one(salaryStructure, {
      fields: [salaryStructureAssignment.salaryStructureId],
      references: [salaryStructure.id],
    }),
  }),
);

export const additionalSalaryRelations = relations(
  additionalSalary,
  ({ one }) => ({
    employee: one(Employee, {
      fields: [additionalSalary.empId],
      references: [Employee.userId],
    }),
    component: one(salaryComponent, {
      fields: [additionalSalary.salaryComponentId],
      references: [salaryComponent.id],
    }),
  }),
);

export const payrollEntryRelations = relations(payrollEntry, ({ one, many }) => ({
  employee: one(Employee, {
    fields: [payrollEntry.empId],
    references: [Employee.userId],
  }),
  structure: one(salaryStructure, {
    fields: [payrollEntry.salaryStructureId],
    references: [salaryStructure.id],
  }),
  assignment: one(salaryStructureAssignment, {
    fields: [payrollEntry.salaryStructureAssignmentId],
    references: [salaryStructureAssignment.id],
  }),
  salarySlips: many(salarySlip),
  accountingEntries: many(payrollAccounting),
}));

export const salarySlipRelations = relations(salarySlip, ({ one }) => ({
  payrollEntry: one(payrollEntry, {
    fields: [salarySlip.payrollEntryId],
    references: [payrollEntry.id],
  }),
}));

export const payrollAccountingRelations = relations(
  payrollAccounting,
  ({ one }) => ({
    payrollEntry: one(payrollEntry, {
      fields: [payrollAccounting.payrollEntryId],
      references: [payrollEntry.id],
    }),
  }),
);

export const trainingAndDevelopmentRelations = relations(
  trainingAndDevelopment,
  ({ one }) => ({
    user: one(Employee, {
      fields: [trainingAndDevelopment.empId],
      references: [Employee.userId],
    }),
  }),
);

export const logActivityRelations = relations(logActivity, ({ one }) => ({
  user: one(users, {
    fields: [logActivity.empId],
    references: [users.id],
  }),
}));

export const employmentRelations = relations(employment, ({ one }) => ({
  employee: one(Employee, {
    fields: [employment.employeeId],
    references: [Employee.userId],
  }),
  department: one(department, {
    fields: [employment.departmentId],
    references: [department.id],
  }),
  reportingManagerUser: one(users, {
    fields: [employment.reportingManager],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ one }) => ({
  creator: one(users, {
    fields: [organizations.createdBy],
    references: [users.id],
  }),
}));
