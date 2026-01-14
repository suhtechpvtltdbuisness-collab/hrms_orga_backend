import orgPaymentRepo from "../repository/orgPayment.repo.js";
import { orgPayment } from "../db/schema.js";
class OrgPaymentServices {
  async createOrgPayment(data: typeof orgPayment.$inferInsert) {
    const result = await orgPaymentRepo.createOrgPayment(data);
    return result;
  }
  async getOrgPaymentById(id: number) {
    const result = await orgPaymentRepo.getOrgPaymentById(id);
    return result;
  }
  async updateOrgPayment(id: number, data: typeof orgPayment.$inferInsert) {
    const result = await orgPaymentRepo.updateOrgPayment(id, data);
    return result;
  }
}
export default new OrgPaymentServices();
