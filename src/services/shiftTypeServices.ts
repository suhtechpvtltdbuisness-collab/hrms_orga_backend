import ShiftTypeRepository from "../repository/shiftType.repo.js";
import { shiftType, users } from "../db/schema.js";

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

    const existing = await this.shiftTypeRepo.getShiftTypeByName(data.name);
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

  async getAllShiftTypes() {
    const result = await this.shiftTypeRepo.getAllShiftTypes();
    return {
      message: "Shift types fetched successfully",
      success: true,
      data: result.map(formatShiftType),
    };
  }

  async getShiftTypeById(id: number) {
    const result = await this.shiftTypeRepo.getShiftTypeById(id);
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

    const existing = await this.shiftTypeRepo.getShiftTypeById(id);
    if (!existing) {
      throw new Error("Shift type not found");
    }

    if (data.name && data.name !== existing.name) {
      const duplicate = await this.shiftTypeRepo.getShiftTypeByName(data.name);
      if (duplicate) {
        throw new Error("Shift type with this name already exists");
      }
    }

    const result = await this.shiftTypeRepo.updateShiftType(id, data);
    return {
      message: "Shift type updated successfully",
      success: true,
      data: formatShiftType(result),
    };
  }
}

export default ShiftTypeServices;
