import { registerOTel, OTLPHttpProtoTraceExporter } from '@vercel/otel';
import { PrismaInstrumentation } from '@prisma/instrumentation';

export function register() {
  const token = process.env.AXIOM_TOKEN;
  const dataset = process.env.AXIOM_DATASET ?? 'lotion-traces';
  const runtime = process.env.NEXT_RUNTIME ?? 'unknown';

  if (!token) {
    console.warn(
      '[otel] AXIOM_TOKEN is not set — traces will not be exported to Axiom.',
      'Set AXIOM_TOKEN in Vercel Environment Variables.',
    );
  }

  // The 'auto' span processor in @vercel/otel wraps the OTLP exporter in a
  // drain guard (dc()) that silently suppresses exports when Vercel's own
  // telemetry is active. Passing traceExporter explicitly bypasses this guard.
  const axiomExporter = new OTLPHttpProtoTraceExporter({
    url: 'https://api.axiom.co/v1/traces',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Axiom-Dataset': dataset,
    },
  });

  registerOTel({
    serviceName: 'lotion-react',
    traceExporter: axiomExporter,
    // PrismaInstrumentation is Node-only; skip in Edge runtime
    instrumentations:
      runtime === 'nodejs' ? [new PrismaInstrumentation()] : [],
  });

  console.log(
    `[otel] Instrumentation registered (runtime=${runtime}, dataset=${dataset}, token=${token ? 'set' : 'MISSING'})`,
  );
}
