import { AttendanceRepository } from "../repository/attendance.repo.js";
import { attendance, users } from "../db/schema.js";

export class AttendanceService {
  private attendanceRepo: AttendanceRepository;

  constructor() {
    this.attendanceRepo = new AttendanceRepository();
  }

  async createAttendance(
    data: typeof attendance.$inferInsert,
    currentUser: any,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can create attendance records");
    }

    // Note: empId now expects userId (from users table)
    // Validate required fields
    if (!data.empId || !data.markedBy) {
      throw new Error("User ID (empId) and markedBy are required");
    }

    const attendanceData = {
      ...data,
      isDeleted: false,
    };

    return await this.attendanceRepo.createAttendance(attendanceData);
  }

  async getAllAttendances(currentUser: any) {
    return await this.attendanceRepo.getAllAttendances();
  }

  async getAttendanceById(id: number, currentUser: any) {
    const attendanceRecord = await this.attendanceRepo.getAttendanceById(id);

    if (attendanceRecord.length === 0) {
      throw new Error("Attendance record not found");
    }

    return attendanceRecord;
  }

  async getAttendancesByEmployeeId(empId: number, currentUser: any) {
    return await this.attendanceRepo.getAttendancesByEmployeeId(empId);
  }

  async updateAttendance(
    id: number,
    data: typeof attendance.$inferInsert,
    currentUser: any,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update attendance records");
    }

    const existingRecord = await this.attendanceRepo.getAttendanceById(id);
    if (existingRecord.length === 0) {
      throw new Error("Attendance record not found");
    }

    return await this.attendanceRepo.updateAttendance(id, data);
  }

  async updateAttendanceByUserId(
    userId: number,
    data: typeof attendance.$inferInsert,
    currentUser: any,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update attendance records");
    }

    return await this.attendanceRepo.updateAttendanceByUserId(userId, data);
  }

  async deleteAttendance(id: number, currentUser: any) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can delete attendance records");
    }

    const existingRecord = await this.attendanceRepo.getAttendanceById(id);
    if (existingRecord.length === 0) {
      throw new Error("Attendance record not found");
    }

    return await this.attendanceRepo.deleteAttendance(id);
  }

  async deleteAttendanceByUserId(userId: number, currentUser: any) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can delete attendance records");
    }

    return await this.attendanceRepo.deleteAttendanceByUserId(userId);
  }
}
