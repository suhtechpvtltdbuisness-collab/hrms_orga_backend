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
  "basic",
  "premium",
  "enterprise",
]);
export const employeeTypeEnum = pgEnum("employee_type", [
  "full_time",
  "part_time",
  "intern",
]);

// Organization Table
export const Plain = pgTable("plain", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  price: doublePrecision("price").notNull(),
  type: organizationTypeEnum("type").notNull(),
  active: boolean("active").default(true).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  module: moduleEnum("module").notNull(),
  expired: varchar("expired", { length: 50 }),
  purchaseDate: varchar("purchase_date", { length: 50 }),
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
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Employment Table
export const employment = pgTable("employment", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => Employee.id),
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
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  head: varchar("head", { length: 255 }),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  parentId: integer("parent_id"),
  adminId: integer("admin_id")
    .notNull()
    .references(() => users.id),
  status: boolean("status").default(true).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
    .references(() => Employee.id),
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
    .references(() => Employee.id),
  joiningDate: varchar("joining_date", { length: 50 }),
  departmentId: integer("department_id").references(() => department.id),
  managerId: integer("manager_id").references(() => Employee.id),
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
    .references(() => Employee.id),
  date: varchar("date", { length: 50 }),
  rating: integer("rating"),
  status: varchar("status", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Attendance Table
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  empId: integer("emp_id")
    .notNull()
    .references(() => Employee.id),
  markedBy: integer("marked_by")
    .notNull()
    .references(() => users.id),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Leave Table
export const leave = pgTable("leave", {
  id: serial("id").primaryKey(),
  type: leaveTypeEnum("type").notNull(),
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
    .references(() => Employee.id),
  createdBy: integer("created_by"),
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
    .references(() => Employee.id),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Training and Development Table
export const trainingAndDevelopment = pgTable("training_and_development", {
  id: serial("id").primaryKey(),
  empId: integer("emp_id")
    .notNull()
    .references(() => Employee.id),
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
    references: [Employee.id],
  }),
}));

export const offboardingRelations = relations(offboarding, ({ one }) => ({
  employee: one(Employee, {
    fields: [offboarding.empId],
    references: [Employee.id],
  }),
  department: one(department, {
    fields: [offboarding.departmentId],
    references: [department.id],
  }),
  manager: one(Employee, {
    fields: [offboarding.managerId],
    references: [Employee.id],
  }),
}));

export const performanceRelations = relations(performance, ({ one }) => ({
  employee: one(Employee, {
    fields: [performance.empId],
    references: [Employee.id],
  }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  user: one(Employee, {
    fields: [attendance.empId],
    references: [Employee.id],
  }),
}));

export const leaveRelations = relations(leave, ({ one }) => ({
  user: one(Employee, {
    fields: [leave.empId],
    references: [Employee.id],
  }),
}));

export const payrollRelations = relations(payroll, ({ one }) => ({
  department: one(department, {
    fields: [payroll.departmentId],
    references: [department.id],
  }),
  user: one(Employee, {
    fields: [payroll.empId],
    references: [Employee.id],
  }),
}));

export const trainingAndDevelopmentRelations = relations(
  trainingAndDevelopment,
  ({ one }) => ({
    user: one(Employee, {
      fields: [trainingAndDevelopment.empId],
      references: [Employee.id],
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
    references: [Employee.id],
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
