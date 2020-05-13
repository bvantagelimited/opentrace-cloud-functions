import { Application } from "express";
import { postCreateClient, getAllClient } from "./controller";
import { isAdminAuthenticated } from "../auth/authenticated";

export default function clientRoutes(app: Application) {

  app.post('/clients', isAdminAuthenticated, postCreateClient);
  app.get('/clients', isAdminAuthenticated, getAllClient);

}