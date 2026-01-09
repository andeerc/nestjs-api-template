import '@fastify/session';

declare module '@fastify/session' {
  interface FastifySessionObject {
    userId?: number;
    email?: string;
    authenticated?: boolean;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    session: import('@fastify/session').FastifySessionObject & {
      destroy: (callback: (err?: any) => void) => void;
    };
  }
}
