import { CommandData, CommandResult } from "./types";

export const SERVER = "http://127.0.0.1:6868";

async function sleep2s() {
  return new Promise((resolve) => setTimeout(resolve, 2000));
}

export async function get_contexts(): Promise<string[] | Error> {
  try {
    const response = await fetch(`${SERVER}/contexts`);
    const contexts = await response.json();
    return contexts;
  } catch (err) {
    return Error("Failed to fetch contexts , " + err);
  }
}

export async function get_namespaces(
  context: string
): Promise<string[] | Error> {
  try {
    const response = await fetch(`${SERVER}/namespaces?context=${context}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const namespaces = await response.json();
    return namespaces;
  } catch (err) {
    return Error("Failed to fetch namespaces , " + err);
  }
}

export async function run_command(
  data: CommandData
): Promise<CommandResult | Error> {
  try {
    const response = await fetch(`${SERVER}/run-cmd`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const result = await response.json();
    return result;
  } catch (err) {
    return Error("Failed to run command , " + err);
  }
}

export function getKubectlCommand(data: CommandData) {
  return `kubectl ${data.command} --context=${data.context} --namespace=${data.namespace}`;
}
