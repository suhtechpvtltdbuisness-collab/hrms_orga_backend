CREATE TABLE IF NOT EXISTS "sales_invoice" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
  "invoice_number" varchar(100) NOT NULL,
  "customer_name" varchar(255) NOT NULL,
  "client_id" integer REFERENCES "sales_record"("id"),
  "invoice_date" varchar(50) NOT NULL,
  "due_date" varchar(50),
  "sub_total" numeric(14,2) DEFAULT '0' NOT NULL,
  "total_tax" numeric(14,2) DEFAULT '0' NOT NULL,
  "amount" numeric(14,2) DEFAULT '0' NOT NULL,
  "status" varchar(50) DEFAULT 'Pending' NOT NULL,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sales_invoice_item" (
  "id" serial PRIMARY KEY NOT NULL,
  "invoice_id" integer NOT NULL REFERENCES "sales_invoice"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "quantity" numeric(14,2) DEFAULT '0' NOT NULL,
  "rate" numeric(14,2) DEFAULT '0' NOT NULL,
  "tax" numeric(8,2) DEFAULT '0' NOT NULL,
  "amount" numeric(14,2) DEFAULT '0' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "purchase_invoice" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
  "invoice_number" varchar(100) NOT NULL,
  "supplier_name" varchar(255) NOT NULL,
  "bill_date" varchar(50) NOT NULL,
  "due_date" varchar(50),
  "sub_total" numeric(14,2) DEFAULT '0' NOT NULL,
  "total_tax" numeric(14,2) DEFAULT '0' NOT NULL,
  "amount" numeric(14,2) DEFAULT '0' NOT NULL,
  "status" varchar(50) DEFAULT 'Pending' NOT NULL,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "purchase_invoice_item" (
  "id" serial PRIMARY KEY NOT NULL,
  "invoice_id" integer NOT NULL REFERENCES "purchase_invoice"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "amount" numeric(14,2) DEFAULT '0' NOT NULL,
  "tax" numeric(8,2) DEFAULT '0' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "recurring_invoice" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
  "invoice_title" varchar(255) NOT NULL,
  "client" varchar(255) NOT NULL,
  "client_id" integer REFERENCES "sales_record"("id"),
  "invoice_type" varchar(50),
  "bill_date" varchar(50) NOT NULL,
  "revenue_account" varchar(255),
  "tax_rules" varchar(50),
  "sub_total" numeric(14,2) DEFAULT '0' NOT NULL,
  "total_tax" numeric(14,2) DEFAULT '0' NOT NULL,
  "amount" numeric(14,2) DEFAULT '0' NOT NULL,
  "status" varchar(50) DEFAULT 'Active' NOT NULL,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "recurring_invoice_item" (
  "id" serial PRIMARY KEY NOT NULL,
  "invoice_id" integer NOT NULL REFERENCES "recurring_invoice"("id") ON DELETE CASCADE,
  "phase" varchar(255) NOT NULL,
  "amount" numeric(14,2) DEFAULT '0' NOT NULL,
  "schedule_date" varchar(50),
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "invoice_payment" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
  "sales_invoice_id" integer REFERENCES "sales_invoice"("id"),
  "invoice_number" varchar(100),
  "customer" varchar(255) NOT NULL,
  "payment_date" varchar(50) NOT NULL,
  "amount" numeric(14,2) DEFAULT '0' NOT NULL,
  "method" varchar(100) NOT NULL,
  "status" varchar(50) DEFAULT 'Pending' NOT NULL,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sales_invoice_org_idx" ON "sales_invoice" ("organization_id");
CREATE INDEX IF NOT EXISTS "sales_invoice_number_idx" ON "sales_invoice" ("organization_id", "invoice_number");
CREATE INDEX IF NOT EXISTS "purchase_invoice_org_idx" ON "purchase_invoice" ("organization_id");
CREATE INDEX IF NOT EXISTS "recurring_invoice_org_idx" ON "recurring_invoice" ("organization_id");
CREATE INDEX IF NOT EXISTS "invoice_payment_org_idx" ON "invoice_payment" ("organization_id");
