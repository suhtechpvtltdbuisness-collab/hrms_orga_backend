import { Request, Response } from "express";
import { EmployeeService } from "../services/employeeServices.js";

const employeeService = new EmployeeService();

export const createEmployee = async (req: Request, res: Response) => {
  try {
    const employee = await employeeService.createEmployee(
      req.body,
      res.locals.user,
    );
    res.status(201).json(employee);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getAllEmployees = async (req: Request, res: Response) => {
  try {
    const employees = await employeeService.getAllEmployees(res.locals.user);
    res.json(employees);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const employee = await employeeService.getEmployeeById(
      parseInt(req.params.id as string),
      res.locals.user,
    );
    res.json(employee);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const getEmployeeByUserId = async (req: Request, res: Response) => {
  try {
    const employee = await employeeService.getEmployeeByUserId(
      parseInt(req.params.userId as string),
      res.locals.user,
    );
    res.json(employee);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const employee = await employeeService.updateEmployee(
      parseInt(req.params.id as string),
      req.body,
      res.locals.user,
    );
    res.json(employee);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    await employeeService.deleteEmployee(
      parseInt(req.params.id as string),
      res.locals.user,
    );
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
