import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const axiomToken = process.env.NEXT_PUBLIC_AXIOM_TOKEN || process.env.AXIOM_API_KEY;
    const axiomDataset = process.env.NEXT_PUBLIC_AXIOM_DATASET || 'lotion-traces';

    const exporterUrl = axiomToken 
      ? 'https://api.axiom.co/v1/traces' 
      : 'http://localhost:4318/v1/traces';

    const headers = axiomToken 
      ? {
          Authorization: `Bearer ${axiomToken}`,
          'X-Axiom-Dataset': axiomDataset,
        }
      : undefined;

    const exporter = new OTLPTraceExporter({
      url: exporterUrl,
      headers: headers,
    });

    const sdk = new NodeSDK({
      serviceName: 'lotion-react',
      traceExporter: exporter,
      instrumentations: [new PrismaInstrumentation()],
    });

    sdk.start();
  }
}
