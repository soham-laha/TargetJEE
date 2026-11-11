import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import path from "node:path";

const baseDirectory = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory });

const config = [
  ...compat.extends("next/core-web-vitals"),
  { ignores: ["node_modules/**", ".next/**", "backend/.venv/**", "backend/**/__pycache__/**"] }
];

export default config;
