import { and, eq } from "drizzle-orm";
import { db } from "../src/db/connection.js";
import { users } from "../src/db/schema.js";
import { FinancialReportsServices } from "../src/services/financialReportsServices.js";

async function main() {
  const [admin] = await db
    .select()
    .from(users)
    .where(and(eq(users.roleId, 1), eq(users.isDeleted, false)))
    .limit(1);
  if (!admin) {
    console.log("No admin user found");
    process.exit(1);
  }

  const svc = new FinancialReportsServices();
  const pnl = await svc.getProfitAndLoss(admin, {});
  const bs = await svc.getBalanceSheet(admin, {});
  const cf = await svc.getCashFlow(admin, {});
  const bva = await svc.getBudgetVsActual(admin, {});

  console.log(
    JSON.stringify(
      {
        admin: { id: admin.id, org: admin.organizationId, name: admin.name },
        pnl: {
          revenue: pnl.data.grandTotal.revenue,
          direct: pnl.data.grandTotal.direct,
          indirect: pnl.data.grandTotal.indirect,
          net: pnl.data.grandTotal.net,
          rows: pnl.data.tableData.length,
          source: pnl.data.meta.source,
        },
        bs: {
          assets: bs.data.totalAssets,
          equity: bs.data.totalEquity,
          source: bs.data.meta.source,
        },
        cf: {
          opening: cf.data.openingBalance,
          closing: cf.data.closingBalance,
          net: cf.data.netChange,
        },
        bva: {
          budget: bva.data.grandTotal.budget,
          actual: bva.data.grandTotal.actual,
          rows: bva.data.varianceByDeptRows.length,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
