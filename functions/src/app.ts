import * as express from "express";
import { clientRoutesConfig } from './clients/routes';

const app = express();

clientRoutesConfig(app);

app.use((err: any, req: any, res: any, next: Function) => {
  console.error(err.stack);
  res.status(500).send({ code: err.code, message: err.message });
})

export default app;
