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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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

// Organization Table
export const organization = pgTable("organization", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
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
  empId: varchar("emp_id", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  gender: varchar("gender", { length: 20 }),
  dob: varchar("dob", { length: 50 }),
  bloodGroup: varchar("blood_group", { length: 10 }),
  password: text("password").notNull(),
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
  organizationId: integer("organization_id").references(() => organization.id),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdBy: integer("created_by"),
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
  parentId: varchar("parent_id", { length: 50 }),
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
  empId: varchar("emp_id", { length: 100 }).notNull(),
  markedBy: integer("marked_by"),
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
  empId: varchar("emp_id", { length: 100 }).notNull(),
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
  empId: varchar("emp_id", { length: 100 }).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Training and Development Table
export const trainingAndDevelopment = pgTable("training_and_development", {
  id: serial("id").primaryKey(),
  empId: varchar("emp_id", { length: 100 }).notNull(),
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
  empId: varchar("emp_id", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Organization Order Table
export const orgOrder = pgTable("org_order", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organization.id),
  plan: varchar("plan", { length: 100 }),
  paymentMethod: varchar("payment_method", { length: 100 }),
  paymentMode: paymentModeEnum("payment_mode").notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  offer: varchar("offer", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Organization Payment Table
export const orgPayment = pgTable("org_payment", {
  id: serial("id").primaryKey(),
  orgOrderId: integer("org_order_id"),
  status: varchar("status", { length: 50 }),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  paymentId: varchar("payment_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const organizationRelations = relations(organization, ({ many }) => ({
  users: many(users),
  orgOrders: many(orgOrder),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organization, {
    fields: [users.organizationId],
    references: [organization.id],
  }),
  documents: many(document),
  attendance: many(attendance),
  leaves: many(leave),
  payroll: many(payroll),
  trainingAndDevelopment: many(trainingAndDevelopment),
  logActivities: many(logActivity),
}));

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
    references: [users.empId],
  }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  user: one(users, {
    fields: [attendance.empId],
    references: [users.empId],
  }),
}));

export const leaveRelations = relations(leave, ({ one }) => ({
  user: one(users, {
    fields: [leave.empId],
    references: [users.empId],
  }),
}));

export const payrollRelations = relations(payroll, ({ one }) => ({
  department: one(department, {
    fields: [payroll.departmentId],
    references: [department.id],
  }),
  user: one(users, {
    fields: [payroll.empId],
    references: [users.empId],
  }),
}));

export const trainingAndDevelopmentRelations = relations(
  trainingAndDevelopment,
  ({ one }) => ({
    user: one(users, {
      fields: [trainingAndDevelopment.empId],
      references: [users.empId],
    }),
  })
);

export const logActivityRelations = relations(logActivity, ({ one }) => ({
  user: one(users, {
    fields: [logActivity.empId],
    references: [users.empId],
  }),
}));

export const orgOrderRelations = relations(orgOrder, ({ one, many }) => ({
  organization: one(organization, {
    fields: [orgOrder.organizationId],
    references: [organization.id],
  }),
  orgPayments: many(orgPayment),
}));

export const orgPaymentRelations = relations(orgPayment, ({ one }) => ({
  orgOrder: one(orgOrder, {
    fields: [orgPayment.orgOrderId],
    references: [orgOrder.id],
  }),
}));
