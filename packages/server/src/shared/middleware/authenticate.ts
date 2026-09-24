import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { prisma } from "../../config/database.js";

interface JwtPayload {
  sub: string;
}

function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({
      error: "UNAUTHORIZED",
      message: "Token de autenticação ausente",
    });
  }

  const payload = verifyAccessToken(authHeader.slice(7));
  if (!payload) {
    return reply.status(401).send({
      error: "UNAUTHORIZED",
      message: "Token inválido ou expirado",
    });
  }

  // Falha do banco não é sessão inválida: 401 faria o web tentar refresh e
  // deslogar o usuário por uma oscilação. 503 = "tente de novo", sessão intacta.
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, fullName: true, role: true },
    });
  } catch (err) {
    request.log.error({ err }, "authenticate: falha ao consultar usuário no banco");
    return reply.status(503).send({
      error: "AUTH_UNAVAILABLE",
      message: "Autenticação indisponível no momento, tente novamente",
    });
  }

  if (!user) {
    return reply.status(401).send({
      error: "UNAUTHORIZED",
      message: "Usuário não encontrado",
    });
  }

  request.user = user;
}
