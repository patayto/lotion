import { registerOTel, OTLPHttpProtoTraceExporter } from '@vercel/otel';
import { PrismaInstrumentation } from '@prisma/instrumentation';

export function register() {
  // The 'auto' span processor in @vercel/otel wraps the OTLP exporter in a
  // drain guard (dc()) that silently suppresses exports when Vercel's own
  // telemetry is active. Passing traceExporter explicitly bypasses this guard.
  const axiomExporter = new OTLPHttpProtoTraceExporter({
    url: 'https://api.axiom.co/v1/traces',
    headers: {
      Authorization: `Bearer ${process.env.AXIOM_TOKEN}`,
      'X-Axiom-Dataset': process.env.AXIOM_DATASET ?? 'lotion-traces',
    },
  });

  registerOTel({
    serviceName: 'lotion-react',
    traceExporter: axiomExporter,
    instrumentations: [new PrismaInstrumentation()],
  });
}
