import {orgPayment} from "../db/schema.js"
import {db} from "../db/connection.js"
import {eq, and} from "drizzle-orm"

class OrgPaymentRepo {
    async createOrgPayment(data: typeof orgPayment.$inferInsert) {
        const result = await db.insert(orgPayment).values(data).returning()
        return result
    }

    async getOrgPaymentById(id: number) {
        const result = await db.select().from(orgPayment).where(eq(orgPayment.id, id))
        return result
    }

    async updateOrgPayment(id: number, data: typeof orgPayment.$inferInsert) {
        const result = await db.update(orgPayment).set(data).where(eq(orgPayment.id, id)).returning()
        return result
    }
}
export default new OrgPaymentRepo()