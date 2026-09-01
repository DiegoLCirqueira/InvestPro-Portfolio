import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { prisma } from "../../config/database.js";

interface JwtPayload {
  sub: string;
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({
      error: "UNAUTHORIZED",
      message: "Token de autenticação ausente",
    });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, fullName: true, role: true },
    });

    if (!user) {
      return reply.status(401).send({
        error: "UNAUTHORIZED",
        message: "Usuário não encontrado",
      });
    }

    request.user = user;
  } catch {
    return reply.status(401).send({
      error: "UNAUTHORIZED",
      message: "Token inválido ou expirado",
    });
  }
}
