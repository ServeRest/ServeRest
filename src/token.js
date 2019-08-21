import jwt from "jsonwebtoken";

import { tokenTimeout as expiresIn } from "../conf.js";

const SECRET_KEY = "123456789";

function createToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY, (err, decode) => (decode !== undefined ? decode : err));
}

export { createToken, verifyToken };
