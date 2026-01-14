import orgOrderRepo from "../repository/orgOrder.repo.js";
import { orgOrder } from "../db/schema.js";
import { or } from "drizzle-orm";
class OrgOrderServices {
  async createOrgOrder(data: typeof orgOrder.$inferInsert) {
    const result = await orgOrderRepo.createOrgOrder(data);
    return result;
  }
  async getOrgOrderById(id: number) {
    const result = await orgOrderRepo.getOrgOrderById(id);
    return result;
  }
  async updateOrgOrder(id: number, data: typeof orgOrder.$inferInsert) {
    const result = await orgOrderRepo.updateOrgOrder(id, data);
    return result;
  }
}
export default new OrgOrderServices();
