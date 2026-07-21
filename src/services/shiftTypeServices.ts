import ShiftTypeRepository from "../repository/shiftType.repo.js";
import { Employee, shiftType, users } from "../db/schema.js";
import { db } from "../db/connection.js";
import { eq } from "drizzle-orm";

function computeTotalHours(startTime: string, endTime: string): string {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  let startMinutes = toMinutes(startTime);
  let endMinutes = toMinutes(endTime);

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  const hours = (endMinutes - startMinutes) / 60;
  return `${hours.toFixed(1)} hrs`;
}

function formatShiftType(record: typeof shiftType.$inferSelect) {
  return {
    ...record,
    totalHours: computeTotalHours(record.startTime, record.endTime),
  };
}

class ShiftTypeServices {
  private shiftTypeRepo: ShiftTypeRepository;

  constructor() {
    this.shiftTypeRepo = new ShiftTypeRepository();
  }

  private async getAdminId(currentUser: typeof users.$inferSelect) {
    if (currentUser.isAdmin || currentUser.roleId === 0 || currentUser.roleId === 1) return currentUser.id;
    const [employee] = await db
      .select({ adminId: Employee.adminId })
      .from(Employee)
      .where(eq(Employee.userId, currentUser.id))
      .limit(1);
    if (!employee) throw new Error("Employee record not found");
    return employee.adminId;
  }

  async createShiftType(
    data: typeof shiftType.$inferInsert,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can create shift types");
    }

    if (!data.name || !data.startTime || !data.endTime) {
      throw new Error("Name, startTime, and endTime are required");
    }

    const existing = await this.shiftTypeRepo.getShiftTypeByName(data.name, currentUser.id);
    if (existing) {
      throw new Error("Shift type with this name already exists");
    }

    const result = await this.shiftTypeRepo.createShiftType({
      ...data,
      createdBy: currentUser.id,
      isDeleted: false,
    });

    return {
      message: "Shift type created successfully",
      success: true,
      data: formatShiftType(result),
    };
  }

  async getAllShiftTypes(currentUser: typeof users.$inferSelect) {
    const result = await this.shiftTypeRepo.getAllShiftTypes(await this.getAdminId(currentUser));
    return {
      message: "Shift types fetched successfully",
      success: true,
      data: result.map(formatShiftType),
    };
  }

  async getShiftTypeById(id: number, currentUser: typeof users.$inferSelect) {
    const result = await this.shiftTypeRepo.getShiftTypeById(id, await this.getAdminId(currentUser));
    if (!result) {
      throw new Error("Shift type not found");
    }

    return {
      message: "Shift type fetched successfully",
      success: true,
      data: formatShiftType(result),
    };
  }

  async updateShiftType(
    id: number,
    data: Partial<typeof shiftType.$inferInsert>,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update shift types");
    }

    const existing = await this.shiftTypeRepo.getShiftTypeById(id, currentUser.id);
    if (!existing) {
      throw new Error("Shift type not found");
    }

    if (data.name && data.name !== existing.name) {
      const duplicate = await this.shiftTypeRepo.getShiftTypeByName(data.name, currentUser.id);
      if (duplicate) {
        throw new Error("Shift type with this name already exists");
      }
    }

    const result = await this.shiftTypeRepo.updateShiftType(id, currentUser.id, data);
    return {
      message: "Shift type updated successfully",
      success: true,
      data: formatShiftType(result),
    };
  }

  async deleteShiftType(id: number, currentUser: typeof users.$inferSelect) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can delete shift types");
    }

    const existing = await this.shiftTypeRepo.getShiftTypeById(id, currentUser.id);
    if (!existing) {
      throw new Error("Shift type not found");
    }

    const result = await this.shiftTypeRepo.deleteShiftType(id, currentUser.id);
    if (!result) {
      throw new Error("Shift type not found");
    }

    return {
      message: "Shift type deleted successfully",
      success: true,
      data: formatShiftType(result),
    };
  }
}

export default ShiftTypeServices;
