import { Request, Response } from 'express';
import User from '../models/User';
import dotenv from 'dotenv';
dotenv.config();

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if(email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASS) {
    return res.status(200).json({ message: 'Login exitoso' });
  }
  return res.status(401).json({ message: 'Credenciales inválidas' });
};
