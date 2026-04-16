import type { NextConfig } from "next";
import { withAxiom } from "next-axiom";

const nextConfig: NextConfig = {
  // instrumentation.ts is supported by default or via this root property
};

export default withAxiom(nextConfig);
