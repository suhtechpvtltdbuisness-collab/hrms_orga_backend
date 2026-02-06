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
  maritalStatus: varchar("marital_status", { length: 50 }),
  type: userTypeEnum("type").notNull(),
  eContactName: varchar("e_contact_name", { length: 255 }),
  eContactNumber: integer("e_contact_number"),
  eRelation: varchar("e_relation", { length: 100 }),
  email: varchar("email", { length: 255 }).notNull(),
  phone: integer("phone"),
  active: boolean("active").default(true).notNull(),
  address: text("address"),
  aadharNo: integer("aadhar_no"),
  pancardNo: integer("pancard_no"),
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

// Department Table
export const department = pgTable("department", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  head: varchar("head", { length: 255 }),
  location: varchar("location", { length: 255 }),
  description: text("description"),
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
  type: designationTypeEnum("type").notNull(),
  departmentId: integer("department_id").references(() => department.id),
  level: integer("level").notNull(),
  status: boolean("status").default(true).notNull(),
  responsibility: text("responsibility"),
  reportingTo: varchar("reporting_to", { length: 100 }),
  description: text("description"),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document Table
export const document = pgTable("document", {
  id: serial("id").primaryKey(),
  empId: varchar("emp_id", { length: 100 }).notNull(),
  aadhar: text("aadhar"),
  pancard: text("pancard"),
  offerLetter: text("offer_letter"),
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
  user: one(users, {
    fields: [document.empId],
    references: [users.id],
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
