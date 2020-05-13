import * as express from "express";
import clientRoutes from './modules/clients/routes';
import uploadCodeRoutes from './modules/uploadCodes/routes';

const app = express();

clientRoutes(app);
uploadCodeRoutes(app);

app.use((err: any, req: any, res: any, next: Function) => {
  console.error(err.stack);
  res.status(500).send({ code: err.code, message: err.message });
})

export default app;
