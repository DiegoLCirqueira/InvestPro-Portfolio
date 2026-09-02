import type { FastifyRequest, FastifyReply } from "fastify";
import type { UserRole } from "@investpro/shared";

export function requireRole(...allowedRoles: UserRole[]) {
  return async function authorize(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const role = request.user?.role as UserRole | undefined;

    if (!role || !allowedRoles.includes(role)) {
      return reply.status(403).send({
        error: "FORBIDDEN",
        message: "Você não tem permissão para acessar este recurso",
      });
    }
  };
}
