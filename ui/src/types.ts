declare global {
  interface Window {
    editor: {
      setValue: (value: string) => void;
    };
  }
}

export type CommandData = {
  id: number;
  command: string;
  context: string;
  namespace: string;
};

export type CommandResult = {
  stdout: string;
  stderr: string;
  exit_code: number;
};

export type HistoryItem = {
  commandData: CommandData;
  output: string;
};

export type SelectData = Array<{ value: string; label: string }>;
